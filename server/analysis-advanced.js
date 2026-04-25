/**
 * Advanced Financial Analysis Models
 * 
 * Implements:
 *  - Altman Z-Score (modified for private MSEs)
 *  - DuPont Decomposition (3-factor)
 *  - Variance Analysis (period-over-period)
 *  - Data Validation
 *  - Enhanced 10-factor Risk Scoring
 */

import { getBenchmark, computePercentile } from "./benchmarks.js";

/* ═══════════════════════════════════════════════════════ */
/*  ALTMAN Z-SCORE (Modified for Private/MSE)             */
/* ═══════════════════════════════════════════════════════ */

/**
 * Altman Z'-Score for private firms (1993 revision).
 * Z' = 6.56×X1 + 3.26×X2 + 6.72×X3 + 1.05×X4
 * 
 * Where:
 *   X1 = Working Capital / Total Assets
 *   X2 = Retained Earnings / Total Assets
 *   X3 = EBIT / Total Assets
 *   X4 = Book Value of Equity / Total Liabilities
 * 
 * If full balance sheet data isn't available, we estimate from income statement data.
 */
export function computeAltmanZScore(rows, financials) {
  const result = {
    score: null,
    zone: null,
    components: {},
    dataQuality: "estimated", // 'actual' if full balance sheet columns exist
    available: false,
  };

  const n = rows.length;
  if (n < 3) return result;

  // Try to extract balance sheet data from rows
  const lastRow = rows[n - 1];
  const hasAssets = lastRow.total_assets != null;
  const hasEquity = lastRow.equity != null;
  const hasRetainedEarnings = lastRow.retained_earnings != null;

  let totalAssets, equity, retainedEarnings, totalLiabilities, workingCapital;

  if (hasAssets && hasEquity) {
    // Actual balance sheet data available
    totalAssets = parseFloat(lastRow.total_assets) || 0;
    equity = parseFloat(lastRow.equity) || 0;
    totalLiabilities = totalAssets - equity;
    retainedEarnings = hasRetainedEarnings 
      ? (parseFloat(lastRow.retained_earnings) || 0)
      : financials.netProfit * 0.6; // Estimate: 60% of profit retained
    workingCapital = lastRow.working_capital != null 
      ? parseFloat(lastRow.working_capital) 
      : (financials.latestCash || 0) - (totalLiabilities * 0.3); // Estimate current liabilities as 30% of total
    
    result.dataQuality = "actual";
  } else {
    // Estimate from income statement data (proxy model)
    const annualizedRevenue = (financials.totalRevenue / n) * 12;
    const annualizedExpenses = (financials.totalExpenses / n) * 12;
    const annualizedProfit = annualizedRevenue - annualizedExpenses;
    
    // Asset estimation: Revenue / Asset Turnover (use industry median ~1.2)
    totalAssets = annualizedRevenue / 1.2;
    if (totalAssets <= 0) totalAssets = 1;
    
    // Liabilities estimation
    totalLiabilities = financials.latestDebt || (totalAssets * 0.5);
    equity = totalAssets - totalLiabilities;
    
    // Retained earnings: cumulative profit proxy
    retainedEarnings = annualizedProfit * 0.6;
    
    // Working capital: cash minus estimated current liabilities  
    workingCapital = (financials.latestCash || 0) - (totalLiabilities * 0.3);
    
    result.dataQuality = "estimated";
  }

  if (totalAssets <= 0) return result;

  // EBIT = Net Profit (roughly, for MSEs without separate interest/tax lines)
  const ebit = financials.netProfit / n * 12; // Annualized

  // Compute components
  const X1 = workingCapital / totalAssets;
  const X2 = retainedEarnings / totalAssets;
  const X3 = ebit / totalAssets;
  const X4 = totalLiabilities > 0 ? equity / totalLiabilities : 2.0;

  const zScore = 6.56 * X1 + 3.26 * X2 + 6.72 * X3 + 1.05 * X4;

  let zone;
  if (zScore > 2.6) zone = "Safe";
  else if (zScore > 1.1) zone = "Grey";
  else zone = "Distress";

  result.score = Math.round(zScore * 100) / 100;
  result.zone = zone;
  result.available = true;
  result.components = {
    X1: Math.round(X1 * 1000) / 1000,
    X2: Math.round(X2 * 1000) / 1000,
    X3: Math.round(X3 * 1000) / 1000,
    X4: Math.round(X4 * 1000) / 1000,
    X1_label: "Working Capital / Total Assets",
    X2_label: "Retained Earnings / Total Assets",
    X3_label: "EBIT / Total Assets",
    X4_label: "Equity / Total Liabilities",
  };

  return result;
}


/* ═══════════════════════════════════════════════════════ */
/*  DUPONT DECOMPOSITION (3-Factor)                       */
/* ═══════════════════════════════════════════════════════ */

/**
 * DuPont Analysis decomposes Return on Equity into 3 drivers:
 *   ROE = Net Profit Margin × Asset Turnover × Equity Multiplier
 *       = (Net Income / Revenue) × (Revenue / Total Assets) × (Total Assets / Equity)
 */
export function computeDuPont(rows, financials) {
  const n = rows.length;
  if (n < 1) return { available: false };

  const annualizedRevenue = (financials.totalRevenue / n) * 12;
  const annualizedProfit = (financials.netProfit / n) * 12;

  // Estimate total assets and equity if not directly available
  const lastRow = rows[n - 1];
  let totalAssets = lastRow?.total_assets ? parseFloat(lastRow.total_assets) : annualizedRevenue / 1.2;
  let equity = lastRow?.equity ? parseFloat(lastRow.equity) : totalAssets * 0.5;

  if (totalAssets <= 0) totalAssets = 1;
  if (equity <= 0) equity = 1;

  const netProfitMargin = annualizedRevenue > 0 ? (annualizedProfit / annualizedRevenue) * 100 : 0;
  const assetTurnover = totalAssets > 0 ? annualizedRevenue / totalAssets : 0;
  const equityMultiplier = equity > 0 ? totalAssets / equity : 1;
  const roe = (netProfitMargin / 100) * assetTurnover * equityMultiplier * 100;

  return {
    available: true,
    roe: Math.round(roe * 100) / 100,
    netProfitMargin: Math.round(netProfitMargin * 100) / 100,
    assetTurnover: Math.round(assetTurnover * 100) / 100,
    equityMultiplier: Math.round(equityMultiplier * 100) / 100,
    dataQuality: lastRow?.total_assets ? "actual" : "estimated",
  };
}


/* ═══════════════════════════════════════════════════════ */
/*  VARIANCE ANALYSIS                                     */
/* ═══════════════════════════════════════════════════════ */

/**
 * Period-over-period variance analysis.
 * Splits data into two halves (or first vs last 3 periods),
 * computes absolute and percentage variance for key metrics.
 */
export function computeVarianceAnalysis(rows, financials) {
  if (rows.length < 4) {
    return { available: false, reason: "Need at least 4 periods for variance analysis" };
  }

  const mid = Math.floor(rows.length / 2);
  const firstHalf = rows.slice(0, mid);
  const secondHalf = rows.slice(mid);

  const avg = (arr, key) => arr.reduce((sum, r) => sum + (r[key] || 0), 0) / arr.length;

  const metrics = [
    { key: "sales", label: "Average Revenue", favorableDirection: "up" },
    { key: "expenses", label: "Average Expenses", favorableDirection: "down" },
  ];

  const variances = metrics.map(m => {
    const prior = avg(firstHalf, m.key);
    const current = avg(secondHalf, m.key);
    const absoluteVar = current - prior;
    const pctVar = prior !== 0 ? ((current - prior) / Math.abs(prior)) * 100 : 0;
    const favorable = m.favorableDirection === "up" ? absoluteVar > 0 : absoluteVar < 0;

    return {
      label: m.label,
      prior: Math.round(prior * 100) / 100,
      current: Math.round(current * 100) / 100,
      absoluteVariance: Math.round(absoluteVar * 100) / 100,
      percentVariance: Math.round(pctVar * 100) / 100,
      favorable,
      periodLabel: {
        prior: `${firstHalf[0].month} – ${firstHalf[firstHalf.length - 1].month}`,
        current: `${secondHalf[0].month} – ${secondHalf[secondHalf.length - 1].month}`,
      },
    };
  });

  // Profit variance
  const priorProfit = avg(firstHalf, "sales") - avg(firstHalf, "expenses");
  const currentProfit = avg(secondHalf, "sales") - avg(secondHalf, "expenses");
  const profitAbsVar = currentProfit - priorProfit;
  const profitPctVar = priorProfit !== 0 ? ((currentProfit - priorProfit) / Math.abs(priorProfit)) * 100 : 0;

  variances.push({
    label: "Average Profit",
    prior: Math.round(priorProfit * 100) / 100,
    current: Math.round(currentProfit * 100) / 100,
    absoluteVariance: Math.round(profitAbsVar * 100) / 100,
    percentVariance: Math.round(profitPctVar * 100) / 100,
    favorable: profitAbsVar > 0,
    periodLabel: {
      prior: `${firstHalf[0].month} – ${firstHalf[firstHalf.length - 1].month}`,
      current: `${secondHalf[0].month} – ${secondHalf[secondHalf.length - 1].month}`,
    },
  });

  // Margin variance
  const priorMargin = avg(firstHalf, "sales") > 0 ? (priorProfit / avg(firstHalf, "sales")) * 100 : 0;
  const currentMargin = avg(secondHalf, "sales") > 0 ? (currentProfit / avg(secondHalf, "sales")) * 100 : 0;

  variances.push({
    label: "Profit Margin",
    prior: Math.round(priorMargin * 100) / 100,
    current: Math.round(currentMargin * 100) / 100,
    absoluteVariance: Math.round((currentMargin - priorMargin) * 100) / 100,
    percentVariance: priorMargin !== 0 ? Math.round(((currentMargin - priorMargin) / Math.abs(priorMargin)) * 100 * 100) / 100 : 0,
    favorable: currentMargin > priorMargin,
    isPercentage: true,
    periodLabel: {
      prior: `${firstHalf[0].month} – ${firstHalf[firstHalf.length - 1].month}`,
      current: `${secondHalf[0].month} – ${secondHalf[secondHalf.length - 1].month}`,
    },
  });

  return { available: true, variances };
}


/* ═══════════════════════════════════════════════════════ */
/*  DATA VALIDATION                                       */
/* ═══════════════════════════════════════════════════════ */

/**
 * Validates parsed data rows for anomalies and issues.
 * Returns arrays of warnings and errors.
 */
export function validateData(rows) {
  const warnings = [];
  const errors = [];

  if (rows.length < 2) {
    warnings.push("Only " + rows.length + " period(s) detected. Most analyses require at least 3-6 periods for meaningful results.");
  }

  // Check for negative values
  rows.forEach((r, i) => {
    if (r.sales < 0) {
      warnings.push(`Period "${r.month}": Negative revenue ($${r.sales}) — verify this is correct, not a data entry error.`);
    }
    if (r.expenses < 0) {
      warnings.push(`Period "${r.month}": Negative expenses ($${r.expenses}) — unusual, may indicate refunds or corrections.`);
    }
  });

  // Check for extreme jumps (>500% change)
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1];
    const curr = rows[i];
    
    if (prev.sales > 0) {
      const revenueChange = Math.abs((curr.sales - prev.sales) / prev.sales) * 100;
      if (revenueChange > 500) {
        warnings.push(`Period "${curr.month}": Revenue changed by ${Math.round(revenueChange)}% from previous period. Verify this isn't a data entry error.`);
      }
    }
    
    if (prev.expenses > 0) {
      const expenseChange = Math.abs((curr.expenses - prev.expenses) / prev.expenses) * 100;
      if (expenseChange > 500) {
        warnings.push(`Period "${curr.month}": Expenses changed by ${Math.round(expenseChange)}% from previous period.`);
      }
    }
  }

  // Check for duplicate months
  const months = rows.map(r => r.month);
  const duplicates = months.filter((m, i) => months.indexOf(m) !== i);
  if (duplicates.length > 0) {
    errors.push(`Duplicate period names detected: ${[...new Set(duplicates)].join(", ")}. Each period must be unique.`);
  }

  // Check for zeros
  const zeroRevenue = rows.filter(r => r.sales === 0).length;
  if (zeroRevenue > 0) {
    warnings.push(`${zeroRevenue} period(s) have zero revenue. This significantly affects growth and margin calculations.`);
  }

  return { warnings, errors, valid: errors.length === 0 };
}


/* ═══════════════════════════════════════════════════════ */
/*  ENHANCED 10-FACTOR RISK MODEL                         */
/* ═══════════════════════════════════════════════════════ */

/**
 * Computes a comprehensive risk score using 10 weighted factors.
 * Score: 0-100 (higher = more risk)
 */
export function computeEnhancedRisk(rows, financials, industry) {
  const factors = [];
  const n = rows.length;
  const bench = getBenchmark(industry);

  // 1. Profitability vs Industry (15%)
  const marginPercentile = computePercentile(financials.profitMargin, bench.profitMargin);
  const profitRisk = Math.max(0, 100 - (marginPercentile || 50));
  factors.push({
    name: "Profitability",
    weight: 0.15,
    score: Math.round(profitRisk),
    detail: `Margin ${financials.profitMargin}% at ${marginPercentile}th percentile for ${bench.label}`,
  });

  // 2. Growth Trajectory (12%)
  let growthRisk = 50;
  if (n >= 3) {
    const firstAvg = rows.slice(0, 3).reduce((a, r) => a + r.sales, 0) / 3;
    const lastAvg = rows.slice(-3).reduce((a, r) => a + r.sales, 0) / 3;
    if (firstAvg > 0) {
      const trend = ((lastAvg - firstAvg) / firstAvg) * 100;
      if (trend < -20) growthRisk = 95;
      else if (trend < -5) growthRisk = 70;
      else if (trend < 5) growthRisk = 45;
      else if (trend < 20) growthRisk = 20;
      else growthRisk = 5;
    }
  }
  factors.push({
    name: "Growth Trajectory",
    weight: 0.12,
    score: growthRisk,
    detail: `Avg growth rate: ${financials.averageMonthlyGrowthRate}%/mo`,
  });

  // 3. Revenue Volatility (10%)
  let volatilityRisk = 30;
  if (n >= 3) {
    const salesArr = rows.map(r => r.sales);
    const mean = salesArr.reduce((a, b) => a + b, 0) / n;
    const variance = salesArr.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? (stdDev / mean) * 100 : 0; // Coefficient of variation
    
    if (cv > 50) volatilityRisk = 90;
    else if (cv > 30) volatilityRisk = 65;
    else if (cv > 15) volatilityRisk = 35;
    else volatilityRisk = 10;
  }
  factors.push({
    name: "Revenue Volatility",
    weight: 0.10,
    score: volatilityRisk,
    detail: `Revenue coefficient of variation measured`,
  });

  // 4. Expense Ratio Trend (8%)
  let expenseRatioRisk = 40;
  if (n >= 4) {
    const firstHalf = rows.slice(0, Math.floor(n / 2));
    const secondHalf = rows.slice(Math.floor(n / 2));
    const ratio1 = firstHalf.reduce((a, r) => a + r.expenses, 0) / firstHalf.reduce((a, r) => a + r.sales, 0);
    const ratio2 = secondHalf.reduce((a, r) => a + r.expenses, 0) / secondHalf.reduce((a, r) => a + r.sales, 0);
    
    if (ratio2 > ratio1 * 1.1) expenseRatioRisk = 80;
    else if (ratio2 > ratio1) expenseRatioRisk = 50;
    else expenseRatioRisk = 15;
  }
  factors.push({
    name: "Expense Ratio",
    weight: 0.08,
    score: expenseRatioRisk,
    detail: `Expense-to-revenue trend over periods`,
  });

  // 5. Liquidity / Runway (12%)
  let liquidityRisk = 30;
  if (financials.runway !== null) {
    if (financials.runway < 3) liquidityRisk = 95;
    else if (financials.runway < 6) liquidityRisk = 70;
    else if (financials.runway < 12) liquidityRisk = 40;
    else liquidityRisk = 10;
  } else if (financials.burnRate === 0) {
    liquidityRisk = 5; // Profitable, no burn
  }
  factors.push({
    name: "Liquidity",
    weight: 0.12,
    score: liquidityRisk,
    detail: financials.runway !== null ? `Runway: ${financials.runway} months` : "Profitable (no burn)",
  });

  // 6. Debt Burden (10%)
  let debtRisk = 30;
  const dti = financials.debtToIncomeRatio;
  if (dti > 2.0) debtRisk = 90;
  else if (dti > 1.5) debtRisk = 70;
  else if (dti > 1.0) debtRisk = 50;
  else if (dti > 0.5) debtRisk = 25;
  else debtRisk = 10;
  factors.push({
    name: "Debt Burden",
    weight: 0.10,
    score: debtRisk,
    detail: `Debt-to-income ratio: ${dti}x`,
  });

  // 7. Working Capital Proxy (8%)
  let wcRisk = 40;
  const latestCash = financials.latestCash || 0;
  const monthlyExpenses = financials.totalExpenses / n;
  const currentRatioProxy = monthlyExpenses > 0 ? latestCash / monthlyExpenses : 2;
  if (currentRatioProxy < 0.5) wcRisk = 90;
  else if (currentRatioProxy < 1.0) wcRisk = 65;
  else if (currentRatioProxy < 1.5) wcRisk = 35;
  else wcRisk = 10;
  factors.push({
    name: "Working Capital",
    weight: 0.08,
    score: wcRisk,
    detail: `Cash/monthly-expenses ratio: ${Math.round(currentRatioProxy * 100) / 100}`,
  });

  // 8. Revenue Concentration (5%) — can only estimate from data variability
  let concentrationRisk = 30; // Default medium (we can't truly measure this without customer-level data)
  factors.push({
    name: "Revenue Concentration",
    weight: 0.05,
    score: concentrationRisk,
    detail: "Estimated from revenue pattern analysis",
  });

  // 9. Altman Z-Score Factor (12%)
  let zScoreRisk = 50;
  const zResult = computeAltmanZScore(rows, financials);
  if (zResult.available) {
    if (zResult.zone === "Safe") zScoreRisk = 10;
    else if (zResult.zone === "Grey") zScoreRisk = 55;
    else zScoreRisk = 90;
  }
  factors.push({
    name: "Altman Z-Score",
    weight: 0.12,
    score: zScoreRisk,
    detail: zResult.available ? `Z'=${zResult.score} (${zResult.zone} Zone)` : "Insufficient data",
  });

  // 10. Growth Sustainability (8%) — revenue growth minus expense growth
  let sustainabilityRisk = 40;
  if (n >= 4) {
    const avgRevenueGrowth = financials.averageMonthlyGrowthRate;
    // Compute expense growth
    const expGrowths = [];
    for (let i = 1; i < n; i++) {
      if (rows[i - 1].expenses > 0) {
        expGrowths.push(((rows[i].expenses - rows[i - 1].expenses) / rows[i - 1].expenses) * 100);
      }
    }
    const avgExpGrowth = expGrowths.length > 0 ? expGrowths.reduce((a, b) => a + b, 0) / expGrowths.length : 0;
    const gap = avgRevenueGrowth - avgExpGrowth;
    
    if (gap > 5) sustainabilityRisk = 10;
    else if (gap > 0) sustainabilityRisk = 30;
    else if (gap > -5) sustainabilityRisk = 55;
    else sustainabilityRisk = 85;
  }
  factors.push({
    name: "Growth Sustainability",
    weight: 0.08,
    score: sustainabilityRisk,
    detail: "Revenue growth vs expense growth gap",
  });

  // Compute weighted total
  const totalScore = Math.round(factors.reduce((sum, f) => sum + f.score * f.weight, 0));

  let level = "Low";
  if (totalScore >= 60) level = "High";
  else if (totalScore >= 35) level = "Medium";

  // Generate risk indicators from high-scoring factors
  const indicators = factors
    .filter(f => f.score >= 60)
    .sort((a, b) => b.score * b.weight - a.score * a.weight)
    .map(f => `${f.name}: ${f.detail}`);

  if (indicators.length === 0) {
    indicators.push("No major financial red flags detected across all 10 assessment factors.");
  }

  return {
    riskScore: totalScore,
    riskLevel: level,
    riskIndicators: indicators,
    factors,
    breakdown: {
      profitability: factors[0].score,
      growth: factors[1].score,
      liquidity: factors[4].score,
    },
  };
}
