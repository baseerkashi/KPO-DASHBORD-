import { ShieldAlert } from "lucide-react";

export default function RiskAssessment({ risk, className = "" }) {
  const { riskLevel, riskScore, riskIndicators, factors } = risk;

  const levelStyles = {
    Low: "border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shadow-sm dark:shadow-[0_0_24px_-6px_rgba(52,211,153,0.35)]",
    Medium: "border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-200 shadow-sm dark:shadow-[0_0_24px_-6px_rgba(251,191,36,0.25)]",
    High: "border-rose-500/50 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-200 shadow-sm dark:shadow-[0_0_28px_-6px_rgba(244,63,94,0.4)]",
  };

  // Gauge arc for the score
  const scoreAngle = (riskScore / 100) * 180; // 0-180 degrees
  const scoreColor = riskScore >= 60 ? "#f43f5e" : riskScore >= 35 ? "#f59e0b" : "#10b981";

  return (
    <section className={`glass-panel border-black/10 dark:border-white/10 p-5 ${className}`}>
      <div className="mb-4 flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-black dark:text-white" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Risk Assessment</h2>
        {factors && (
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10">
            10-Factor Model
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-500">Composite score</p>
          <p className="font-mono text-4xl font-bold tabular-nums text-slate-900 dark:text-white">
            {riskScore}
            <span className="text-lg font-normal text-slate-500 dark:text-slate-500">/100</span>
          </p>
        </div>
        <span
          className={`rounded-full border px-4 py-1.5 text-sm font-bold ${levelStyles[riskLevel] || levelStyles.Medium}`}
        >
          {riskLevel}
        </span>
      </div>

      {/* Mini factor bars (top 5) */}
      {factors && factors.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {factors.slice(0, 5).map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 w-24 truncate">{f.name}</span>
              <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full ${f.score >= 60 ? "bg-rose-500" : f.score >= 35 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${f.score}%` }}
                />
              </div>
              <span className={`text-[10px] font-mono font-bold w-8 text-right ${f.score >= 60 ? "text-rose-500" : f.score >= 35 ? "text-amber-500" : "text-emerald-500"}`}>
                {f.score}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
        {factors 
          ? "Weighted across: profitability, growth, volatility, expenses, liquidity, debt, working capital, concentration, Z-Score, sustainability."
          : "Weights: revenue trend, expense ratio, margin, sales variability, liabilities (if present)."
        }
      </p>

      <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-500">Indicators</h3>
      <ul className="space-y-2">
        {riskIndicators.map((t, i) => (
          <li
            key={i}
            className="flex gap-2 rounded-lg border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.03] px-3 py-2 text-sm text-slate-700 dark:text-slate-300"
          >
            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-black dark:bg-white shadow-[0_0_8px_rgba(0,0,0,0.2)] dark:shadow-[0_0_8px_rgba(255,255,255,0.2)]" />
            {t}
          </li>
        ))}
      </ul>
    </section>
  );
}
