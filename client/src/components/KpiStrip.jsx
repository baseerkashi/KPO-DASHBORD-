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
      accent: "from-slate-500/10 to-transparent",
      glow: "shadow-sm",
    },
    {
      label: "Net profit",
      value: `$${formatMoney(f.netProfit)}`,
      icon: TrendingUp,
      accent: "from-emerald-500/10 to-transparent",
      glow: "shadow-sm",
    },
    {
      label: "Profit margin",
      value: `${f.profitMargin}%`,
      icon: Percent,
      accent: "from-slate-500/10 to-transparent",
      glow: "shadow-sm",
    },
    {
      label: "Avg. growth",
      value: `${f.averageMonthlyGrowthRate}%`,
      icon: growthPositive ? TrendingUp : TrendingDown,
      accent: growthPositive ? "from-emerald-500/10" : "from-rose-500/10",
      glow: "shadow-sm",
    },
    {
      label: "Risk score",
      value: risk ? `${risk.riskScore}` : "—",
      sub: risk ? risk.riskLevel : null,
      icon: Gauge,
      accent: "from-slate-500/10 to-transparent",
      glow: "shadow-sm",
    },
    {
      label: "Total expenses",
      value: `$${formatMoney(f.totalExpenses)}`,
      icon: PieChart,
      accent: "from-slate-500/10 to-transparent",
      glow: "shadow-sm",
    },
    {
      label: "Latest Cash",
      value: `$${formatMoney(f.latestCash)}`,
      icon: Coins,
      accent: "from-emerald-500/10 to-transparent",
      glow: "shadow-sm",
    },
    {
      label: "Runway",
      value: f.runway !== null ? `${f.runway} mo` : "∞ (Sustainable)",
      icon: Timer,
      accent: f.runway && f.runway < 6 ? "from-rose-500/15 to-transparent" : "from-emerald-500/10 to-transparent",
      glow: "shadow-sm",
    },
    {
      label: "Burn / mo",
      value: f.burnRate > 0 ? `$${formatMoney(f.burnRate)}` : "Profitable",
      sub: f.burnRate === 0 ? "(No monthly burn)" : null,
      icon: Wallet,
      accent: f.burnRate > 0 ? "from-rose-500/15 to-transparent" : "from-emerald-500/10 to-transparent",
      glow: "shadow-sm",
    },
    {
      label: "Debt:Income",
      value: f.periods < 6 ? "Need >6mo" : `${f.debtToIncomeRatio}x`,
      sub: f.periods < 6 ? "(Not enough data)" : null,
      icon: Scale,
      accent: "from-amber-500/10 to-transparent",
      glow: "shadow-sm",
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
