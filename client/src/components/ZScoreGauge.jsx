/**
 * Altman Z-Score Gauge Component
 * Displays the Z-Score value with a visual gauge and zone indicator.
 */
import { ShieldAlert } from "lucide-react";

const ZONES = {
  Safe: { color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "Safe Zone", desc: "Low bankruptcy probability" },
  Grey: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", label: "Grey Zone", desc: "Caution — indeterminate risk" },
  Distress: { color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/30", label: "Distress Zone", desc: "High bankruptcy probability" },
};

export default function ZScoreGauge({ altmanZScore, className = "" }) {
  if (!altmanZScore?.available) {
    return (
      <div className={`glass-panel p-5 ${className}`}>
        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Altman Z-Score</h3>
        <p className="text-xs text-slate-400 dark:text-slate-500">Insufficient data for Z-Score computation. Add balance sheet columns (total_assets, equity) for full analysis.</p>
      </div>
    );
  }

  const { score, zone, components, dataQuality } = altmanZScore;
  const z = ZONES[zone] || ZONES.Grey;

  // Gauge position: map Z-Score range (-2 to 5) to 0-100%
  const gaugePercent = Math.min(100, Math.max(0, ((score + 2) / 7) * 100));

  return (
    <div className={`glass-panel p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert className="h-5 w-5 text-black dark:text-white" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Altman Z'-Score</h3>
        <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold ${z.bg} ${z.color} ${z.border} border`}>
          {dataQuality === "estimated" ? "Estimated" : "Actual Data"}
        </span>
      </div>

      {/* Score display */}
      <div className="text-center mb-4">
        <span className={`font-mono text-5xl font-bold ${z.color}`}>{score}</span>
        <div className={`mt-1 text-sm font-semibold ${z.color}`}>{z.label}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{z.desc}</div>
      </div>

      {/* Gauge bar */}
      <div className="relative h-3 rounded-full overflow-hidden mb-4 bg-gradient-to-r from-rose-500/30 via-amber-500/30 to-emerald-500/30">
        {/* Zone markers */}
        <div className="absolute top-0 h-full w-px bg-white/30" style={{ left: `${((1.1 + 2) / 7) * 100}%` }} />
        <div className="absolute top-0 h-full w-px bg-white/30" style={{ left: `${((2.6 + 2) / 7) * 100}%` }} />
        {/* Indicator */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-lg ${zone === "Safe" ? "bg-emerald-500" : zone === "Grey" ? "bg-amber-400" : "bg-rose-500"}`}
          style={{ left: `${gaugePercent}%` }}
        />
      </div>

      <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-4">
        <span>Distress (&lt;1.10)</span>
        <span>Grey (1.10-2.60)</span>
        <span>Safe (&gt;2.60)</span>
      </div>

      {/* Components breakdown */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Score Components</h4>
        {["X1", "X2", "X3", "X4"].map((key) => (
          <div key={key} className="flex items-center justify-between text-xs rounded-lg bg-slate-50 dark:bg-white/5 px-3 py-2 border border-slate-200 dark:border-white/5">
            <span className="text-slate-600 dark:text-slate-400">{components[`${key}_label`]}</span>
            <span className="font-mono font-semibold text-slate-900 dark:text-white">{components[key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
