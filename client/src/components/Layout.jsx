import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import TopBar from "./TopBar.jsx";
import { api } from "../api";

const SECTIONS = [
  { id: "dashboard", label: "Client Database", path: "/clients" }
];

export default function Layout({ theme, setTheme }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [apiOnline, setApiOnline] = useState(true);

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

  const handleLogout = () => {
    sessionStorage.removeItem("vertex_jwt");
    navigate("/login");
  };

  const activeSection = location.pathname.includes("/clients") ? "dashboard" : "analysis";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar sections={SECTIONS} active={activeSection} onSelect={(id) => navigate(SECTIONS.find(s => s.id === id)?.path || "/clients")} onLogout={handleLogout} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-white dark:bg-black transition-colors">
        <TopBar
          title="Vertex"
          subtitle="Enterprise financial intelligence and risk assessment platform."
          apiOnline={apiOnline}
          hasData={true}
          theme={theme}
          setTheme={setTheme}
        />
        <div className="bg-enterprise-grid flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6">
            <div className="mx-auto max-w-[1600px]">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
