import { useState, useEffect } from "react";
import Logo from "./Logo";

export default function Login({ onLogin, theme }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.toLowerCase() === "ben" && password === "1234") {
      onLogin(true);
    } else {
      setError(true);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-enterprise-grid text-black dark:text-white transition-colors duration-300">
      <div className="w-full max-w-[360px] rounded-2xl border border-black/10 bg-white/80 p-8 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-black/80">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 text-black dark:text-white">
            <Logo className="h-12 w-12" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Sign In</h2>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Vertex KPO Employee Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
              Employee Username
            </label>
            <input
              type="text"
              autoFocus
              className="w-full rounded-lg border border-black/10 bg-white/50 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition-colors hover:border-black/30 focus:border-black/50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-white/30 dark:focus:border-white/50"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(false); }}
              placeholder="e.g. Ben"
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
            className="mt-2 w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-bold tracking-wide text-white shadow-sm transition-all hover:bg-black hover:shadow-md dark:bg-zinc-100 dark:text-black dark:hover:bg-white"
          >
            Authenticate
          </button>
        </form>
      </div>
    </div>
  );
}
