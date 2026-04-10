import { Activity, Wifi } from "lucide-react";

export default function TopBar({ title, subtitle, apiOnline, hasData }) {
  return (
    <header className="glass-panel flex flex-shrink-0 flex-wrap items-center justify-between gap-4 border-b border-t-0 border-l-0 border-r-0 border-slate-800 rounded-none bg-slate-900/50 px-6 py-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-100 md:text-2xl">
          {title}
        </h1>
        <p className="mt-0.5 max-w-2xl text-sm text-slate-400">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-medium ${
            apiOnline
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
              : "border-amber-500/20 bg-amber-500/10 text-amber-400"
          }`}
        >
          <Wifi className="h-3.5 w-3.5" aria-hidden />
          {apiOnline ? "API online" : "Check API"}
        </div>
        <div className="hidden items-center gap-2 rounded-md border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs text-blue-300 sm:flex">
          <Activity className="h-3.5 w-3.5 text-blue-400" aria-hidden />
          {hasData ? "Dataset loaded" : "Awaiting CSV"}
        </div>
      </div>
    </header>
  );
}
