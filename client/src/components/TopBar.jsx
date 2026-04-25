import { Activity, Wifi } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

export default function TopBar({ title, subtitle, apiOnline, hasData, theme, setTheme }) {
  return (
    <header className="glass-panel flex flex-shrink-0 flex-wrap items-center justify-between gap-4 border-b border-t-0 border-l-0 border-r-0 border-black/10 dark:border-white/10 rounded-none bg-white/50 dark:bg-black/60 px-6 py-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 md:text-2xl">
          {title}
        </h1>
        <p className="mt-0.5 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle theme={theme} setTheme={setTheme} />
        <div
          className={`flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-medium ${
            apiOnline
              ? "border-emerald-500/20 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
              : "border-amber-500/20 bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
          }`}
        >
          <Wifi className="h-3.5 w-3.5" aria-hidden />
          {apiOnline ? "API online" : "Check API"}
        </div>
        <div className="hidden items-center gap-2 rounded-md border border-black/10 dark:border-white/10 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-xs text-zinc-900 dark:text-zinc-100 sm:flex">
          <Activity className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-300 dark:text-white" aria-hidden />
          {hasData ? "Dataset loaded" : "Awaiting CSV"}
        </div>
      </div>
    </header>
  );
}
