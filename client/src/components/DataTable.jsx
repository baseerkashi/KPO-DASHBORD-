import { Table2 } from "lucide-react";

export default function DataTable({ rows, className = "" }) {
  if (!rows?.length) return null;
  const keys = Object.keys(rows[0]);
  return (
    <section className={`glass-panel border-white/10 p-5 ${className}`}>
      <div className="mb-4 flex items-center gap-2">
        <Table2 className="h-5 w-5 text-slate-400" />
        <h2 className="text-lg font-semibold text-white">Structured dataset</h2>
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.04]">
              {keys.map((k) => (
                <th key={k} className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-blue-200/80">
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-white/5 transition-colors hover:bg-white/[0.04]">
                {keys.map((k) => (
                  <td key={k} className="max-w-[220px] truncate px-3 py-2 font-mono text-xs text-slate-300">
                    {k === "expenseBreakdown" && r[k] && typeof r[k] === "object"
                      ? JSON.stringify(r[k])
                      : r[k] === null || r[k] === undefined
                        ? "—"
                        : String(r[k])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
