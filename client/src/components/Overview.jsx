import { useState, useRef } from "react";
import { Cpu, Download, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
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
  
  const reportRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  const generatePDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      // Force light theme styles just for the canvas so printer looks perfect
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save("Vertex_Financial_Strategy_Report.pdf");
    } catch (e) {
      console.error("PDF Export failed:", e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      {!hasData && (
        <div className="glass-panel border-black/10 dark:border-white/10 p-8 text-center">
          <Cpu className="mx-auto mb-4 h-12 w-12 text-zinc-700 dark:text-zinc-300/60 dark:text-white" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Initialize your dataset</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500 dark:text-slate-400">
            Upload a CSV / Excel with <span className="text-black dark:text-white">month</span>,{" "}
            <span className="text-black dark:text-white">sales</span> (or revenue), and{" "}
            <span className="text-black dark:text-white">expenses</span>. Add category columns for richer cost charts.
          </p>
        </div>
      )}

      {hasData && f && r && (
        <>
          <div className="flex items-center justify-between mb-3 mt-2">
            <h2 className="flex-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent to-zinc-500/30" />
              Command center
              <span className="h-px flex-1 bg-gradient-to-l from-transparent to-zinc-500/30" />
            </h2>
            <button
              onClick={generatePDF}
              disabled={isExporting}
              className="ml-4 flex items-center gap-2 rounded-lg bg-black px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {isExporting ? "Exporting..." : "Export Report"}
            </button>
          </div>
          
          <div ref={reportRef} className="space-y-5">
            <div>
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
          </div>
        </>
      )}
    </div>
  );
}
