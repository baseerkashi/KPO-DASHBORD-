import { useState, useMemo, useEffect } from "react";
import { fetchSimulationInsights } from "../api";

export default function ScenarioSimulation({ financials, risk, rowsCount, interviewContext }) {
  const [revAdj, setRevAdj] = useState(0); // percentage
  const [expAdj, setExpAdj] = useState(0); // percentage
  const [cashInjection, setCashInjection] = useState(0); // absolute $
  const [payrollCutPct, setPayrollCutPct] = useState(0); // percentage
  const [prompt, setPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Derive simulation metrics strictly from verified baseline numbers
  const simParams = useMemo(() => {
    if (!financials || !rowsCount) return null;
    
    // Base averages
    const avgRev = financials.totalRevenue / rowsCount;
    const avgExp = financials.totalExpenses / rowsCount;
    const currentRunway = financials.runway;

    // Use interview cash if provided, else statement cash
    const baseCash = interviewContext?.liquidCashNow != null 
      ? Number(interviewContext.liquidCashNow) 
      : (financials.latestCash || 0);

    const monthlyPayroll = Number(interviewContext?.monthlyPayroll) || 0;
    const payrollSavings = (monthlyPayroll * (payrollCutPct / 100));

    // Simulated revenue & expenses (NO fake 2.0x ROAS or $5k salary constants)
    const simAvgRev = avgRev * (1 + revAdj / 100);
    const nonPayrollExp = Math.max(0, avgExp - monthlyPayroll);
    const simNonPayrollExp = nonPayrollExp * (1 + expAdj / 100);
    const simPayrollExp = Math.max(0, monthlyPayroll - payrollSavings);

    const simAvgExp = monthlyPayroll > 0 
      ? (simNonPayrollExp + simPayrollExp) 
      : (avgExp * (1 + expAdj / 100));

    const simMonthlyProfit = simAvgRev - simAvgExp;
    const simBurnRate = simAvgExp > simAvgRev ? simAvgExp - simAvgRev : 0;
    
    const simCash = baseCash + Number(cashInjection);
    const simRunway = simBurnRate > 0 ? simCash / simBurnRate : null;

    let timeToFailure = null;
    let impactTag = { label: "Neutral", color: "text-slate-400 border-slate-500/20 bg-slate-500/10" };

    if (simRunway !== null) {
      timeToFailure = `You will run out of cash in approx. ${Math.round(simRunway * 30)} days`;
    }

    if (simRunway === null && currentRunway !== null) {
      impactTag = { label: "Safe Move (Profitable)", color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" };
    } else if (simRunway === null && currentRunway === null) {
      if (simMonthlyProfit > (financials.netProfit / rowsCount)) {
        impactTag = { label: "Safe Move (Expansion)", color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" };
      }
    } else if (simRunway !== null && currentRunway === null) {
      impactTag = { label: "Dangerous (Cash Bleed)", color: "text-rose-400 border-rose-500/20 bg-rose-500/10" };
    } else if (simRunway !== null && currentRunway !== null) {
      if (simRunway > currentRunway * 1.2) {
        impactTag = { label: "Safe Move (Extended Runway)", color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" };
      } else if (simRunway < currentRunway * 0.8) {
        impactTag = { label: "Dangerous", color: "text-rose-400 border-rose-500/20 bg-rose-500/10" };
      } else {
        impactTag = { label: "Moderate Impact", color: "text-amber-400 border-amber-500/20 bg-amber-500/10" };
      }
    }

    return {
      avgRev,
      avgExp,
      simAvgRev,
      simAvgExp,
      simMonthlyProfit,
      simBurnRate,
      simCash,
      simRunway,
      timeToFailure,
      impactTag
    };
  }, [financials, rowsCount, interviewContext, revAdj, expAdj, cashInjection, payrollCutPct]);

  const handleSimulateInsights = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const context = {
        financials: {
          ...financials,
          simulation: {
            simAvgRev: simParams.simAvgRev,
            simAvgExp: simParams.simAvgExp,
            simCash: simParams.simCash
          }
        }
      };
      const res = await fetchSimulationInsights(context, prompt);
      setAiResponse(res.answer || res.error || "No response received.");
      setCooldown(8);
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Failed to get insights.");
    } finally {
      setLoading(false);
    }
  };

  if (!simParams) return null;

  return (
    <div className="glass-panel p-6 rounded-2xl flex flex-col gap-8 xl:flex-row border-slate-200 dark:border-slate-800">
      {/* Controls & Scenarios */}
      <div className="flex-1 space-y-6">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-2">
            <span className="w-1.5 h-6 bg-emerald-500 rounded-full block"></span>
            Deterministic Scenario Modeling
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Stress-test operations using verified financial inputs. No arbitrary multipliers or estimated salaries.
          </p>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <button onClick={() => setExpAdj(-15)} className="px-3 py-1 text-xs font-semibold rounded border border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors">Cut Non-Payroll 15%</button>
            <button onClick={() => setPayrollCutPct(20)} className="px-3 py-1 text-xs font-semibold rounded border border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors">Cut Payroll 20%</button>
            <button onClick={() => setRevAdj(-20)} className="px-3 py-1 text-xs font-semibold rounded border border-slate-400/30 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors">Stress: -20% Revenue</button>
            <button onClick={() => setCashInjection(50000)} className="px-3 py-1 text-xs font-semibold rounded border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 transition-colors">Inject $50k Capital</button>
            <button onClick={() => { setRevAdj(0); setExpAdj(0); setCashInjection(0); setPayrollCutPct(0); }} className="px-3 py-1 text-xs font-semibold rounded border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors ml-auto">Reset</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <label className="font-semibold text-emerald-600 dark:text-emerald-400">Revenue Growth/Decline</label>
              <span className="font-mono text-emerald-700 dark:text-emerald-300">{revAdj >= 0 ? "+" : ""}{revAdj}%</span>
            </div>
            <input 
              type="range" min="-50" max="100" value={revAdj} 
              onChange={(e) => setRevAdj(Number(e.target.value))}
              className="w-full accent-emerald-500 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <label className="font-semibold text-rose-600 dark:text-rose-400">Operating Cost Adjustment</label>
              <span className="font-mono text-rose-700 dark:text-rose-300">{expAdj >= 0 ? "+" : ""}{expAdj}%</span>
            </div>
            <input 
              type="range" min="-50" max="100" value={expAdj} 
              onChange={(e) => setExpAdj(Number(e.target.value))}
              className="w-full accent-rose-500 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <label className="font-semibold text-amber-600 dark:text-amber-400">Payroll Reduction Target</label>
              <span className="font-mono text-amber-700 dark:text-amber-300">{payrollCutPct}% cut</span>
            </div>
            <input 
              type="range" min="0" max="60" step="5" value={payrollCutPct} 
              onChange={(e) => setPayrollCutPct(Number(e.target.value))}
              className="w-full accent-amber-500 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <label className="font-semibold text-blue-600 dark:text-blue-400">Emergency Cash Injection</label>
              <span className="font-mono text-blue-700 dark:text-blue-300">${Number(cashInjection).toLocaleString()}</span>
            </div>
            <input 
              type="range" min="0" max="500000" step="10000" value={cashInjection} 
              onChange={(e) => setCashInjection(Number(e.target.value))}
              className="w-full accent-blue-500 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Live Simulation Results */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Simulated Monthly Run-Rate</h4>
            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${simParams.impactTag.color}`}>
              {simParams.impactTag.label}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Sim. Revenue</span>
              <p className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">${Math.round(simParams.simAvgRev).toLocaleString()}</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Sim. Expenses</span>
              <p className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">${Math.round(simParams.simAvgExp).toLocaleString()}</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Sim. Net Profit</span>
              <p className={`text-lg font-bold font-mono mt-1 ${simParams.simMonthlyProfit >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                ${Math.round(simParams.simMonthlyProfit).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Sim. Runway</span>
              <p className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
                {simParams.simRunway !== null ? `${Math.round(simParams.simRunway * 10) / 10} mo` : "∞ (Safe)"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Assistant Sandbox */}
      <div className="w-full xl:w-[360px] flex flex-col justify-between border-t xl:border-t-0 xl:border-l border-slate-200 dark:border-slate-800 pt-6 xl:pt-0 xl:pl-6">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
            <span>Advisor Chat</span>
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Ask Gemini how this scenario impacts solvency and vendor covenants.
          </p>

          <div className="space-y-3">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Can we survive 6 months if revenue falls 15%?"
              rows={3}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500 resize-none"
            />
            <button
              onClick={handleSimulateInsights}
              disabled={loading || cooldown > 0 || !prompt.trim()}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Analyzing Scenario..." : cooldown > 0 ? `Wait ${cooldown}s` : "Query Advisor"}
            </button>
          </div>

          {error && <p className="text-xs text-rose-500 mt-2">{error}</p>}

          {aiResponse && (
            <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-3 text-xs text-slate-700 dark:text-slate-300 max-h-[180px] overflow-y-auto">
              <p className="font-semibold text-slate-900 dark:text-white mb-1">Advisor Evaluation:</p>
              {aiResponse}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
