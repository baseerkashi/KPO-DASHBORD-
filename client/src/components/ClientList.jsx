import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchClients, createClient, api } from "../api";
import { Users, Plus, Loader2, Building, Sparkles, Download } from "lucide-react";

export default function ClientList() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newIndustry, setNewIndustry] = useState("");
  const [creating, setCreating] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const data = await fetchClients();
      setClients(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newCompanyName) return;
    setCreating(true);
    try {
      await createClient(newCompanyName, newIndustry);
      setShowForm(false);
      setNewCompanyName("");
      setNewIndustry("");
      loadClients();
    } catch (e) {
      console.error(e);
      if (e.response?.status === 403) {
        alert("You have reached your plan's client limit! Please upgrade to Pro to add more.");
      } else {
        alert("An error occurred while creating the client.");
      }
    } finally {
      setCreating(false);
    }
  };

  const seedDemo = async () => {
    setSeeding(true);
    try {
      await api.post("/seed-demo");
      loadClients();
    } catch (e) {
      console.error(e);
    } finally {
      setSeeding(false);
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

  if (loading) {
    return <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin text-black dark:text-white" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Client Database</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 rounded-lg border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 transition-all hover:bg-slate-100 dark:hover:bg-white/10"
          >
            <Download className="h-4 w-4" />
            Template
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            <Plus className="h-4 w-4" />
            New Client
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="glass-panel p-5 animate-in fade-in slide-in-from-top-4">
          <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Create New Client</h2>
          <div className="flex gap-4 flex-wrap">
            <input
              type="text"
              placeholder="Company Name"
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              className="flex-1 min-w-[200px] rounded-lg border border-black/10 bg-white/50 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
              required
            />
            <select
              value={newIndustry}
              onChange={(e) => setNewIndustry(e.target.value)}
              className="flex-1 min-w-[200px] rounded-lg border border-black/10 bg-white/50 px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900 dark:text-white"
            >
              <option value="">Select Industry</option>
              <option value="retail">Retail / E-Commerce</option>
              <option value="saas">SaaS / Technology</option>
              <option value="manufacturing">Manufacturing</option>
              <option value="services">Professional Services</option>
              <option value="restaurant">Restaurant / Food Service</option>
              <option value="healthcare">Healthcare / Medical</option>
              <option value="construction">Construction / Real Estate</option>
              <option value="agriculture">Agriculture / Agri-Business</option>
              <option value="logistics">Logistics / Transportation</option>
              <option value="education">Education / EdTech</option>
              <option value="fintech">FinTech / Financial Services</option>
              <option value="textiles">Textiles / Apparel</option>
              <option value="energy">Energy / Utilities</option>
              <option value="media">Media / Entertainment</option>
            </select>
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Save Client"}
            </button>
          </div>
        </form>
      )}

      {clients.length === 0 ? (
        <div className="glass-panel border-black/10 dark:border-white/10 p-16 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-600" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">No clients found</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 mb-6">Add a client to start analyzing financials, or load demo data.</p>
          <button
            onClick={seedDemo}
            disabled={seeding}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-600 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {seeding ? "Loading Demo..." : "Load Demo Data"}
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map(client => (
            <Link key={client.id} to={`/clients/${client.id}`} className="glass-panel glass-panel-hover p-5 block group">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg">{client.company_name}</h3>
                  {client.industry && <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">{client.industry}</p>}
                </div>
                <Building className="h-5 w-5 text-slate-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">
                Added {new Date(client.created_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
