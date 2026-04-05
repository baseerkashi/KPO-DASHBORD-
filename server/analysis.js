/**
 * Financial and risk analysis for MSE CSV data.
 * Expects normalized rows: { month, sales, expenses, ...optional breakdowns }
 */

function toNum(v) {
  if (v === undefined || v === null || v === "") return NaN;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

export function normalizeKey(key) {
  return String(key).trim().toLowerCase().replace(/\s+/g, "_");
}

/** Normalize header keys to snake_case-ish keys we use */
export function normalizeRow(raw) {
  const row = {};
  for (const [key, val] of Object.entries(raw)) {
    row[normalizeKey(key)] = val;
  }
  return row;
}

export function detectColumns(headers) {
  const h = headers.map((x) => String(x).trim().toLowerCase().replace(/\s+/g, "_"));
  const find = (aliases) => {
    for (const a of aliases) {
      const i = h.indexOf(a);
      if (i >= 0) return headers[i];
    }
    return null;
  };
  return {
    month: find(["month", "period", "date", "year_month"]),
    sales: find(["sales", "revenue", "turnover", "income"]),
    expenses: find(["expenses", "total_expenses", "costs", "total_cost"]),
    cash: find(["cash", "cash_balance", "liquidity", "bank_balance"]),
    debt: find(["debt", "liabilities", "total_debt", "loans"]),
  };
}

export function parseNumericRows(rows, columnKeys) {
  const { month, sales, expenses } = columnKeys;
  if (!month || !sales || !expenses) {
    return {
      error:
        "CSV must include columns for month/period, sales/revenue, and expenses (detected headers may differ — see README example).",
    };
  }

  const mk = normalizeKey(month);
  const sk = normalizeKey(sales);
  const ek = normalizeKey(expenses);
  const excluded = new Set([
    mk,
    sk,
    ek,
    "month",
    "period",
    "date",
    "year_month",
    "sales",
    "revenue",
    "turnover",
    "income",
    "expenses",
    "total_expenses",
    "costs",
    "total_cost",
    "workforce",
    "employees",
    "headcount",
    "liabilities",
    "debt",
    "cash",
    "cash_balance",
    "liquidity",
    "bank_balance",
  ]);

  const ck = columnKeys.cash ? normalizeKey(columnKeys.cash) : null;
  const dk = columnKeys.debt ? normalizeKey(columnKeys.debt) : null;

  const firstNorm = normalizeRow(rows[0] || {});
  const expenseBreakdownKeys = Object.keys(firstNorm).filter((k) => !excluded.has(k));

  const parsed = [];
  for (const raw of rows) {
    const r = normalizeRow(raw);
    const m = r[mk];
    const s = toNum(r[sk]);
    const e = toNum(r[ek]);
    if (m === undefined || m === null || String(m).trim() === "") continue;
    if (!Number.isFinite(s) || !Number.isFinite(e)) continue;
    const workforce = r.workforce ?? r.employees ?? r.headcount;
    const rawDebt = dk && r[dk] !== undefined ? r[dk] : (r.liabilities ?? r.debt);
    const rawCash = ck && r[ck] !== undefined ? r[ck] : r.cash;
    const liabilitiesAmt = rawDebt !== undefined && rawDebt !== "" ? toNum(rawDebt) : null;
    const cashAmt = rawCash !== undefined && rawCash !== "" ? toNum(rawCash) : null;
    const breakdown = {};
    for (const bk of expenseBreakdownKeys) {
      const v = toNum(r[bk]);
      if (Number.isFinite(v) && v > 0) breakdown[bk] = v;
    }
    parsed.push({
      month: String(m).trim(),
      sales: s,
      expenses: e,
      workforce: workforce !== undefined && workforce !== "" ? toNum(workforce) : null,
      liabilities: Number.isFinite(liabilitiesAmt) ? liabilitiesAmt : null,
      cash: Number.isFinite(cashAmt) ? cashAmt : null,
      expenseBreakdown: Object.keys(breakdown).length ? breakdown : null,
    });
  }

  if (parsed.length === 0) {
    return { error: "No valid numeric rows found. Check column names and numeric values." };
  }

  return { rows: parsed, expenseBreakdownKeys };
}

export function computeFinancials(rows) {
  const totalRevenue = rows.reduce((a, r) => a + r.sales, 0);
  const totalExpenses = rows.reduce((a, r) => a + r.expenses, 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const monthlyGrowth = [];
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1].sales;
    const cur = rows[i].sales;
    const rate = prev > 0 ? ((cur - prev) / prev) * 100 : cur > 0 ? 100 : 0;
    monthlyGrowth.push({ month: rows[i].month, growthRate: Math.round(rate * 100) / 100 });
  }

  const avgGrowth =
    monthlyGrowth.length > 0
      ? monthlyGrowth.reduce((a, g) => a + g.growthRate, 0) / monthlyGrowth.length
      : 0;

  const costBreakdown = aggregateExpenseBreakdown(rows);
  const salesTrend = rows.map((r) => ({ month: r.month, sales: r.sales }));

  const monthlyBurn = totalExpenses > totalRevenue ? (totalExpenses - totalRevenue) / rows.length : 0;
  const latestRowWithCash = [...rows].reverse().find((r) => r.cash != null);
  const latestCash = latestRowWithCash ? latestRowWithCash.cash : 0;
  
  const latestRowWithDebt = [...rows].reverse().find((r) => r.liabilities != null);
  const latestDebt = latestRowWithDebt ? latestRowWithDebt.liabilities : 0;
  
  const runway = monthlyBurn > 0 ? latestCash / monthlyBurn : null;
  const annualizedRevenue = (totalRevenue / rows.length) * 12;
  const debtToIncomeRatio = annualizedRevenue > 0 ? latestDebt / annualizedRevenue : 0;

  return {
    periods: rows.length,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    profitMargin: Math.round(profitMargin * 100) / 100,
    averageMonthlyGrowthRate: Math.round(avgGrowth * 100) / 100,
    burnRate: Math.round(monthlyBurn * 100) / 100,
    runway: runway ? Math.round(runway * 10) / 10 : null,
    debtToIncomeRatio: Math.round(debtToIncomeRatio * 100) / 100,
    latestCash,
    latestDebt,
    monthlyGrowth,
    salesTrend,
    costBreakdown,
  };
}

function aggregateExpenseBreakdown(rows) {
  const totals = {};
  for (const r of rows) {
    if (!r.expenseBreakdown) continue;
    for (const [k, v] of Object.entries(r.expenseBreakdown)) {
      totals[k] = (totals[k] || 0) + v;
    }
  }
  const entries = Object.entries(totals).map(([label, value]) => ({
    label: formatLabel(label),
    value: Math.round(value * 100) / 100,
  }));
  if (entries.length === 0) {
    return rows.map((r) => ({
      label: r.month,
      value: Math.round(r.expenses * 100) / 100,
    }));
  }
  return entries;
}

function formatLabel(s) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function computeRisk(rows, financials) {
  const indicators = [];
  let score = 0;

  if (rows.length >= 3) {
    const firstAvg = rows.slice(0, Math.min(3, rows.length)).reduce((a, r) => a + r.sales, 0) / Math.min(3, rows.length);
    const lastAvg =
      rows.slice(-Math.min(3, rows.length)).reduce((a, r) => a + r.sales, 0) / Math.min(3, rows.length);
    if (lastAvg < firstAvg * 0.9) {
      indicators.push("Revenue trend is declining compared to earlier periods.");
      score += 25;
    }
  }

  const highExpenseMonths = rows.filter((r) => r.sales > 0 && r.expenses / r.sales > 0.85).length;
  if (highExpenseMonths >= Math.ceil(rows.length / 2)) {
    indicators.push("Expense ratio is high (>85% of sales) in most months.");
    score += 25;
  } else if (rows.some((r) => r.sales > 0 && r.expenses / r.sales > 0.95)) {
    indicators.push("Some months show very high expense-to-sales ratio.");
    score += 15;
  }

  if (financials.profitMargin < 5) {
    indicators.push("Net profit margin is below 5%.");
    score += 20;
  } else if (financials.profitMargin < 10) {
    indicators.push("Net profit margin is moderate; room for improvement.");
    score += 10;
  }

  const salesVals = rows.map((r) => r.sales);
  const mean = salesVals.reduce((a, b) => a + b, 0) / salesVals.length;
  const variance =
    salesVals.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / Math.max(1, salesVals.length);
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
  if (cv > 0.35 && rows.length >= 4) {
    indicators.push("Sales show irregular patterns (high variability month to month).");
    score += 20;
  }

  const liabilitiesRisk = rows.some((r) => r.liabilities != null && r.sales > 0 && r.liabilities / r.sales > 0.5);
  if (liabilitiesRisk) {
    indicators.push("Liabilities are elevated relative to monthly sales.");
    score += 15;
  }

  score = Math.min(100, score);
  let level = "Low";
  if (score >= 60) level = "High";
  else if (score >= 30) level = "Medium";

  if (indicators.length === 0) {
    indicators.push("No major financial red flags detected in the assessed metrics.");
  }

  return {
    riskScore: score,
    riskLevel: level,
    riskIndicators: indicators,
  };
}

export function buildInsightPayload(financials, risk, rowCount) {
  return {
    summary: {
      periods: rowCount,
      revenue: financials.totalRevenue,
      expenses: financials.totalExpenses,
      netProfit: financials.netProfit,
      profitMarginPct: financials.profitMargin,
      avgMonthlyGrowthPct: financials.averageMonthlyGrowthRate,
      burnRate: financials.burnRate,
      runwayMonths: financials.runway,
      debtToIncomeRatio: financials.debtToIncomeRatio,
      latestCash: financials.latestCash,
      latestDebt: financials.latestDebt,
      riskLevel: risk.riskLevel,
      riskScore: risk.riskScore,
      riskIndicators: risk.riskIndicators,
    },
  };
}
