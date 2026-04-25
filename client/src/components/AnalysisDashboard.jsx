import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchAnalysis, fetchInsights } from "../api";
import Overview from "./Overview";
import ScenarioSimulation from "./ScenarioSimulation";
import ZScoreGauge from "./ZScoreGauge";
import DuPontChart from "./DuPontChart";
import BenchmarkComparison from "./BenchmarkComparison";
import VarianceTable from "./VarianceTable";
import DataWarnings from "./DataWarnings";
import { ArrowLeft, Loader2, Download, Trash2, FileText } from "lucide-react";
import { api, deleteAnalysis } from "../api";
import { useNavigate } from "react-router-dom";

export default function AnalysisDashboard() {
  const { id } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const navigate = useNavigate();

  useEffect(() => {
    loadAnalysis();
  }, [id]);

  const loadAnalysis = async () => {
    try {
      setLoading(true);
      const data = await fetchAnalysis(id);
      setAnalysis(data);

      if (!data.insights && data.id) {
         generateInsights(data.id);
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = async (analysisId) => {
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const data = await fetchInsights(analysisId);
      setAnalysis(prev => ({ ...prev, insights: data.insights }));
    } catch (e) {
      setInsightsError("Failed to load AI insights. " + (e.response?.data?.error || e.message));
    } finally {
      setInsightsLoading(false);
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

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this analysis?")) {
      try {
        await deleteAnalysis(id);
        navigate(`/clients/${analysis.client_id}`);
      } catch (e) {
        alert("Failed to delete analysis");
      }
    }
  };

  const downloadPDF = async () => {
    try {
      const response = await api.get(`/analyses/${id}/report`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Vertex_Report_${analysis.period_title}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert("PDF generation requires Pro plan or failed.");
    }
  };

  if (loading) {
     return <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (error || !analysis) {
     return <div className="p-10 text-center text-rose-500">{error || "Analysis not found."}</div>;
  }

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "advanced", label: "Advanced Analysis" },
    { id: "simulation", label: "Scenario Planner" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Link to={`/clients/${analysis.client_id || ""}`} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-black dark:text-slate-400 dark:hover:text-white mb-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Client
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
             Analysis: {analysis.period_title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 rounded-lg border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Template
          </button>
          <button
            onClick={downloadPDF}
            className="flex items-center gap-2 rounded-lg border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            Export PDF
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 rounded-lg border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>

      {/* Data Validation Warnings */}
      {analysis.validation && (
        <DataWarnings validation={analysis.validation} />
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === tab.id
                ? "bg-white dark:bg-black text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <Overview 
          hasData={true}
          analysis={analysis}
          rows={analysis.parsed_data}
          insights={analysis.insights || []}
          insightLoading={insightsLoading}
          insightError={insightsError}
          onRefreshInsights={() => generateInsights(analysis.id)}
        />
      )}

      {activeTab === "advanced" && (
        <div className="space-y-6">
          {/* Risk Factor Breakdown */}
          {analysis.risk?.factors && (
            <div className="glass-panel p-5">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Risk Pillar Breakdown</h2>
              <div className="grid gap-6 md:grid-cols-3">
                {[
                  { title: "Profitability", keys: ['Profitability', 'Expense Ratio', 'Growth Sustainability'] },
                  { title: "Growth", keys: ['Growth Trajectory', 'Revenue Volatility', 'Revenue Concentration'] },
                  { title: "Liquidity", keys: ['Liquidity', 'Debt Burden', 'Working Capital', 'Altman Z-Score'] }
                ].map(pillar => {
                  const pillarFactors = analysis.risk.factors.filter(f => pillar.keys.some(k => f.name.includes(k) || k.includes(f.name)));
                  return (
                    <div key={pillar.title} className="space-y-3">
                      <h3 className="text-sm font-bold tracking-wide text-slate-700 dark:text-slate-300 uppercase mb-2 border-b border-black/5 dark:border-white/5 pb-1">
                        {pillar.title}
                      </h3>
                      {pillarFactors.map((f, i) => (
                        <div key={i} className="flex flex-col gap-1 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{f.name}</span>
                            <span className={`text-xs font-mono font-bold ${f.score >= 60 ? "text-rose-500" : f.score >= 35 ? "text-amber-500" : "text-emerald-500"}`}>
                              {f.score}/100
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${f.score >= 60 ? "bg-rose-500" : f.score >= 35 ? "bg-amber-500" : "bg-emerald-500"}`}
                              style={{ width: `${f.score}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{f.detail}</p>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Altman Z-Score */}
            <ZScoreGauge altmanZScore={analysis.advanced?.altmanZScore} />
            
            {/* DuPont Analysis */}
            <DuPontChart duPont={analysis.advanced?.duPont} />
          </div>

          {/* Industry Benchmark */}
          <BenchmarkComparison benchmarkData={analysis.advanced?.benchmark} />

          {/* Variance Analysis */}
          <VarianceTable varianceData={analysis.advanced?.variance} />
        </div>
      )}

      {activeTab === "simulation" && (
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">Interactive Scenario Planner</h2>
          <ScenarioSimulation
            financials={analysis.financials}
            risk={analysis.risk}
            rowsCount={analysis.parsed_data.length}
          />
        </div>
      )}
    </div>
  );
}
