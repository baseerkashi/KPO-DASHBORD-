import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { 
  Zap, Shield, AlertTriangle, XOctagon, 
  ArrowUpRight, Check, Sparkles, TrendingUp, DollarSign, Calendar,
  Save, CheckCircle2, Loader2
} from "lucide-react";
import { saveSelectedLevers } from "../api.js";

function formatMoney(n) {
  if (n === null || n === undefined) return "0";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

export default function ImpactPainMatrix({ turnaround, onEditInputs, analysisId }) {
  if (!turnaround || !turnaround.vitalSigns) {
    return (
      <div className="glass-panel p-8 text-center border-slate-200 dark:border-slate-800">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Turnaround Inputs Configured</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
          Complete the diagnostic interview to calculate deterministic turnaround levers.
        </p>
        <button
          onClick={onEditInputs}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
        >
          Launch Diagnostic Interview
        </button>
      </div>
    );
  }

  const { vitalSigns, levers = [], presets = {}, interviewContext = {} } = turnaround;
  const targetAnalysisId = analysisId || turnaround.analysisId || interviewContext.analysisId;

  // Selected levers state (default to saved plan if available, else Balanced Recovery preset)
  const savedLevers = interviewContext.selectedLeverIds;
  const [selectedLevers, setSelectedLevers] = useState(() => {
    if (Array.isArray(savedLevers) && savedLevers.length > 0) {
      return new Set(savedLevers);
    }
    return new Set(presets.balanced_recovery || presets.quick_wins || []);
  });

  const [activePreset, setActivePreset] = useState(() => {
    if (Array.isArray(savedLevers) && savedLevers.length > 0) {
      for (const [key, ids] of Object.entries(presets)) {
        if (ids.length === savedLevers.length && ids.every((id) => savedLevers.includes(id))) {
          return key;
        }
      }
      return "custom";
    }
    return "balanced_recovery";
  });

  // Track save status for UI feedback
  const [saveStatus, setSaveStatus] = useState("idle"); // "idle" | "saving" | "saved" | "error"
  const isFirstRender = useRef(true);

  // Persistence handler
  const persistPlan = useCallback(async (leverSet) => {
    if (!targetAnalysisId) return;
    try {
      setSaveStatus("saving");
      await saveSelectedLevers(targetAnalysisId, Array.from(leverSet));
      setSaveStatus("saved");
      setTimeout(() => {
        setSaveStatus((current) => (current === "saved" ? "idle" : current));
      }, 2500);
    } catch (err) {
      console.error("Failed to save turnaround plan:", err);
      setSaveStatus("error");
    }
  }, [targetAnalysisId]);

  // Debounced auto-save on lever/preset changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      persistPlan(selectedLevers);
    }, 600);
    return () => clearTimeout(timer);
  }, [selectedLevers, persistPlan]);

  // Apply a preset
  const handleApplyPreset = (presetName) => {
    setActivePreset(presetName);
    const leverIds = presets[presetName] || [];
    setSelectedLevers(new Set(leverIds));
  };

  // Toggle individual lever with mutual exclusion on exclusiveGroup
  const toggleLever = (id) => {
    setActivePreset("custom");
    setSelectedLevers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        const targetLever = levers.find((l) => l.id === id);
        if (targetLever?.exclusiveGroup) {
          // Deselect any other active lever in the same exclusiveGroup
          for (const otherId of next) {
            const otherLever = levers.find((l) => l.id === otherId);
            if (otherLever && otherLever.exclusiveGroup === targetLever.exclusiveGroup) {
              next.delete(otherId);
            }
          }
        }
        next.add(id);
      }
      return next;
    });
  };

  // Live simulation of active levers
  const simulation = useMemo(() => {
    const active = levers.filter((l) => selectedLevers.has(l.id));

    const totalCashAdded = active
      .filter((l) => l.impactType === "one_time_cash" || l.impactType === "cash_deferral")
      .reduce((sum, l) => sum + l.cashImpact, 0);

    const totalBurnReduced = active
      .filter((l) => l.impactType === "monthly_burn_reduction")
      .reduce((sum, l) => sum + l.monthlyBurnDelta, 0);

    const rawCash = parseFloat(vitalSigns.liquidCashNow);
    const baselineCash = isNaN(rawCash) ? 0 : Math.max(0, rawCash);
    const rawBurn = parseFloat(vitalSigns.netMonthlyBurn);
    const baselineBurn = isNaN(rawBurn) ? 0 : Math.max(0, rawBurn);
    const isBaselinePositive = Boolean(vitalSigns.isCashFlowPositive || baselineBurn <= 0);

    const recoveryCash = baselineCash + totalCashAdded;
    const recoveryBurn = Math.max(0, baselineBurn - totalBurnReduced);

    let recoveryDays = null;
    let recoveryDate = null;

    if (!isBaselinePositive && recoveryBurn > 0) {
      const daily = recoveryBurn / 30;
      if (daily > 0) {
        recoveryDays = Math.max(0, Math.round(recoveryCash / daily));
        const d = new Date();
        d.setDate(d.getDate() + recoveryDays);
        recoveryDate = d.toISOString().split("T")[0];
      }
    }

    const baselineDays = (vitalSigns.daysToZeroCash !== null && !isNaN(vitalSigns.daysToZeroCash) && isFinite(vitalSigns.daysToZeroCash))
      ? Math.max(0, vitalSigns.daysToZeroCash)
      : (baselineBurn > 0 ? (baselineCash > 0 ? Math.round(baselineCash / (baselineBurn / 30)) : 0) : null);

    let daysGained = 0;
    if (!isBaselinePositive) {
      if (recoveryBurn === 0 && baselineBurn > 0) {
        daysGained = 365;
      } else if (recoveryDays !== null && baselineDays !== null) {
        daysGained = Math.max(0, recoveryDays - baselineDays);
      }
    }

    return {
      activeCount: active.length,
      totalCashAdded,
      totalBurnReduced,
      recoveryCash,
      recoveryBurn,
      recoveryDays,
      recoveryDate,
      daysGained,
      isSustainable: isBaselinePositive || recoveryBurn <= 0,
      isBaselinePositive,
      isZeroCash: baselineCash <= 0,
    };
  }, [levers, selectedLevers, vitalSigns]);

  // Group levers by quadrant
  const quickWins = levers.filter((l) => l.quadrant === "quick_wins");
  const strategicFixes = levers.filter((l) => l.quadrant === "strategic_fixes");
  const toughDecisions = levers.filter((l) => l.quadrant === "tough_decisions");
  const distractions = levers.filter((l) => l.quadrant === "distractions");

  return (
    <div className="space-y-6">
      {/* Explanatory Banners for Sustainable or Zero-Cash States */}
      {simulation.isBaselinePositive ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-950 dark:text-emerald-200">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-300">
                Sustainable Cash-Flow Operations — No Emergency Burn Reductions Required
              </h4>
              <p className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
                The company is currently cash-flow positive. Emergency burn cuts and austerity measures are not needed. You can still selectively activate optional cash-buffer levers below (such as accelerating receivables or extending vendor terms) to build an operating cash surplus.
              </p>
            </div>
          </div>
        </div>
      ) : simulation.isZeroCash ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-950 dark:text-amber-200">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-amber-900 dark:text-amber-300">
                  0 Days Remaining — Immediate Cash Deficit (Zero Liquid Bank Cash)
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                  No verified bank cash is currently recorded in this assessment. Runway is calculated as 0 days. Please enter your verified bank cash reserves via "Edit Triage Inputs" to project realistic baseline runway and recovery impact.
                </p>
              </div>
            </div>
            <button
              onClick={onEditInputs}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors shrink-0"
            >
              Enter Bank Cash
            </button>
          </div>
        </div>
      ) : null}

      {/* ─── LIVE RUNWAY RECOVERY BANNER ─── */}
      <div className="glass-panel p-6 border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/30">
                Live Turnaround Sandbox
              </span>
              <span className="text-xs text-slate-400">
                {simulation.activeCount} of {levers.filter(l => l.quadrant !== "distractions").length} recovery levers active
              </span>
            </div>
            <h2 className="text-xl font-extrabold tracking-tight mt-1 text-white">
              Baseline vs. Recovery Runway
            </h2>
          </div>

          {/* Preset & Save Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 mr-1 hidden sm:inline">Playbooks:</span>
            <button
              onClick={() => handleApplyPreset("quick_wins")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                activePreset === "quick_wins"
                  ? "bg-emerald-500 text-slate-950 shadow-sm"
                  : "border border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-800"
              }`}
            >
              Quick Wins
            </button>
            <button
              onClick={() => handleApplyPreset("balanced_recovery")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                activePreset === "balanced_recovery"
                  ? "bg-emerald-500 text-slate-950 shadow-sm"
                  : "border border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-800"
              }`}
            >
              Balanced Recovery
            </button>
            <button
              onClick={() => handleApplyPreset("maximum_survival")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                activePreset === "maximum_survival"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "border border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-800"
              }`}
            >
              Maximum Survival
            </button>

            <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block" />

            <button
              onClick={() => persistPlan(selectedLevers)}
              disabled={saveStatus === "saving" || !targetAnalysisId}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                saveStatus === "saved"
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                  : saveStatus === "error"
                  ? "border-rose-500/50 bg-rose-500/10 text-rose-400"
                  : "border-slate-700 bg-slate-800/90 text-slate-200 hover:bg-slate-700"
              } disabled:opacity-50`}
              title="Save current turnaround plan selection"
            >
              {saveStatus === "saving" && <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />}
              {saveStatus === "saved" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
              {saveStatus === "idle" && <Save className="h-3.5 w-3.5 text-slate-400" />}
              {saveStatus === "error" && <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />}
              <span>
                {saveStatus === "saving"
                  ? "Saving..."
                  : saveStatus === "saved"
                  ? "Plan Saved"
                  : saveStatus === "error"
                  ? "Save Failed"
                  : "Save Plan"}
              </span>
            </button>
          </div>
        </div>

        {/* Comparison Metrics */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Metric 1: Cash Runway */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Runway Extension</span>
              <Calendar className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`font-mono ${simulation.isBaselinePositive ? "text-xl font-bold text-emerald-400" : "text-2xl font-extrabold text-white"}`}>
                {simulation.isBaselinePositive
                  ? "Sustainable"
                  : simulation.isZeroCash && simulation.recoveryDays === 0
                  ? "0 days remaining"
                  : simulation.isSustainable 
                  ? "Sustainable" 
                  : `${simulation.recoveryDays} days`}
              </span>
              {!simulation.isBaselinePositive && simulation.daysGained > 0 && (
                <span className="text-xs font-bold text-emerald-400">
                  (+{simulation.daysGained} days)
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              {simulation.isBaselinePositive
                ? "Cash-flow positive baseline — operations fund ongoing activities"
                : simulation.isZeroCash && simulation.recoveryDays === 0
                ? "Immediate cash deficit — enter bank cash in interview"
                : `Baseline: ${vitalSigns.daysToZeroCash != null ? `${vitalSigns.daysToZeroCash} days` : "Sustainable"}${simulation.recoveryDate ? ` → Zero cash: ${simulation.recoveryDate}` : ""}`}
            </p>
          </div>

          {/* Metric 2: Monthly Burn Rate */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Adjusted Net Burn</span>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-extrabold text-emerald-400">
                {simulation.isBaselinePositive ? "+$0" : `-$${formatMoney(simulation.recoveryBurn)}`}
              </span>
              <span className="text-xs text-slate-400">/ mo</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              {simulation.isBaselinePositive
                ? "No net cash bleed from operating activities"
                : `Reduced from -$${formatMoney(vitalSigns.netMonthlyBurn)}/mo (-$${formatMoney(simulation.totalBurnReduced)}/mo saved)`}
            </p>
          </div>

          {/* Metric 3: Liquid Capital Available */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Effective Liquidity Pool</span>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-extrabold text-white">
                ${formatMoney(simulation.recoveryCash)}
              </span>
              {simulation.totalCashAdded > 0 && (
                <span className="text-xs font-bold text-emerald-400">
                  (+${formatMoney(simulation.totalCashAdded)})
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Baseline Cash: ${formatMoney(vitalSigns.liquidCashNow)} (AR + payables standstill)
            </p>
          </div>
        </div>
      </div>

      {/* ─── 2x2 IMPACT VS PAIN QUADRANT GRID ─── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* QUADRANT 1: Quick Wins */}
        <div className="glass-panel p-5 border-emerald-500/30 dark:border-emerald-500/20 bg-emerald-500/[0.02]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Quick Wins</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">High Impact • Low Operational Friction • Immediate (0–14 Days)</p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
              {quickWins.filter(l => selectedLevers.has(l.id)).length}/{quickWins.length} Active
            </span>
          </div>

          <div className="space-y-3">
            {quickWins.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No overdue AR or discretionary spend reported in interview.</p>
            ) : (
              quickWins.map((lever) => (
                <LeverCard
                  key={lever.id}
                  lever={lever}
                  isActive={selectedLevers.has(lever.id)}
                  onToggle={() => toggleLever(lever.id)}
                  accent="emerald"
                />
              ))
            )}
          </div>
        </div>

        {/* QUADRANT 2: Strategic Fixes */}
        <div className="glass-panel p-5 border-blue-500/30 dark:border-blue-500/20 bg-blue-500/[0.02]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Strategic Fixes</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">High Impact • Moderate Operational Friction (14–30 Days)</p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">
              {strategicFixes.filter(l => selectedLevers.has(l.id)).length}/{strategicFixes.length} Active
            </span>
          </div>

          <div className="space-y-3">
            {strategicFixes.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No vendor deferral or payroll pool available.</p>
            ) : (
              strategicFixes.map((lever) => (
                <LeverCard
                  key={lever.id}
                  lever={lever}
                  isActive={selectedLevers.has(lever.id)}
                  onToggle={() => toggleLever(lever.id)}
                  accent="blue"
                />
              ))
            )}
          </div>
        </div>

        {/* QUADRANT 3: Tough Decisions */}
        <div className="glass-panel p-5 border-rose-500/30 dark:border-rose-500/20 bg-rose-500/[0.02]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tough Decisions</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">High Impact • High Operational Friction (Strict Survival Levers)</p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold text-rose-600 dark:text-rose-400">
              {toughDecisions.filter(l => selectedLevers.has(l.id)).length}/{toughDecisions.length} Active
            </span>
          </div>

          <div className="space-y-3">
            {toughDecisions.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No deep restructuring levers enabled.</p>
            ) : (
              toughDecisions.map((lever) => (
                <LeverCard
                  key={lever.id}
                  lever={lever}
                  isActive={selectedLevers.has(lever.id)}
                  onToggle={() => toggleLever(lever.id)}
                  accent="rose"
                />
              ))
            )}
          </div>
        </div>

        {/* QUADRANT 4: Distractions / Traps */}
        <div className="glass-panel p-5 border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-500/10 text-slate-500 dark:text-slate-400 font-bold">
                <XOctagon className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Distractions & High-Friction Traps</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Low Impact • High Friction • Avoid During Immediate Crisis</p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-400 border border-slate-300 dark:border-slate-700 px-2 py-0.5 rounded">
              Avoid
            </span>
          </div>

          <div className="space-y-3">
            {distractions.map((lever) => (
              <div
                key={lever.id}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 p-3.5 opacity-80"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 line-through">
                    {lever.title}
                  </span>
                  <span className="text-[10px] font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900">
                    High Risk / Zero 30D Cash
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {lever.formulaBasis}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LeverCard({ lever, isActive, onToggle, accent = "emerald" }) {
  const accentClasses = {
    emerald: {
      activeBorder: "border-emerald-500/60 bg-emerald-500/5",
      badge: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      toggleBg: "bg-emerald-600",
    },
    blue: {
      activeBorder: "border-blue-500/60 bg-blue-500/5",
      badge: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
      toggleBg: "bg-blue-600",
    },
    rose: {
      activeBorder: "border-rose-500/60 bg-rose-500/5",
      badge: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
      toggleBg: "bg-rose-600",
    },
  }[accent];

  return (
    <div
      onClick={onToggle}
      className={`rounded-xl border p-4 cursor-pointer transition-all duration-200 ${
        isActive
          ? `${accentClasses.activeBorder} shadow-sm`
          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              {lever.title}
            </h4>
            {lever.exclusiveGroup && (
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                Exclusive: {lever.exclusiveGroup}
              </span>
            )}
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${accentClasses.badge}`}>
              {lever.impactType === "monthly_burn_reduction" && `-$${formatMoney(lever.monthlyBurnDelta)}/mo`}
              {(lever.impactType === "one_time_cash" || lever.impactType === "cash_deferral") && `+$${formatMoney(lever.cashImpact)} cash`}
            </span>
            {lever.runwayDaysAdded > 0 && (
              <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                +{lever.runwayDaysAdded}d runway
              </span>
            )}
          </div>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {lever.formulaBasis}
          </p>
        </div>

        {/* Toggle Switch */}
        <div className="shrink-0 pt-0.5">
          <div
            className={`w-9 h-5 rounded-full transition-colors p-0.5 ${
              isActive ? accentClasses.toggleBg : "bg-slate-300 dark:bg-slate-700"
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                isActive ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
