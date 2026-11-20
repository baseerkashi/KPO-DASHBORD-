import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { fetchClientAnalyses, compareClientAnalyses, uploadAndAnalyzeCsv, api, deleteClient } from "../api";
import FileUpload from "./FileUpload";
import { 
  ArrowLeft, FileText, Loader2, Calendar, Download, Building, Trash2, 
  TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight, CheckCircle 
} from "lucide-react";

function formatMoney(n) {
  if (n === null || n === undefined || isNaN(n)) return "$0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [periodTitle, setPeriodTitle] = useState("");
  const [uploadError, setUploadError] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [comparingLoading, setComparingLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [clientData, analysesData] = await Promise.all([
        api.get(`/clients/${id}`).then(r => r.data).catch(() => null),
        fetchClientAnalyses(id),
      ]);
      setClient(clientData);
      setAnalyses(analysesData);
      if (analysesData && analysesData.length >= 2) {
        loadComparison(analysesData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadComparison = async (analysesList) => {
    try {
      setComparingLoading(true);
      // Sort chronologically (oldest to newest) for period-over-period trend
      const ids = [...analysesList].reverse().map(a => a.id);
      const data = await compareClientAnalyses(id, ids);
      setComparison(data);
    } catch (err) {
      console.error("Comparison load error:", err);
    } finally {
      setComparingLoading(false);
    }
  };

  const handleFile = async (file) => {
    setUploadError(null);
    if (!periodTitle.trim()) {
      setUploadError("Please enter a period title before uploading (e.g. Q3 2024).");
      return;
    }
    setUploading(true);
    try {
      const res = await uploadAndAnalyzeCsv(file, id, periodTitle);
      if (res.id) {
        navigate(`/analyses/${res.id}`, { state: { openInterview: true } });
      }
    } catch (e) {
      const errorMsg = e.response?.data?.error || e.message || "Failed to parse CSV file. Ensure valid date, revenue, and expense columns.";
      setUploadError(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await api.get("/template", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "Vertex_Template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Template download failed:", e);
    }
  };

  const handleDeleteClient = async () => {
    if (confirm("Are you sure you want to delete this company and all its turnaround analyses? This cannot be undone.")) {
      try {
        await deleteClient(id);
        navigate("/clients");
      } catch (e) {
        alert("Failed to delete company");
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const formatMetricValue = (format, val) => {
    if (val === null || val === undefined) return "—";
    if (format === "currency") return formatMoney(val);
    if (format === "percent") return `${val > 0 ? "+" : ""}${val}%`;
    if (format === "runway") {
      if (val === null || val <= 0) {
        return <span className="font-semibold text-emerald-600 dark:text-emerald-400">Sustainable</span>;
      }
      return `${val} mo`;
    }
    if (format === "score") return `${val}/100`;
    if (format === "ratio") return `${val}x`;
    return String(val);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link to="/clients" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-black dark:text-slate-400 dark:hover:text-white mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to Companies
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {client?.company_name || "Company Workspace"}
            </h1>
            {client?.industry && (
              <span className="text-xs uppercase tracking-wider text-slate-500 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10">
                {client.industry}
              </span>
            )}
          </div>
          <button
            onClick={handleDeleteClient}
            className="flex items-center gap-2 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-900/20 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Company
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* New Analysis Panel */}
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Run New Analysis</h2>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Template
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Period Title</label>
              <input
                type="text"
                placeholder="e.g. Q4 2024 Financials"
                value={periodTitle}
                onChange={(e) => {
                  setPeriodTitle(e.target.value);
                  if (uploadError) setUploadError(null);
                }}
                className="w-full rounded-lg border border-black/10 bg-white/50 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white focus:border-black/30 dark:focus:border-white/30 outline-none transition-colors"
                disabled={uploading}
              />
            </div>

            {uploadError && (
              <div className="rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/30 p-4 text-xs text-rose-950 dark:text-rose-200">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1.5 flex-1">
                    <h4 className="font-bold text-sm text-rose-900 dark:text-rose-300">CSV Parsing or Validation Failed</h4>
                    <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">{uploadError}</p>
                    <div className="pt-2 flex items-center gap-4">
                      <button
                        type="button"
                        onClick={downloadTemplate}
                        className="inline-flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-300 underline hover:text-rose-900 dark:hover:text-white"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download Verified Sample Template
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadError(null)}
                        className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className={!periodTitle ? "opacity-50 pointer-events-none" : ""}>
               <FileUpload onFile={handleFile} loading={uploading} disabled={uploading || !periodTitle} />
            </div>
            {!periodTitle && (
              <p className="text-xs text-rose-500 text-center">Please enter a period title to enable upload.</p>
            )}

            {client?.industry && (
              <div className="flex items-center gap-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-3 py-2">
                <Building className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                <span className="text-xs text-indigo-700 dark:text-indigo-300">
                  Analysis will be benchmarked against <strong>{client.industry}</strong> industry medians
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Historical Analyses */}
        <div className="glass-panel p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Assessment History</h2>
          
          {analyses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
              <FileText className="mx-auto mb-2 h-8 w-8 text-slate-400" />
              <p className="text-sm text-slate-500">No previous analyses found.</p>
              <p className="text-xs text-slate-400 mt-1">Upload a CSV or Excel file to run your first analysis.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {analyses.map(an => (
                <Link key={an.id} to={`/analyses/${an.id}`} className="block group">
                  <div className="rounded-lg border border-black/10 dark:border-white/10 bg-white/50 dark:bg-white/5 p-4 transition-all group-hover:border-black/30 dark:group-hover:border-white/30 group-hover:bg-white dark:group-hover:bg-zinc-800">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        {an.period_title}
                      </div>
                      <span className="text-xs text-slate-500">
                        {new Date(an.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Period-over-Period Trend Table (shown when 2 or more analyses exist) */}
      {analyses.length >= 2 && (
        <div className="glass-panel p-6 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Period-over-Period Trend
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tracking Revenue, Expenses, Net Profit, and Runway evolution across assessments
              </p>
            </div>
            {comparingLoading && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Updating trend data...
              </div>
            )}
          </div>

          {comparison?.comparison ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-black/10 dark:border-white/10 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3 pr-4">Metric</th>
                    {comparison.analyses?.map((a) => (
                      <th key={a.id} className="py-3 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {a.period}
                      </th>
                    ))}
                    <th className="py-3 pl-4 text-right">Period Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5 font-mono">
                  {comparison.comparison.map((row, idx) => {
                    const isKeyMetric = ["Total Revenue", "Total Expenses", "Net Profit", "Runway"].includes(row.metric);
                    const isExpenseOrBurn = ["Total Expenses", "Monthly Burn", "Risk Score"].includes(row.metric);
                    const isPositiveVariance = row.variance?.absolute > 0;
                    const isFavorable = isExpenseOrBurn ? !isPositiveVariance : isPositiveVariance;
                    const varianceAbs = row.variance?.absolute;
                    const variancePct = row.variance?.percent;

                    return (
                      <tr 
                        key={idx} 
                        className={`transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.02] ${
                          isKeyMetric ? "font-bold bg-slate-50/50 dark:bg-white/[0.01]" : ""
                        }`}
                      >
                        <td className="py-3 pr-4 font-sans font-medium text-slate-900 dark:text-white flex items-center gap-2">
                          {row.metric}
                          {isKeyMetric && (
                            <span className="rounded bg-indigo-500/10 px-1.5 py-0.2 text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                              Core
                            </span>
                          )}
                        </td>
                        {row.values.map((v, vIdx) => (
                          <td key={vIdx} className="py-3 px-4 text-slate-700 dark:text-slate-300">
                            {formatMetricValue(row.format, v.value)}
                          </td>
                        ))}
                        <td className="py-3 pl-4 text-right">
                          {row.format === "runway" ? (
                            <span className="text-xs font-sans text-slate-500 dark:text-slate-400">
                              {varianceAbs !== 0 ? `${varianceAbs > 0 ? "+" : ""}${varianceAbs} mo` : "Stable"}
                            </span>
                          ) : (
                            <div className="inline-flex items-center gap-1">
                              {varianceAbs !== 0 ? (
                                <>
                                  {isPositiveVariance ? (
                                    <ArrowUpRight className={`h-4 w-4 ${isFavorable ? "text-emerald-500" : "text-rose-500"}`} />
                                  ) : (
                                    <ArrowDownRight className={`h-4 w-4 ${isFavorable ? "text-emerald-500" : "text-rose-500"}`} />
                                  )}
                                  <span className={`text-xs font-semibold ${isFavorable ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                    {row.format === "currency" ? formatMoney(varianceAbs) : `${varianceAbs > 0 ? "+" : ""}${varianceAbs}`}
                                    {variancePct !== 0 && ` (${variancePct > 0 ? "+" : ""}${variancePct}%)`}
                                  </span>
                                </>
                              ) : (
                                <span className="text-xs text-slate-400 font-sans">No change</span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              {comparingLoading ? "Calculating multi-period financial variances..." : "No comparison data available."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
