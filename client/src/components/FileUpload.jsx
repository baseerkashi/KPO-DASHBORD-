import { Upload, Loader2 } from "lucide-react";

export default function FileUpload({ onFile, loading, disabled }) {
  return (
    <div className="glass-panel-hover glass-panel relative overflow-hidden border-blue-500/25 p-5">
      <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-indigo-600/20 blur-3xl" />
      <label className="relative flex cursor-pointer flex-col gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-white">
          <Upload className="h-5 w-5 text-blue-400" />
          Ingest financial CSV
        </span>
        <span className="text-xs text-slate-500">
          Required: period + sales/revenue + expenses. Optional categories, workforce, liabilities.
        </span>
        <input
          type="file"
          accept=".csv,text/csv"
          disabled={disabled}
          className="mt-2 block w-full cursor-pointer rounded-lg border border-dashed border-blue-500/30 bg-slate-950/50 px-3 py-3 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-blue-500/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-100 hover:border-blue-400/50"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      </label>
      {loading && (
        <p className="mt-3 flex items-center gap-2 text-sm text-blue-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          Parsing & analyzing…
        </p>
      )}
    </div>
  );
}
