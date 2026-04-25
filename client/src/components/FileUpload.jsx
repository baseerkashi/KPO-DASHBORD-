import { useCallback } from "react";
import { Upload, Loader2, FileSpreadsheet, Network, Landmark, Calculator } from "lucide-react";
import { useDropzone } from "react-dropzone";

export default function FileUpload({ onFile, loading, disabled }) {
  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles?.length > 0) {
        onFile(acceptedFiles[0]);
      }
    },
    [onFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: false,
    disabled,
  });



  return (
    <div className="space-y-6">
      <div className="glass-panel relative overflow-hidden border-black/10 dark:border-white/10 p-5 mt-4">
        <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-zinc-800 dark:bg-zinc-200 dark:text-black text-white/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-black dark:bg-white dark:text-black text-white/20 blur-3xl" />
        
        <div
          {...getRootProps()}
          className={`relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors ${
            isDragActive
              ? "border-black bg-black/5 dark:border-white dark:bg-white/10"
              : disabled 
              ? "border-slate-200 bg-slate-50 dark:border-white/5 dark:bg-black/20 opacity-50 cursor-not-allowed"
              : "border-black/20 bg-white/50 hover:bg-white hover:border-black/40 dark:border-white/20 dark:bg-slate-950/50 dark:hover:bg-slate-900/80 dark:hover:border-white/40"
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-white/10">
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-slate-800 dark:text-white" />
            ) : isDragActive ? (
              <Upload className="h-6 w-6 text-black dark:text-white animate-bounce" />
            ) : (
              <FileSpreadsheet className="h-6 w-6 text-slate-700 dark:text-slate-300" />
            )}
          </div>
          
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {isDragActive ? "Drop the file here..." : "Drop any financial spreadsheet here"}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              CSV, XLSX, or XLS — messy data is fine, our AI will auto-detect columns
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
