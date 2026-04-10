import { Cpu } from "lucide-react";
import KpiStrip from "./KpiStrip.jsx";
import FinancialAnalysis from "./FinancialAnalysis.jsx";
import RiskAssessment from "./RiskAssessment.jsx";
import AIInsights from "./AIInsights.jsx";
import DataTable from "./DataTable.jsx";

export default function Overview({
  hasData,
  analysis,
  rows,
  insights,
  insightLoading,
  insightError,
  onRefreshInsights,
}) {
  const f = analysis?.financials;
  const r = analysis?.risk;

  return (
    <div className="space-y-5">
      {!hasData && (
        <div className="glass-panel border-blue-500/20 p-8 text-center">
          <Cpu className="mx-auto mb-4 h-12 w-12 text-blue-400/60" />
          <h2 className="text-lg font-semibold text-white">Initialize your dataset</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-400">
            Upload a CSV with <span className="text-blue-300">month</span>,{" "}
            <span className="text-blue-300">sales</span> (or revenue), and{" "}
            <span className="text-blue-300">expenses</span>. Add category columns for richer cost charts.
          </p>
        </div>
      )}

      {hasData && f && r && (
        <>
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent to-blue-500/30" />
              Command center
              <span className="h-px flex-1 bg-gradient-to-l from-transparent to-indigo-500/30" />
            </h2>
            <KpiStrip financials={f} risk={r} />
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <div className="space-y-5 xl:col-span-2">
              <FinancialAnalysis financials={f} hideMiniStats />
            </div>
            <div className="space-y-5">
              <RiskAssessment risk={r} />
              <AIInsights
                insights={insights}
                loading={insightLoading}
                error={insightError}
                onRefresh={onRefreshInsights}
              />
            </div>
          </div>

          {rows?.length > 0 && <DataTable rows={rows} />}
        </>
      )}
    </div>
  );
}
