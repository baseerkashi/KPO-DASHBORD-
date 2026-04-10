import { Sparkles, RefreshCw } from "lucide-react";

export default function AIInsights({ insights, loading, error, onRefresh, className = "" }) {
  return (
    <section className={`glass-panel border-fuchsia-500/20 p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-fuchsia-400" />
          <div>
            <h2 className="text-lg font-semibold text-white">AI insights</h2>
            <p className="text-xs text-slate-500">OpenAI via server · key in server/.env only</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-200 transition-all hover:border-blue-400/60 hover:bg-blue-500/20 hover:shadow-[0_0_20px_-4px_rgba(34,211,238,0.4)] disabled:opacity-50"
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
              className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-r from-fuchsia-500/10 via-transparent to-blue-500/10 p-4 text-sm leading-relaxed text-slate-200 transition-all hover:border-blue-400/30 hover:shadow-[0_0_24px_-8px_rgba(168,85,247,0.35)]"
            >
              <span className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-blue-400 to-indigo-500 opacity-80" />
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
