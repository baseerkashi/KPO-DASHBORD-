import { useState } from "react";
import { 
  DollarSign, Users, Building2, SlidersHorizontal, 
  CheckCircle2, ArrowRight, ArrowLeft, X, AlertCircle 
} from "lucide-react";
import { updateInterviewContext } from "../api";

export default function DiagnosticInterview({ 
  analysisId, 
  initialData = {}, 
  latestCash = 0, 
  onComplete, 
  onClose 
}) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    liquidCashNow: initialData.liquidCashNow != null ? initialData.liquidCashNow : (latestCash || 0),
    collectibleOverdueAR: initialData.collectibleOverdueAR || 0,
    monthlyPayroll: initialData.monthlyPayroll || 0,
    nonNegotiablePayrollPct: initialData.nonNegotiablePayrollPct != null ? initialData.nonNegotiablePayrollPct : 75,
    monthlyVendorPayables: initialData.monthlyVendorPayables || 0,
    vendorDeferralLeeway: initialData.vendorDeferralLeeway || "30_days",
    discretionarySpendMonthly: initialData.discretionarySpendMonthly || 0,
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async (dataToSubmit = formData) => {
    setSaving(true);
    setError(null);
    try {
      const res = await updateInterviewContext(analysisId, dataToSubmit);
      if (onComplete) {
        onComplete(res.turnaround, res.interview_context);
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Failed to update triage inputs.");
    } finally {
      setSaving(false);
    }
  };

  const handleSkipDefaults = () => {
    const defaultData = {
      liquidCashNow: Number(latestCash) || 0,
      collectibleOverdueAR: 0,
      monthlyPayroll: 0,
      nonNegotiablePayrollPct: 75,
      monthlyVendorPayables: 0,
      vendorDeferralLeeway: "none",
      discretionarySpendMonthly: 0,
    };
    handleSave(defaultData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Phase 1 Triage
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Step {step} of 4</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              {step === 1 && "Immediate Cash & Overdue Receivables"}
              {step === 2 && "Payroll Commitments & Core Team"}
              {step === 3 && "Vendor Liabilities & Trade AP"}
              {step === 4 && "Discretionary & Non-Essential Spend"}
            </h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="h-1 w-full bg-slate-100 dark:bg-slate-800">
          <div 
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs font-semibold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Verify immediate liquid cash available to fund payroll and critical operations, plus customer invoices you can collect quickly.
              </p>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Liquid Cash in Bank Today ($)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.liquidCashNow}
                    onChange={(e) => handleChange("liquidCashNow", parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 75000"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-400">Pre-filled from latest statement cash balance.</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Collectible Overdue Receivables (AR) ($)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.collectibleOverdueAR}
                    onChange={(e) => handleChange("collectibleOverdueAR", parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 40000"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Total unpaid invoices you can recover within 14 days by offering a 5% prompt-pay discount.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Identify labor commitments and establish what percentage of staff is mission-critical to keep revenue flowing.
              </p>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Total Monthly Payroll ($)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.monthlyPayroll}
                    onChange={(e) => handleChange("monthlyPayroll", parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 55000"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Mission-Critical Staff Floor ({formData.nonNegotiablePayrollPct}%)
                  </label>
                  <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    Negotiable Pool: ${(formData.monthlyPayroll * (1 - formData.nonNegotiablePayrollPct / 100)).toLocaleString()}/mo
                  </span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="100"
                  step="5"
                  value={formData.nonNegotiablePayrollPct}
                  onChange={(e) => handleChange("nonNegotiablePayrollPct", parseInt(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                  <span>Aggressive cuts (40% protected)</span>
                  <span>Balanced (75%)</span>
                  <span>No payroll cuts (100%)</span>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Map accounts payable due this month and evaluate potential vendor payment renegotiation leeway.
              </p>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Monthly Vendor Payables & Trade AP ($)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.monthlyVendorPayables}
                    onChange={(e) => handleChange("monthlyVendorPayables", parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 35000"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Vendor Payment Standstill Leeway
                </label>
                <select
                  value={formData.vendorDeferralLeeway}
                  onChange={(e) => handleChange("vendorDeferralLeeway", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="none">No Deferral (Suppliers demand immediate cash-on-delivery)</option>
                  <option value="30_days">30-Day Moratorium (Can negotiate formal 30-day payment freeze)</option>
                  <option value="60_days">60-Day Restructuring (Can renegotiate debt into extended 60-day workout)</option>
                </select>
                <p className="mt-1 text-xs text-slate-400">
                  Enables modeling trade creditor standstills to protect near-term cash reserves.
                </p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Identify all software subscriptions, marketing spend, and agency retainers that can be immediately paused without breaching customer contracts.
              </p>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Monthly Discretionary Spend ($)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={formData.discretionarySpendMonthly}
                    onChange={(e) => handleChange("discretionarySpendMonthly", parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 8500"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Includes unused software licenses, non-performing ad campaigns, travel, and discretionary consultants.
                </p>
              </div>

              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Deterministic Math Ready</span>
                </div>
                Vertex will automatically map these inputs into actionable levers across Quick Wins, Balanced Recovery, and Maximum Survival playbooks.
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
          <button
            type="button"
            onClick={handleSkipDefaults}
            disabled={saving}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors disabled:opacity-50"
          >
            Skip with Defaults
          </button>

          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Previous
              </button>
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
              >
                Next
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-all disabled:opacity-50"
              >
                {saving ? "Calculating Triage..." : "Save & Calculate Triage"}
                <CheckCircle2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
