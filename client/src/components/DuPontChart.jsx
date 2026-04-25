/**
 * DuPont Analysis Decomposition Chart
 * Visual breakdown of ROE into its 3 drivers.
 */
import { TrendingUp } from "lucide-react";

export default function DuPontChart({ duPont, className = "" }) {
  if (!duPont?.available) {
    return (
      <div className={`glass-panel p-5 ${className}`}>
        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">DuPont Analysis</h3>
        <p className="text-xs text-slate-400 dark:text-slate-500">Insufficient data for DuPont decomposition.</p>
      </div>
    );
  }

  const { roe, netProfitMargin, assetTurnover, equityMultiplier, dataQuality } = duPont;

  const drivers = [
    {
      label: "Net Profit Margin",
      value: `${netProfitMargin}%`,
      sublabel: "Net Income / Revenue",
      color: "from-emerald-500/20 to-emerald-500/5",
      accent: "text-emerald-500",
      bar: Math.min(100, Math.max(5, netProfitMargin * 2)),
    },
    {
      label: "Asset Turnover",
      value: `${assetTurnover}x`,
      sublabel: "Revenue / Total Assets",
      color: "from-blue-500/20 to-blue-500/5",
      accent: "text-blue-500",
      bar: Math.min(100, Math.max(5, assetTurnover * 25)),
    },
    {
      label: "Equity Multiplier",
      value: `${equityMultiplier}x`,
      sublabel: "Total Assets / Equity",
      color: "from-purple-500/20 to-purple-500/5",
      accent: "text-purple-500",
      bar: Math.min(100, Math.max(5, equityMultiplier * 20)),
    },
  ];

  return (
    <div className={`glass-panel p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-black dark:text-white" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">DuPont Analysis</h3>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10">
          {dataQuality === "estimated" ? "Estimated" : "Actual"}
        </span>
      </div>

      {/* ROE Result */}
      <div className="text-center p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border border-indigo-500/20 mb-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1">Return on Equity</div>
        <div className="font-mono text-4xl font-bold text-slate-900 dark:text-white">{roe}%</div>
        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
          {netProfitMargin}% × {assetTurnover}x × {equityMultiplier}x
        </div>
      </div>

      {/* Formula visual */}
      <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-5">
        <span className="text-emerald-500 font-semibold">Margin</span>
        <span>×</span>
        <span className="text-blue-500 font-semibold">Turnover</span>
        <span>×</span>
        <span className="text-purple-500 font-semibold">Leverage</span>
        <span>=</span>
        <span className="text-indigo-400 font-bold">ROE</span>
      </div>

      {/* Drivers */}
      <div className="space-y-3">
        {drivers.map((d) => (
          <div key={d.label} className={`rounded-xl p-3 bg-gradient-to-r ${d.color} border border-slate-200 dark:border-white/5`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{d.label}</span>
              <span className={`font-mono text-sm font-bold ${d.accent}`}>{d.value}</span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-2">{d.sublabel}</div>
            <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${d.accent.replace("text-", "bg-")}`}
                style={{ width: `${d.bar}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
