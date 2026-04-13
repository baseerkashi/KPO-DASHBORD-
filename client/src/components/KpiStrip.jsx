import { TrendingUp, TrendingDown, Wallet, PieChart, Percent, Gauge, Timer, Coins, Scale } from "lucide-react";

function formatMoney(n) {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

const cardBase =
  "glass-panel glass-panel-hover group relative overflow-hidden rounded-2xl border p-4 transition-all duration-300";

export default function KpiStrip({ financials, risk }) {
  if (!financials) return null;
  const f = financials;
  const growthPositive = f.averageMonthlyGrowthRate >= 0;

  const items = [
    {
      label: "Total Revenue",
      value: `$${formatMoney(f.totalRevenue)}`,
      icon: Wallet,
      accent: "from-zinc-500/20 to-transparent",
      glow: "shadow-[0_0_30px_-8px_rgba(34,211,238,0.35)]",
    },
    {
      label: "Net profit",
      value: `$${formatMoney(f.netProfit)}`,
      icon: TrendingUp,
      accent: "from-emerald-500/15 to-transparent",
      glow: "shadow-[0_0_30px_-8px_rgba(52,211,153,0.25)]",
    },
    {
      label: "Profit margin",
      value: `${f.profitMargin}%`,
      icon: Percent,
      accent: "from-zinc-500/20 to-transparent",
      glow: "shadow-[0_0_30px_-8px_rgba(0,0,0,0.1)] dark:shadow-[0_0_30px_-8px_rgba(255,255,255,0.15)]",
    },
    {
      label: "Avg. growth",
      value: `${f.averageMonthlyGrowthRate}%`,
      icon: growthPositive ? TrendingUp : TrendingDown,
      accent: growthPositive ? "from-zinc-500/15" : "from-rose-500/15",
      glow: growthPositive
        ? "shadow-[0_0_24px_-8px_rgba(34,211,238,0.2)]"
        : "shadow-[0_0_24px_-8px_rgba(244,63,94,0.2)]",
    },
    {
      label: "Risk score",
      value: risk ? `${risk.riskScore}` : "—",
      sub: risk ? risk.riskLevel : null,
      icon: Gauge,
      accent: "from-zinc-500/20 to-transparent",
      glow:
        risk?.riskLevel === "High"
          ? "shadow-[0_0_28px_-6px_rgba(248,113,113,0.35)]"
          : "shadow-[0_0_28px_-6px_rgba(96,165,250,0.25)]",
    },
    {
      label: "Total expenses",
      value: `$${formatMoney(f.totalExpenses)}`,
      icon: PieChart,
      accent: "from-zinc-500/15 to-transparent",
      glow: "shadow-md dark:shadow-[0_0_24px_-8px_rgba(255,255,255,0.1)]",
    },
    {
      label: "Latest Cash",
      value: `$${formatMoney(f.latestCash)}`,
      icon: Coins,
      accent: "from-zinc-500/15 to-transparent",
      glow: "shadow-[0_0_24px_-8px_rgba(34,211,238,0.2)]",
    },
    {
      label: "Runway",
      value: f.runway !== null ? `${f.runway} mo` : "∞ (Sustainable)",
      icon: Timer,
      accent: f.runway && f.runway < 6 ? "from-rose-500/20 to-transparent" : "from-emerald-500/15 to-transparent",
      glow: f.runway && f.runway < 6 ? "shadow-[0_0_24px_-8px_rgba(244,63,94,0.3)]" : "shadow-[0_0_30px_-8px_rgba(52,211,153,0.25)]",
    },
    {
      label: "Burn / mo",
      value: f.burnRate > 0 ? `$${formatMoney(f.burnRate)}` : "Profitable",
      sub: f.burnRate === 0 ? "(No monthly burn)" : null,
      icon: Wallet,
      accent: f.burnRate > 0 ? "from-rose-500/15 to-transparent" : "from-emerald-500/15 to-transparent",
      glow: f.burnRate > 0 ? "shadow-[0_0_24px_-8px_rgba(244,63,94,0.2)]" : "shadow-[0_0_24px_-8px_rgba(52,211,153,0.15)]",
    },
    {
      label: "Debt:Income",
      value: f.periods < 6 ? "Need >6mo" : `${f.debtToIncomeRatio}x`,
      sub: f.periods < 6 ? "(Not enough data)" : null,
      icon: Scale,
      accent: "from-amber-500/15 to-transparent",
      glow: "shadow-[0_0_24px_-8px_rgba(245,158,11,0.2)]",
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 xl:grid-cols-5">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className={`${cardBase} ${item.glow} border-slate-200 dark:border-white/10 hover:-translate-y-0.5`}
          >
            <div
              className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${item.accent} to-transparent opacity-80`}
            />
            <div className="relative flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{item.label}</p>
                <p className="mt-1 font-mono text-lg font-bold tabular-nums text-slate-900 dark:text-white md:text-xl">{item.value}</p>
                {item.sub && (
                  <p
                    className={`mt-1 text-xs font-semibold ${
                      item.sub === "High"
                        ? "text-rose-300"
                        : item.sub === "Medium"
                          ? "text-amber-300"
                          : "text-emerald-300"
                    }`}
                  >
                    {item.sub}
                  </p>
                )}
              </div>
              <Icon className="h-8 w-8 text-zinc-700 dark:text-zinc-300/40 transition-transform duration-300 group-hover:scale-110 group-hover:text-black dark:text-white/70 dark:text-zinc-400/40 dark:group-hover:text-zinc-300/70" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
