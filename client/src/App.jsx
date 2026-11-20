import { useEffect, useState, lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login.jsx";
import Signup from "./components/Signup.jsx";
import Layout from "./components/Layout.jsx";
import ClientList from "./components/ClientList.jsx";
import ClientDetail from "./components/ClientDetail.jsx";
import AnalysisDashboard from "./components/AnalysisDashboard.jsx";
import { fetchMe } from "./api.js";

const LandingPage = lazy(() => import("./components/LandingPage.jsx"));

function ProtectedRoute({ children }) {
  const [authStatus, setAuthStatus] = useState(() => {
    return sessionStorage.getItem("vertex_authenticated") ? "authenticated" : "checking";
  });

  useEffect(() => {
    let isMounted = true;
    fetchMe()
      .then(() => {
        if (isMounted) {
          sessionStorage.setItem("vertex_authenticated", "true");
          setAuthStatus("authenticated");
        }
      })
      .catch(() => {
        if (isMounted) {
          sessionStorage.removeItem("vertex_authenticated");
          sessionStorage.removeItem("vertex_jwt");
          setAuthStatus("unauthenticated");
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  if (authStatus === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <div className="text-sm font-medium text-slate-400">Verifying session...</div>
      </div>
    );
  }

  return authStatus === "authenticated" ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("app-theme") || "system");

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
    localStorage.setItem("app-theme", theme);
  }, [theme]);

  // System theme listener
  useEffect(() => {
    if (theme !== "system") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const root = window.document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(mediaQuery.matches ? "dark" : "light");
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={
        <Suspense fallback={<div style={{background:"#05050a",minHeight:"100vh"}} />}>
          <LandingPage />
        </Suspense>
      } />
      <Route path="/login" element={<Login theme={theme} />} />
      <Route path="/signup" element={<Signup theme={theme} />} />
      
      {/* Protected routes */}
      <Route element={<ProtectedRoute><Layout theme={theme} setTheme={setTheme} /></ProtectedRoute>}>
        <Route path="/clients" element={<ClientList />} />
        <Route path="/clients/:id" element={<ClientDetail />} />
        <Route path="/analyses/:id" element={<AnalysisDashboard />} />
      </Route>
    </Routes>
  );
}
