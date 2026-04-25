/**
 * Industry Benchmark Comparison Component
 * Shows how the company's metrics rank within its industry.
 */
import { Target } from "lucide-react";

function PercentileBar({ label, value, percentile, benchmark, unit, invertedBetter }) {
  // Determine color based on percentile
  let barColor, textColor;
  const effectivePercentile = invertedBetter ? percentile : percentile;
  
  if (effectivePercentile >= 75) {
    barColor = "bg-emerald-500";
    textColor = "text-emerald-500";
  } else if (effectivePercentile >= 50) {
    barColor = "bg-blue-500";
    textColor = "text-blue-500";
  } else if (effectivePercentile >= 25) {
    barColor = "bg-amber-500";
    textColor = "text-amber-500";
  } else {
    barColor = "bg-rose-500";
    textColor = "text-rose-500";
  }

  return (
    <div className="rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</span>
        <span className={`font-mono text-sm font-bold ${textColor}`}>
          {value}{unit}
        </span>
      </div>

      {/* Percentile bar */}
      <div className="relative h-2.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden mb-2">
        {/* Q1 and Q3 markers */}
        <div className="absolute top-0 h-full w-px bg-slate-400/30" style={{ left: "25%" }} />
        <div className="absolute top-0 h-full w-px bg-slate-400/30" style={{ left: "75%" }} />
        {/* Median marker */}
        <div className="absolute top-0 h-full w-0.5 bg-slate-500/50" style={{ left: "50%" }} />
        
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-1000`}
          style={{ width: `${Math.max(3, percentile)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
        <span>Q1: {benchmark.q1}{unit}</span>
        <span className="font-semibold">Median: {benchmark.median}{unit}</span>
        <span>Q3: {benchmark.q3}{unit}</span>
      </div>

      <div className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
        {effectivePercentile >= 75 
          ? "✓ Above 75th percentile — excellent for this industry"
          : effectivePercentile >= 50
          ? "↑ Above median — competitive position"
          : effectivePercentile >= 25
          ? "↓ Below median — room for improvement"
          : "⚠ Bottom quartile — significant concern"
        }
      </div>
    </div>
  );
}

export default function BenchmarkComparison({ benchmarkData, className = "" }) {
  if (!benchmarkData) return null;

  const { industryLabel, metrics } = benchmarkData;

  return (
    <div className={`glass-panel p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-1">
        <Target className="h-5 w-5 text-black dark:text-white" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Industry Benchmark</h3>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Compared against <span className="font-semibold text-slate-700 dark:text-slate-300">{industryLabel}</span> sector medians
      </p>

      <div className="space-y-3">
        {Object.values(metrics).map((m) => (
          <PercentileBar
            key={m.label}
            label={m.label}
            value={m.value}
            percentile={m.percentile}
            benchmark={m.benchmark}
            unit={m.unit}
            invertedBetter={m.invertedBetter}
          />
        ))}
      </div>
    </div>
  );
}
