import { Activity, Wifi } from "lucide-react";

export default function TopBar({ title, subtitle, apiOnline, hasData }) {
  return (
    <header className="glass-panel flex flex-shrink-0 flex-wrap items-center justify-between gap-4 border-cyan-500/20 px-5 py-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">
          <span className="bg-gradient-to-r from-cyan-300 via-violet-300 to-blue-400 bg-clip-text text-transparent">
            {title}
          </span>
        </h1>
        <p className="mt-0.5 max-w-2xl text-sm text-slate-400">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
            apiOnline
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : "border-amber-500/40 bg-amber-500/10 text-amber-200"
          }`}
        >
          <Wifi className="h-3.5 w-3.5" aria-hidden />
          {apiOnline ? "API online" : "Check API"}
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-200 sm:flex">
          <Activity className="h-3.5 w-3.5 text-violet-400" aria-hidden />
          {hasData ? "Dataset loaded" : "Awaiting CSV"}
        </div>
      </div>
    </header>
  );
}
