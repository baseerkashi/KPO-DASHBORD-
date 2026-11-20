import { AlertTriangle, Clock, TrendingDown, Scale, ShieldAlert, Sliders, CheckCircle, Info } from "lucide-react";

function formatMoney(n) {
  if (n === null || n === undefined || isNaN(n)) return "0";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.max(0, n));
}

export default function VitalSignsStrip({ vitalSigns, onEditTriage }) {
  if (!vitalSigns) return null;

  const {
    liquidCashNow,
    monthlyRevenue,
    monthlyExpenses,
    netMonthlyBurn,
    daysToZeroCash,
    zeroCashDate,
    breakevenGapMonthly,
    solvencyStatus,
    isCashFlowPositive,
  } = vitalSigns;

  const isPositive = Boolean(isCashFlowPositive || (netMonthlyBurn !== null && netMonthlyBurn <= 0));
  const rawCash = parseFloat(liquidCashNow);
  const isZeroCash = isNaN(rawCash) || rawCash <= 0;

  // Safe runway number (guard against NaN, Infinity, negative)
  const validDays = (daysToZeroCash !== null && !isNaN(daysToZeroCash) && isFinite(daysToZeroCash))
    ? Math.max(0, daysToZeroCash)
    : null;

  // Distressed threshold only applies if company is NOT cash-flow positive
  const isCritical = !isPositive && (isZeroCash || (validDays !== null && validDays < 90));
  const isEmergency = !isPositive && (isZeroCash || (validDays !== null && validDays < 30));

  return (
    <div className="space-y-3">
      {/* Top Banner Alert (only for non-sustainable distress) */}
      {!isPositive && isCritical && (
        <div className={`flex items-center justify-between rounded-xl p-4 border transition-colors ${
          isEmergency 
            ? "border-rose-500/40 bg-rose-500/10 text-rose-950 dark:text-rose-200"
            : "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-200"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              isEmergency ? "bg-rose-600 text-white" : "bg-amber-600 text-white"
            }`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">
                {isZeroCash 
                  ? "Immediate Cash Deficit — No Bank Balance Recorded" 
                  : isEmergency 
                  ? "Immediate Insolvency Warning (<30 Days Runway)" 
                  : "Critical Cash Runway Alert (<90 Days)"}
              </h3>
              <p className="text-xs opacity-90 mt-0.5">
                {isZeroCash ? (
                  <span>
                    Zero liquid cash recorded ($0) with an active net burn of <strong className="font-mono">${formatMoney(netMonthlyBurn)}/mo</strong>. 
                    Remaining runway: <strong className="font-mono">0 days remaining — Immediate Cash Deficit</strong>. Please enter bank cash in triage.
                  </span>
                ) : (
                  <span>
                    At current burn rate of <span className="font-mono font-bold">${formatMoney(netMonthlyBurn)}/mo</span>, remaining cash exhausts in <strong className="font-mono">{validDays ?? 0} days</strong> (projected zero-cash date: <span className="underline font-semibold">{zeroCashDate || "Immediate"}</span>).
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onEditTriage}
            className="flex items-center gap-1.5 rounded-lg bg-black px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-200 transition-colors shrink-0 ml-4"
          >
            <Sliders className="h-3.5 w-3.5" />
            {isZeroCash ? "Enter Bank Cash" : "Edit Triage Inputs"}
          </button>
        </div>
      )}

      {/* Sustainable / Cash-Flow Positive Banner */}
      {isPositive && (
        <div className="flex items-center justify-between rounded-xl p-4 border border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 transition-colors">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-emerald-900 dark:text-emerald-300">
                Cash-Flow Positive (Sustainable)
              </h3>
              <p className="text-xs text-emerald-800 dark:text-emerald-300/90 mt-0.5">
                Current monthly revenue of <span className="font-mono font-bold">${formatMoney(monthlyRevenue)}</span> covers operating expenses of <span className="font-mono font-bold">${formatMoney(monthlyExpenses)}</span>. No emergency burn reduction required.
              </p>
            </div>
          </div>
          <button
            onClick={onEditTriage}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors shrink-0 ml-4"
          >
            <Sliders className="h-3.5 w-3.5" />
            Update Triage Inputs
          </button>
        </div>
      )}

      {/* 4 Hero Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Days to Zero Cash */}
        <div className={`glass-panel p-5 relative overflow-hidden transition-all ${
          isPositive
            ? "border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/20 dark:bg-emerald-950/20"
            : isCritical 
            ? "border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20 shadow-sm"
            : "border-slate-200 dark:border-slate-800"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Days to Zero Cash
            </span>
            <Clock className={`h-4 w-4 ${isPositive ? "text-emerald-500" : isCritical ? "text-rose-500" : "text-emerald-500"}`} />
          </div>
          <div className="flex items-baseline gap-2">
            {isPositive ? (
              <span className="font-mono text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                Cash-Flow Positive (Sustainable)
              </span>
            ) : isZeroCash ? (
              <div className="flex flex-col">
                <span className="font-mono text-2xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400">
                  0 days remaining
                </span>
                <span className="text-[11px] font-semibold text-rose-500 mt-0.5">
                  Immediate Cash Deficit
                </span>
              </div>
            ) : validDays !== null ? (
              <>
                <span className={`font-mono text-3xl font-extrabold tracking-tight ${
                  isEmergency ? "text-rose-600 dark:text-rose-400" : isCritical ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"
                }`}>
                  {validDays}
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">days</span>
              </>
            ) : (
              <span className="font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400">
                Sustainable
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {isPositive
              ? "Operations generate surplus cash. No zero-cash date."
              : isZeroCash
              ? "Prompt: Enter liquid cash in interview."
              : zeroCashDate
              ? `Zero cash expected: ${zeroCashDate}`
              : "Calculated from uploaded financials."}
          </p>
        </div>

        {/* Card 2: Net Monthly Burn */}
        <div className="glass-panel p-5 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Net Monthly Burn
            </span>
            <TrendingDown className={`h-4 w-4 ${!isPositive && netMonthlyBurn > 0 ? "text-rose-500" : "text-emerald-500"}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`font-mono text-3xl font-extrabold tracking-tight ${
              !isPositive && netMonthlyBurn > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
            }`}>
              {!isPositive && netMonthlyBurn > 0 ? `-$${formatMoney(netMonthlyBurn)}` : "+$0"}
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">/ mo</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Rev: ${formatMoney(monthlyRevenue)} | Exp: ${formatMoney(monthlyExpenses)}
          </p>
        </div>

        {/* Card 3: Breakeven Gap */}
        <div className="glass-panel p-5 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Breakeven Gap
            </span>
            <Scale className="h-4 w-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`font-mono text-3xl font-extrabold tracking-tight ${
              isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white"
            }`}>
              ${isPositive ? "0" : formatMoney(breakevenGapMonthly)}
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">monthly</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {isPositive || breakevenGapMonthly <= 0
              ? "Operations currently cover cash outflows. Zero gap."
              : "Monthly reduction needed to stem cash bleed."}
          </p>
        </div>

        {/* Card 4: Solvency Status */}
        <div className="glass-panel p-5 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Solvency Status
            </span>
            <ShieldAlert className={`h-4 w-4 ${isPositive ? "text-emerald-500" : isCritical ? "text-rose-500" : "text-emerald-500"}`} />
          </div>
          <div className="flex items-baseline">
            <span className={`text-base font-bold leading-snug ${
              isPositive 
                ? "text-emerald-600 dark:text-emerald-400" 
                : isEmergency 
                ? "text-rose-600 dark:text-rose-400" 
                : isCritical 
                ? "text-amber-600 dark:text-amber-400" 
                : "text-emerald-600 dark:text-emerald-400"
            }`}>
              {isPositive ? "Cash-Flow Positive (Sustainable)" : (isZeroCash ? "Immediate Cash Deficit (0 Days)" : solvencyStatus)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Cash: ${formatMoney(rawCash)}
            </span>
            <button
              onClick={onEditTriage}
              className={`text-[11px] font-semibold hover:underline ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-indigo-600 dark:text-indigo-400"}`}
            >
              {isZeroCash ? "Enter Bank Cash" : "Update Inputs"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
