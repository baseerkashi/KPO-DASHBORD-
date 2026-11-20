import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Logo from "./Logo";
import { login, loginDemo, fetchMe } from "../api";
import { ArrowLeft } from "lucide-react";

export default function Login({ theme }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  // Apply theme classes to body for the login screen background 
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  // If already logged in, redirect
  useEffect(() => {
    fetchMe()
      .then(() => navigate("/clients"))
      .catch(() => {});
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(false);
    try {
      await login(username, password);
      sessionStorage.setItem("vertex_authenticated", "true");
      navigate("/clients");
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-enterprise-grid text-black dark:text-white transition-colors duration-300">
      <div className="w-full max-w-[380px] rounded-2xl border border-black/10 bg-white/80 p-8 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-black/80">
        {/* Back to home */}
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors mb-6">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to home
        </Link>

        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 text-black dark:text-white">
            <Logo className="h-12 w-12" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Sign In</h2>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Financial Turnaround Workspace</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
              Username or Email
            </label>
            <input
              type="text"
              autoFocus
              className="w-full rounded-lg border border-black/10 bg-white/50 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition-colors hover:border-black/30 focus:border-black/50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-white/30 dark:focus:border-white/50"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(false); }}
              placeholder="e.g. ben"
            />
          </div>
          
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
              Passcode
            </label>
            <input
              type="password"
              className="w-full rounded-lg border border-black/10 bg-white/50 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition-colors hover:border-black/30 focus:border-black/50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-white/30 dark:focus:border-white/50"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
              placeholder="••••"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
              Access Denied. Invalid credentials.
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-bold tracking-wide text-white shadow-sm transition-all hover:bg-black hover:shadow-md disabled:opacity-50 dark:bg-zinc-100 dark:text-black dark:hover:bg-white"
          >
            {loading ? "Authenticating..." : "Sign In"}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200 dark:border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white/90 dark:bg-zinc-950 px-2 text-slate-400">Or</span>
          </div>
        </div>

        <button
          type="button"
          onClick={async () => {
            setLoading(true);
            setError(false);
            try {
              await loginDemo();
              sessionStorage.setItem("vertex_authenticated", "true");
              navigate("/clients");
            } catch {
              setError(true);
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
        >
          Try Demo Workspace
        </button>
      </div>
    </div>
  );
}
