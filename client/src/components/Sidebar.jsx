import { LayoutDashboard, LineChart, ShieldAlert, Sparkles, SlidersHorizontal } from "lucide-react";
import Logo from "./Logo";

const ICONS = {
  overview: LayoutDashboard,
  financial: LineChart,
  risk: ShieldAlert,
  simulation: SlidersHorizontal,
  ai: Sparkles,
};

export default function Sidebar({ sections, active, onSelect }) {
  return (
    <nav
      className="flex h-full w-[240px] flex-shrink-0 flex-col border-r border-slate-800 bg-slate-900/40 py-6 pl-4 pr-3"
      aria-label="Main navigation"
    >
      <div className="mb-8 px-3">
        <div className="flex items-center gap-3">
          <div className="text-blue-500">
            <Logo className="h-8 w-8" />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight text-white">Vertex</p>
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
                    ? "bg-blue-600/10 text-blue-400"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                }`}
              >
                <Icon
                  className={`h-5 w-5 flex-shrink-0 transition-transform ${
                    isActive ? "text-blue-500" : "text-slate-500 group-hover:text-slate-400"
                  }`}
                  aria-hidden
                />
                <span>{s.label}</span>
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-500" aria-hidden />
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto px-3 border-t border-slate-800 pt-4">
        <p className="text-xs font-medium text-slate-500">Platform v2</p>
      </div>
    </nav>
  );
}
