import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { fetchClientAnalyses, uploadAndAnalyzeCsv, api, deleteClient } from "../api";
import FileUpload from "./FileUpload";
import { ArrowLeft, FileText, Loader2, Calendar, Download, Building, Trash2 } from "lucide-react";

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [periodTitle, setPeriodTitle] = useState("");

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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFile = async (file) => {
    if (!periodTitle) {
      alert("Please enter a period title before uploading (e.g. Q3 2024)");
      return;
    }
    setUploading(true);
    try {
      const res = await uploadAndAnalyzeCsv(file, id, periodTitle);
      if (res.id) {
        navigate(`/analyses/${res.id}`);
      }
    } catch (e) {
      alert("Upload failed: " + (e.response?.data?.error || e.message));
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
    if (confirm("Are you sure you want to delete this client and all their analyses? This cannot be undone.")) {
      try {
        await deleteClient(id);
        navigate("/clients");
      } catch (e) {
        alert("Failed to delete client");
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/clients" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-black dark:text-slate-400 dark:hover:text-white mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to Clients
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {client?.company_name || "Client Portfolio"}
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
            Delete Client
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
                onChange={(e) => setPeriodTitle(e.target.value)}
                className="w-full rounded-lg border border-black/10 bg-white/50 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white focus:border-black/30 dark:focus:border-white/30 outline-none transition-colors"
                disabled={uploading}
              />
            </div>
            
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
    </div>
  );
}
