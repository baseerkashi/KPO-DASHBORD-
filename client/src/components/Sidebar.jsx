import { LayoutDashboard, LineChart, ShieldAlert, Sparkles, SlidersHorizontal } from "lucide-react";

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
      className="glass-panel flex h-full w-[220px] flex-shrink-0 flex-col border-r border-cyan-500/15 bg-slate-950/40 py-6 pl-4 pr-3"
      aria-label="Main navigation"
    >
      <div className="mb-8 px-2">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/30 to-violet-600/40 text-lg font-black text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.25)]">
            K
          </div>
          <div>
            <p className="text-sm font-bold tracking-wide text-white">KPO Intel</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-400/80">MSE · AI</p>
          </div>
        </div>
      </div>
      <ul className="flex flex-1 flex-col gap-1">
        {sections.map((s) => {
          const Icon = ICONS[s.id] || LayoutDashboard;
          const isActive = active === s.id;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-cyan-500/20 to-violet-600/20 text-cyan-100 shadow-[inset_0_0_20px_rgba(34,211,238,0.12)]"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                <Icon
                  className={`h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-110 ${
                    isActive ? "text-cyan-300" : "text-slate-500 group-hover:text-cyan-400/80"
                  }`}
                  aria-hidden
                />
                <span>{s.label}</span>
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" aria-hidden />
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-auto px-2 pt-4 text-[10px] leading-relaxed text-slate-600">
        Neural analytics layer · v1
      </p>
    </nav>
  );
}
