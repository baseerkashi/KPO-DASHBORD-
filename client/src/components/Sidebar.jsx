import { LayoutDashboard, LineChart, ShieldAlert, Sparkles, SlidersHorizontal, LogOut } from "lucide-react";
import Logo from "./Logo";

const ICONS = {
  overview: LayoutDashboard,
  financial: LineChart,
  risk: ShieldAlert,
  simulation: SlidersHorizontal,
  ai: Sparkles,
};

export default function Sidebar({ sections, active, onSelect, onLogout }) {
  return (
    <nav
      className="flex h-full w-[240px] flex-shrink-0 flex-col border-r border-slate-200 bg-white/70 dark:border-white/10 dark:bg-black/60 py-6 pl-4 pr-3 transition-colors"
      aria-label="Main navigation"
    >
      <div className="mb-8 px-3">
        <div className="flex items-center gap-3">
          <div className="text-black dark:text-white">
            <Logo className="h-8 w-8" />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Vertex</p>
          </div>
        </div>
      </div>
      <ul className="flex flex-1 flex-col gap-1.5 px-1">
        {sections.map((s) => {
          const Icon = ICONS[s.id] || LayoutDashboard;
          const isActive = active === s.id;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? "bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white font-bold"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200"
                }`}
              >
                <Icon
                  className={`h-5 w-5 flex-shrink-0 transition-transform ${
                    isActive ? "text-black dark:text-white" : "text-slate-400 group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-slate-400"
                  }`}
                  aria-hidden
                />
                <span>{s.label}</span>
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-black dark:bg-white" aria-hidden />
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto px-3 border-t border-slate-200 dark:border-white/10 pt-4 pb-2">
        <button 
          onClick={onLogout}
          className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 mt-2 text-left text-sm font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Secure Logout
        </button>
      </div>
    </nav>
  );
}
