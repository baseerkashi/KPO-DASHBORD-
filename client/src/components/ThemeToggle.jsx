import { Moon, Sun, Laptop } from "lucide-react";

export default function ThemeToggle({ theme, setTheme }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white/50 p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
      <button
        onClick={() => setTheme("light")}
        className={`rounded-md p-1.5 transition-colors ${
          theme === "light"
            ? "bg-white text-black dark:text-white shadow-sm dark:bg-slate-800 dark:text-white"
            : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        }`}
        title="Light Mode"
      >
        <Sun className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={`rounded-md p-1.5 transition-colors ${
          theme === "dark"
            ? "bg-white text-black dark:text-white shadow-sm dark:bg-slate-800 dark:text-white"
            : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        }`}
        title="Dark Mode"
      >
        <Moon className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme("system")}
        className={`rounded-md p-1.5 transition-colors ${
          theme === "system"
            ? "bg-white text-black dark:text-white shadow-sm dark:bg-slate-800 dark:text-white"
            : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        }`}
        title="System Preference"
      >
        <Laptop className="h-4 w-4" />
      </button>
    </div>
  );
}
