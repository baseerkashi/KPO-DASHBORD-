/**
 * Data Warnings Component
 * Displays validation warnings and errors from the data validation engine.
 */
import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, XCircle, CheckCircle } from "lucide-react";

export default function DataWarnings({ validation, className = "" }) {
  const [expanded, setExpanded] = useState(false);

  if (!validation) return null;
  
  const { warnings = [], errors = [], valid } = validation;
  const total = warnings.length + errors.length;
  
  if (total === 0) {
    return (
      <div className={`flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-4 py-2.5 ${className}`}>
        <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
          Data validation passed — no anomalies detected.
        </span>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border ${errors.length > 0 ? "border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/5" : "border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/5"} ${className}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <AlertTriangle className={`h-4 w-4 flex-shrink-0 ${errors.length > 0 ? "text-rose-500" : "text-amber-500"}`} />
        <span className={`text-sm font-semibold ${errors.length > 0 ? "text-rose-700 dark:text-rose-400" : "text-amber-700 dark:text-amber-400"}`}>
          {errors.length > 0 ? `${errors.length} error(s)` : ""}{errors.length > 0 && warnings.length > 0 ? " and " : ""}
          {warnings.length > 0 ? `${warnings.length} warning(s)` : ""} detected in uploaded data
        </span>
        <span className="ml-auto">
          {expanded
            ? <ChevronUp className="h-4 w-4 text-slate-400" />
            : <ChevronDown className="h-4 w-4 text-slate-400" />
          }
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {errors.map((err, i) => (
            <div key={`e-${i}`} className="flex gap-2 text-sm text-rose-700 dark:text-rose-400">
              <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{err}</span>
            </div>
          ))}
          {warnings.map((warn, i) => (
            <div key={`w-${i}`} className="flex gap-2 text-sm text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{warn}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
