import { useState, useMemo, useEffect } from "react";
import { fetchSimulationInsights } from "../api";

export default function ScenarioSimulation({ financials, risk, rowsCount }) {
  const [revAdj, setRevAdj] = useState(0); // percentage
  const [expAdj, setExpAdj] = useState(0); // percentage
  const [investment, setInvestment] = useState(0); // absolute $
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

  // Derive simulation metrics
  const simParams = useMemo(() => {
    if (!financials || !rowsCount) return null;
    
    // Base averages
    const avgRev = financials.totalRevenue / rowsCount;
    const avgExp = financials.totalExpenses / rowsCount;
    const currentRunway = financials.runway;

    // Projected
    const simAvgRev = avgRev * (1 + revAdj / 100);
    const simAvgExp = avgExp * (1 + expAdj / 100);
    const simMonthlyProfit = simAvgRev - simAvgExp;
    const simBurnRate = simAvgExp > simAvgRev ? simAvgExp - simAvgRev : 0;
    
    const simCash = (financials.latestCash || 0) + Number(investment);
    const simRunway = simBurnRate > 0 ? simCash / simBurnRate : null;

    // Decision Impact Tag & Time to failure
    let timeToFailure = null;
    let impactTag = { label: "Neutral", color: "text-slate-400 border-slate-500/20 bg-slate-500/10" };

    if (simRunway !== null) {
      timeToFailure = `You will run out of cash in approx. ${Math.round(simRunway * 30)} days`;
    }

    if (simRunway === null && currentRunway !== null) {
      impactTag = { label: "Safe Move (Profitable)", color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" };
    } else if (simRunway === null && currentRunway === null) {
      if (simMonthlyProfit > (financials.netProfit / rowsCount)) {
        impactTag = { label: "Safe Move (Growth)", color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" };
      }
    } else if (simRunway !== null && currentRunway === null) {
      impactTag = { label: "Dangerous (Burning Cash)", color: "text-rose-400 border-rose-500/20 bg-rose-500/10" };
    } else if (simRunway !== null && currentRunway !== null) {
      if (simRunway > currentRunway * 1.2) {
        impactTag = { label: "Safe Move (Extended Runway)", color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" };
      } else if (simRunway < currentRunway * 0.8) {
        impactTag = { label: "Dangerous", color: "text-rose-400 border-rose-500/20 bg-rose-500/10" };
      } else {
        impactTag = { label: "Risky but viable", color: "text-amber-400 border-amber-500/20 bg-amber-500/10" };
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
  }, [financials, rowsCount, revAdj, expAdj, investment]);

  const handleAskAI = async () => {
    if (!prompt.trim() || cooldown > 0 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const context = {
        baseline: {
          monthlyRevenue: financials.totalRevenue / rowsCount,
          monthlyExpenses: financials.totalExpenses / rowsCount,
          cash: financials.latestCash,
          burnRate: financials.burnRate,
          runway: financials.runway,
          riskLevel: risk?.riskLevel
        },
        scenario: {
          adjustments: {
            revenueChangePct: revAdj,
            expenseChangePct: expAdj,
            newInvestment: investment
          },
          projected: {
            simAvgRev: simParams.simAvgRev,
            simAvgExp: simParams.simAvgExp,
            simCash: simParams.simCash
          }
        }
      };
      const res = await fetchSimulationInsights(context, prompt);
      setAiResponse(res.answer || res.error || "No response received.");
      setCooldown(8); // 8 second cooldown
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Failed to get insights.");
    } finally {
      setLoading(false);
    }
  };

  if (!simParams) return null;

  return (
    <div className="glass-panel p-6 rounded-2xl flex flex-col gap-8 xl:flex-row">
      {/* Controls & Scenarios */}
      <div className="flex-1 space-y-6">
        <div>
          <h3 className="text-xl font-medium tracking-wide text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-2">
            <span className="w-1.5 h-6 bg-zinc-400 rounded-full block"></span>
            Scenario Engine
          </h3>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <button onClick={() => setExpAdj(-10)} className="px-3 py-1 text-xs rounded border border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors">Reduce Costs 10%</button>
            <button onClick={() => setRevAdj(20)} className="px-3 py-1 text-xs rounded border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors">Increase Revenue 20%</button>
            <button onClick={() => setInvestment((p) => p + 50000)} className="px-3 py-1 text-xs rounded border border-black/10 dark:border-white/10 bg-zinc-100 dark:bg-white/5 text-black dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors">Add $50K Investment</button>
            <button onClick={() => { setRevAdj(0); setExpAdj(0); setInvestment(0); }} className="px-3 py-1 text-xs rounded border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors ml-auto">Reset</button>
          </div>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <label className="font-medium text-emerald-600 dark:text-emerald-400">Revenue Adjustment</label>
              <span className="text-emerald-700 dark:text-emerald-100">{revAdj >= 0 ? "+" : ""}{revAdj}%</span>
            </div>
            <input 
              type="range" min="-100" max="200" value={revAdj} 
              onChange={(e) => setRevAdj(Number(e.target.value))}
              className="w-full accent-emerald-500 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <label className="font-medium text-rose-600 dark:text-rose-400">Expenses Adjustment</label>
              <span className="text-rose-700 dark:text-rose-100">{expAdj >= 0 ? "+" : ""}{expAdj}%</span>
            </div>
            <input 
              type="range" min="-100" max="200" value={expAdj} 
              onChange={(e) => setExpAdj(Number(e.target.value))}
              className="w-full accent-rose-500 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <label className="font-medium text-black dark:text-white dark:text-zinc-400">New Investment ($)</label>
              <span className="text-black dark:text-zinc-300">${Number(investment).toLocaleString()}</span>
            </div>
            <input 
              type="range" min="0" max="1000000" step="5000" value={investment} 
              onChange={(e) => setInvestment(Number(e.target.value))}
              className="w-full accent-black dark:accent-white dark:accent-white h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div className="w-px bg-slate-200 dark:bg-white/10 hidden xl:block"></div>

      {/* Recalculated Output & AI */}
      <div className="flex-1 space-y-6 flex flex-col justify-between">
        <div className="flex justify-between items-start mb-2">
           <h4 className="text-sm font-semibold uppercase text-slate-500 dark:text-slate-400">Before vs After</h4>
           <div className={`px-2 py-1 text-xs font-bold uppercase rounded border tracking-wider ${simParams.impactTag.color}`}>
             {simParams.impactTag.label}
           </div>
        </div>
        
        <div className="rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2 font-medium">Metric</th>
                <th className="px-4 py-2 font-medium border-l border-slate-200 dark:border-white/5">Current</th>
                <th className="px-4 py-2 font-medium border-l border-slate-200 dark:border-white/5 text-black dark:text-white dark:text-zinc-300">Simulated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              <tr className="bg-white dark:bg-slate-900/30">
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">Avg Profit/mo</td>
                <td className={`px-4 py-3 border-l border-slate-200 dark:border-white/5 font-mono ${simParams.avgRev - simParams.avgExp >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                  ${Math.round(simParams.avgRev - simParams.avgExp).toLocaleString()}
                </td>
                <td className={`px-4 py-3 border-l border-slate-200 dark:border-white/5 font-mono font-bold ${simParams.simMonthlyProfit >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                  ${Math.round(simParams.simMonthlyProfit).toLocaleString()}
                </td>
              </tr>
              <tr className="bg-white dark:bg-slate-900/30">
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">Runway</td>
                <td className="px-4 py-3 border-l border-slate-200 dark:border-white/5 font-mono text-slate-700 dark:text-slate-200">
                  {financials.runway !== null ? `${financials.runway} mo` : '∞'}
                </td>
                <td className="px-4 py-3 border-l border-slate-200 dark:border-white/5 font-mono font-bold text-black dark:text-white dark:text-zinc-300">
                  {simParams.simRunway !== null ? `${simParams.simRunway.toFixed(1)} mo` : '∞ (Sustainable)'}
                </td>
              </tr>
            </tbody>
          </table>
          {simParams.timeToFailure && (
            <div className="bg-rose-500/10 border-t border-rose-500/20 px-4 py-2 text-xs text-rose-300 font-medium text-center">
               ⚠️ {simParams.timeToFailure}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-zinc-900/40 dark:to-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-black/10 dark:border-white/10 shadow-sm dark:shadow-sm dark:shadow-[0_0_15px_rgba(255,255,255,0.05)]">
          <label className="text-xs font-semibold text-black dark:text-zinc-300 uppercase mb-2 block">AI Scenario Consultant</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="e.g. Is this safe if market slows down?"
              className="flex-1 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAskAI()}
            />
            <button 
              onClick={handleAskAI}
              disabled={loading || !prompt.trim() || cooldown > 0}
              className="bg-black dark:bg-white dark:text-black text-white hover:bg-zinc-800 dark:bg-zinc-200 dark:text-black text-white disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all min-w-[80px]"
            >
              {loading ? "..." : cooldown > 0 ? `Wait ${cooldown}s` : "Ask AI"}
            </button>
          </div>
          
          {error && <div className="mt-3 text-xs text-rose-500 dark:text-rose-400">{error}</div>}
          
          {aiResponse && (
            <div className="mt-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-black/20 p-3 rounded-lg border border-black/10 dark:border-white/10 whitespace-pre-line">
              <span className="text-black dark:text-white font-bold mr-1">AI:</span> {aiResponse}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
