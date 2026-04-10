import { useCallback, useEffect, useRef, useState } from "react";
import { api, uploadCsv, analyzeData, fetchInsights } from "./api";
import Sidebar from "./components/Sidebar.jsx";
import TopBar from "./components/TopBar.jsx";
import FileUpload from "./components/FileUpload.jsx";
import Overview from "./components/Overview.jsx";
import FinancialAnalysis from "./components/FinancialAnalysis.jsx";
import RiskAssessment from "./components/RiskAssessment.jsx";
import AIInsights from "./components/AIInsights.jsx";
import ScenarioSimulation from "./components/ScenarioSimulation.jsx";

const SECTIONS = [
  { id: "overview", label: "Dashboard" },
  { id: "financial", label: "Analytics" },
  { id: "risk", label: "Risk" },
  { id: "simulation", label: "Simulation" },
  { id: "ai", label: "Intelligence" },
];

export default function App() {
  const [section, setSection] = useState("overview");
  const [uploadMeta, setUploadMeta] = useState(null);
  const [rows, setRows] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [insights, setInsights] = useState([]);
  const [insightError, setInsightError] = useState(null);
  const [loading, setLoading] = useState({ upload: false, insights: false });
  const [error, setError] = useState(null);
  const [apiOnline, setApiOnline] = useState(true);

  const insightsAutoDoneRef = useRef(false);

  const hasData = rows.length > 0;

  useEffect(() => {
    let cancelled = false;
    const ping = async () => {
      try {
        await api.get("/health", { timeout: 4000 });
        if (!cancelled) setApiOnline(true);
      } catch {
        if (!cancelled) setApiOnline(false);
      }
    };
    ping();
    const id = setInterval(ping, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const onFile = useCallback(async (file) => {
    setError(null);
    setAnalysis(null);
    setInsights([]);
    setInsightError(null);
    insightsAutoDoneRef.current = false;
    setLoading((l) => ({ ...l, upload: true }));
    try {
      const up = await uploadCsv(file);
      setUploadMeta({ rowCount: up.rowCount, headers: up.headers, columnKeys: up.columnKeys });
      setRows(up.data);
      const an = await analyzeData(up.data);
      setAnalysis(an);
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Upload failed");
      setRows([]);
      setUploadMeta(null);
    } finally {
      setLoading((l) => ({ ...l, upload: false }));
    }
  }, []);

  const loadInsights = useCallback(async () => {
    if (!analysis?.insightContext) return;
    setInsightError(null);
    setLoading((l) => ({ ...l, insights: true }));
    try {
      const res = await fetchInsights(analysis.insightContext);
      if (res.insights?.length) {
        setInsights(res.insights);
        setInsightError(res.error || null);
      } else {
        setInsightError(res.error || "No insights returned.");
        setInsights([]);
      }
    } catch (e) {
      const msg =
        e.response?.data?.error ||
        e.message ||
        (e.code === "ERR_NETWORK"
          ? "Cannot reach API. Start backend: server folder → npm run dev"
          : "Insights failed");
      setInsightError(msg);
      setInsights([]);
    } finally {
      setLoading((l) => ({ ...l, insights: false }));
    }
  }, [analysis]);

  useEffect(() => {
    if (!analysis?.insightContext || insightsAutoDoneRef.current) return;
    if (section !== "overview" && section !== "ai") return;
    insightsAutoDoneRef.current = true;
    loadInsights();
  }, [section, analysis, loadInsights]);

  const title = "Vertex";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar sections={SECTIONS} active={section} onSelect={setSection} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TopBar
          title={title}
          subtitle="Enterprise financial intelligence and risk assessment platform."
          apiOnline={apiOnline}
          hasData={hasData}
        />
        <div className="bg-enterprise-grid flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6">
            {error && (
              <div
                className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
                role="alert"
              >
                {error}
              </div>
            )}

            <div className="mx-auto max-w-[1600px] space-y-5">
              <FileUpload onFile={onFile} loading={loading.upload} disabled={loading.upload} />
              {uploadMeta && (
                <p className="text-center text-xs text-slate-500">
                  Loaded <span className="font-mono text-blue-400">{uploadMeta.rowCount}</span> rows ·{" "}
                  {uploadMeta.headers.join(", ")}
                </p>
              )}

              {section === "overview" && (
                <Overview
                  hasData={hasData}
                  analysis={analysis}
                  rows={rows}
                  insights={insights}
                  insightLoading={loading.insights}
                  insightError={insightError}
                  onRefreshInsights={loadInsights}
                />
              )}

              {hasData && section === "financial" && analysis && (
                <FinancialAnalysis financials={analysis.financials} />
              )}

              {hasData && section === "risk" && analysis && <RiskAssessment risk={analysis.risk} />}

              {hasData && section === "ai" && analysis && (
                <AIInsights
                  insights={insights}
                  loading={loading.insights}
                  error={insightError}
                  onRefresh={loadInsights}
                />
              )}

              {hasData && section === "simulation" && analysis && uploadMeta && (
                <ScenarioSimulation
                  financials={analysis.financials}
                  risk={analysis.risk}
                  rowsCount={uploadMeta.rowCount}
                />
              )}

              {!hasData && section !== "overview" && (
                <div className="glass-panel rounded-2xl border border-dashed border-slate-700/50 p-10 text-center text-slate-500">
                  Upload a CSV on the <span className="text-blue-400">Dashboard</span> to unlock this module.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
