import { Sparkles, RefreshCw } from "lucide-react";

export default function AIInsights({ insights, loading, error, onRefresh, className = "" }) {
  return (
    <section className={`glass-panel border-black/10 dark:border-white/10 dark:border-white/10 p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-black dark:text-white dark:text-zinc-400" />
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">AI insights</h2>
            <p className="text-xs text-slate-500 dark:text-slate-500">OpenAI via server · key in server/.env only</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-black/10 dark:border-white/10 bg-zinc-100 dark:bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100 transition-all hover:border-black/30 dark:hover:border-white/30 hover:bg-zinc-200 dark:hover:bg-white/10 hover:shadow-md disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Thinking…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div
          className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100/90"
          role="status"
        >
          {error}
        </div>
      )}

      {insights.length > 0 && (
        <ul className="space-y-4">
          {insights.map((insight, i) => {
            if (typeof insight === 'string') {
               // Fallback if formatting failed
               return (
                <li key={i} className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 p-4 text-sm leading-relaxed text-zinc-900 whitespace-pre-line transition-all dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 hover:shadow-md">
                   <span className="absolute left-0 top-0 h-full w-1 bg-zinc-400 dark:bg-zinc-500 opacity-80" />
                   <span className="pl-2">{insight}</span>
                </li>
               );
            }
            return (
            <li
              key={i}
              className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/30 hover:shadow-md"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{insight.category}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  insight.confidenceScore >= 4 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                  insight.confidenceScore === 3 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                  'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                }`}>
                  Confidence: {insight.confidenceScore}/5
                </span>
              </div>
              
              <div className="space-y-2 mt-3">
                <p className="text-sm text-slate-900 dark:text-white font-medium"><span className="text-black dark:text-white opacity-50 mr-1.5">Observation:</span>{insight.observation}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300"><span className="text-black dark:text-white opacity-50 mr-1.5">Risk Impact:</span>{insight.risk}</p>
                <div className="bg-slate-50 dark:bg-black/30 p-2 text-xs font-mono text-slate-500 dark:text-slate-400 rounded-lg border border-slate-200 dark:border-white/5">
                  Reference: {insight.evidence}
                </div>
                <div className="pt-2 mt-2 border-t border-slate-100 dark:border-white/5">
                   <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400"><span className="opacity-70 mr-1.5">Action:</span>{insight.recommendation}</p>
                </div>
              </div>
            </li>
          )})}
        </ul>
      )}

      {!loading && insights.length === 0 && !error && (
        <p className="text-sm text-slate-500">Syncing neural summary… or use Refresh.</p>
      )}
    </section>
  );
}
