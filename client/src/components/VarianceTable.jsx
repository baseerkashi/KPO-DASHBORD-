/**
 * Variance Analysis Table
 * Shows period-over-period variance for key financial metrics.
 */
import { BarChart3 } from "lucide-react";

export default function VarianceTable({ varianceData, className = "" }) {
  if (!varianceData?.available) {
    return (
      <div className={`glass-panel p-5 ${className}`}>
        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Variance Analysis</h3>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {varianceData?.reason || "Need at least 4 periods for variance analysis."}
        </p>
      </div>
    );
  }

  const { variances } = varianceData;

  const fmt = (n, isPct) => {
    if (isPct) return `${n}%`;
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
  };

  return (
    <div className={`glass-panel p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-5 w-5 text-black dark:text-white" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Variance Analysis</h3>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10">
          First Half vs Second Half
        </span>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Metric</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-white/5">Prior</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-white/5">Current</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-white/5">Δ Abs</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-white/5">Δ %</th>
              <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-200 dark:border-white/5">Signal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/5">
            {variances.map((v, i) => (
              <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">
                  {v.label}
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-600 dark:text-slate-300 border-l border-slate-200 dark:border-white/5">
                  {v.isPercentage ? `${v.prior}%` : `$${fmt(v.prior)}`}
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900 dark:text-white border-l border-slate-200 dark:border-white/5">
                  {v.isPercentage ? `${v.current}%` : `$${fmt(v.current)}`}
                </td>
                <td className={`px-4 py-3 text-right font-mono border-l border-slate-200 dark:border-white/5 ${v.favorable ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {v.absoluteVariance > 0 ? "+" : ""}{v.isPercentage ? `${v.absoluteVariance}pp` : `$${fmt(v.absoluteVariance)}`}
                </td>
                <td className={`px-4 py-3 text-right font-mono border-l border-slate-200 dark:border-white/5 ${v.favorable ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {v.percentVariance > 0 ? "+" : ""}{v.percentVariance}%
                </td>
                <td className="px-4 py-3 text-center border-l border-slate-200 dark:border-white/5">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${v.favorable
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
                    }`}>
                    {v.favorable ? "Favorable" : "Unfavorable"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {variances[0]?.periodLabel && (
        <div className="mt-3 flex gap-4 text-[10px] text-slate-400 dark:text-slate-500">
          <span>Prior: {variances[0].periodLabel.prior}</span>
          <span>Current: {variances[0].periodLabel.current}</span>
        </div>
      )}
    </div>
  );
}
