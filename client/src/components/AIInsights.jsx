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
        <ul className="space-y-3">
          {insights.map((line, i) => (
            <li
              key={i}
              className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800 whitespace-pre-line transition-all hover:border-black/10 dark:border-white/10 hover:shadow-md dark:bg-transparent dark:bg-gradient-to-r dark:from-zinc-500/10 dark:via-transparent dark:to-zinc-500/10 dark:text-slate-200 dark:hover:border-white/30"
            >
              <span className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-zinc-500 to-zinc-600 dark:from-zinc-400 dark:to-zinc-500 opacity-80" />
              <span className="pl-2">{line}</span>
            </li>
          ))}
        </ul>
      )}

      {!loading && insights.length === 0 && !error && (
        <p className="text-sm text-slate-500">Syncing neural summary… or use Refresh.</p>
      )}
    </section>
  );
}
