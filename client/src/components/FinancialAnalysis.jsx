import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";
import { BarChart3 } from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const NEON = {
  bar: "rgba(34, 211, 238, 0.65)",
  barBorder: "rgba(34, 211, 238, 0.95)",
  pie: ["#22d3ee", "#a855f7", "#60a5fa", "#34d399", "#f472b6", "#818cf8", "#2dd4bf"],
};

const chartText = "#e2e8f0";
const chartGrid = "rgba(148, 163, 184, 0.12)";

export default function FinancialAnalysis({ financials, className = "", hideMiniStats = false }) {
  const { salesTrend, costBreakdown, monthlyGrowth, totalRevenue, totalExpenses, netProfit, profitMargin, averageMonthlyGrowthRate } =
    financials;

  const barData = {
    labels: salesTrend.map((x) => x.month),
    datasets: [
      {
        label: "Sales",
        data: salesTrend.map((x) => x.sales),
        backgroundColor: NEON.bar,
        borderColor: NEON.barBorder,
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: chartText, font: { size: 11 } } },
      title: { display: true, text: "Sales pulse", color: chartText, font: { size: 14, weight: "600" } },
    },
    scales: {
      x: { ticks: { color: "#94a3b8" }, grid: { color: chartGrid } },
      y: { ticks: { color: "#94a3b8" }, grid: { color: chartGrid } },
    },
  };

  const pieData = {
    labels: costBreakdown.map((x) => x.label),
    datasets: [
      {
        data: costBreakdown.map((x) => x.value),
        backgroundColor: costBreakdown.map((_, i) => NEON.pie[i % NEON.pie.length]),
        borderWidth: 2,
        borderColor: "rgba(15, 23, 42, 0.9)",
        hoverOffset: 8,
      },
    ],
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "right", labels: { color: chartText, boxWidth: 10, font: { size: 10 } } },
      title: { display: true, text: "Cost spectrum", color: chartText, font: { size: 14, weight: "600" } },
    },
  };

  return (
    <section className={`glass-panel border-slate-200 dark:border-white/10 p-5 ${className}`}>
      <div className="mb-4 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-black dark:text-white" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Financial analysis</h2>
        <span className="ml-auto hidden rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-2 py-0.5 font-mono text-[10px] text-slate-600 dark:text-slate-400 sm:inline">
          Margin {profitMargin}% · Growth {averageMonthlyGrowthRate}%
        </span>
      </div>

      {!hideMiniStats && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="Revenue" value={fmt(totalRevenue)} tone="cyan" />
          <MiniStat label="Expenses" value={fmt(totalExpenses)} tone="violet" />
          <MiniStat label="Net profit" value={fmt(netProfit)} tone="emerald" />
          <MiniStat label="Avg. MoM" value={`${averageMonthlyGrowthRate}%`} tone="zinc" />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-panel-hover min-h-[280px] rounded-xl border border-slate-200 dark:border-white/5 bg-white/50 dark:bg-transparent p-3">
          <Bar data={barData} options={barOptions} />
        </div>
        <div className="glass-panel-hover min-h-[280px] rounded-xl border border-slate-200 dark:border-white/5 bg-white/50 dark:bg-transparent p-3">
          <Pie data={pieData} options={pieOptions} />
        </div>
      </div>

      {monthlyGrowth.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Month-over-month growth</h3>
          <div className="flex flex-wrap gap-2">
            {monthlyGrowth.map((g) => (
              <span
                key={g.month}
                className="rounded-full border border-black/10 dark:border-white/10 bg-zinc-100 dark:bg-white/5 px-3 py-1 text-xs text-black dark:text-zinc-300"
              >
                <span className="text-slate-600 dark:text-slate-500">{g.month}</span>{" "}
                <span className="font-mono font-semibold text-black dark:text-white">{g.growthRate}%</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function MiniStat({ label, value, tone }) {
  const tones = {
    cyan: "from-zinc-500/15 border-black/10 dark:border-white/10",
    violet: "from-zinc-500/15 border-black/10 dark:border-white/10",
    emerald: "from-emerald-500/15 border-emerald-500/20",
    zinc: "from-zinc-500/15 border-black/10 dark:border-white/10",
  };
  return (
    <div className={`rounded-xl border bg-gradient-to-br ${tones[tone]} p-3 bg-white/50 dark:bg-transparent`}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400">{label}</p>
      <p className="mt-0.5 font-mono text-base font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function fmt(n) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}
