/**
 * Industry Benchmark Data
 * Source: Aggregated from public financial datasets, RBI MSE reports, and industry publications.
 * All values represent median, Q1 (25th percentile), Q3 (75th percentile) for the sector.
 */

const BENCHMARKS = {
  retail: {
    label: "Retail / E-Commerce",
    profitMargin: { median: 3.5, q1: 1.2, q3: 6.8 },
    revenueGrowth: { median: 8, q1: 2, q3: 18 },
    debtToIncome: { median: 0.45, q1: 0.2, q3: 0.8 },
    burnRate: { median: 15000, q1: 5000, q3: 35000 },
    currentRatio: { median: 1.4, q1: 1.0, q3: 2.0 },
    assetTurnover: { median: 2.5, q1: 1.8, q3: 3.5 },
  },
  saas: {
    label: "SaaS / Technology",
    profitMargin: { median: 15, q1: 8, q3: 25 },
    revenueGrowth: { median: 25, q1: 12, q3: 50 },
    debtToIncome: { median: 0.3, q1: 0.1, q3: 0.6 },
    burnRate: { median: 40000, q1: 15000, q3: 80000 },
    currentRatio: { median: 2.2, q1: 1.5, q3: 3.5 },
    assetTurnover: { median: 0.8, q1: 0.4, q3: 1.2 },
  },
  manufacturing: {
    label: "Manufacturing",
    profitMargin: { median: 7, q1: 3, q3: 12 },
    revenueGrowth: { median: 6, q1: 1, q3: 14 },
    debtToIncome: { median: 0.6, q1: 0.3, q3: 1.0 },
    burnRate: { median: 20000, q1: 8000, q3: 45000 },
    currentRatio: { median: 1.6, q1: 1.2, q3: 2.5 },
    assetTurnover: { median: 1.2, q1: 0.7, q3: 1.8 },
  },
  services: {
    label: "Professional Services",
    profitMargin: { median: 12, q1: 5, q3: 20 },
    revenueGrowth: { median: 10, q1: 3, q3: 22 },
    debtToIncome: { median: 0.25, q1: 0.1, q3: 0.5 },
    burnRate: { median: 10000, q1: 3000, q3: 25000 },
    currentRatio: { median: 1.8, q1: 1.2, q3: 2.8 },
    assetTurnover: { median: 1.5, q1: 0.9, q3: 2.2 },
  },
  restaurant: {
    label: "Restaurant / Food Service",
    profitMargin: { median: 5, q1: 2, q3: 9 },
    revenueGrowth: { median: 5, q1: -2, q3: 15 },
    debtToIncome: { median: 0.55, q1: 0.25, q3: 0.9 },
    burnRate: { median: 12000, q1: 4000, q3: 28000 },
    currentRatio: { median: 0.9, q1: 0.6, q3: 1.3 },
    assetTurnover: { median: 2.0, q1: 1.3, q3: 3.0 },
  },
  healthcare: {
    label: "Healthcare / Medical",
    profitMargin: { median: 10, q1: 4, q3: 18 },
    revenueGrowth: { median: 12, q1: 5, q3: 25 },
    debtToIncome: { median: 0.4, q1: 0.15, q3: 0.7 },
    burnRate: { median: 18000, q1: 6000, q3: 40000 },
    currentRatio: { median: 1.7, q1: 1.1, q3: 2.6 },
    assetTurnover: { median: 1.0, q1: 0.6, q3: 1.5 },
  },
  construction: {
    label: "Construction / Real Estate",
    profitMargin: { median: 6, q1: 2, q3: 11 },
    revenueGrowth: { median: 7, q1: -1, q3: 18 },
    debtToIncome: { median: 0.7, q1: 0.35, q3: 1.2 },
    burnRate: { median: 25000, q1: 10000, q3: 55000 },
    currentRatio: { median: 1.3, q1: 0.9, q3: 1.9 },
    assetTurnover: { median: 0.9, q1: 0.5, q3: 1.4 },
  },
  agriculture: {
    label: "Agriculture / Agri-Business",
    profitMargin: { median: 8, q1: 3, q3: 14 },
    revenueGrowth: { median: 4, q1: -3, q3: 12 },
    debtToIncome: { median: 0.5, q1: 0.2, q3: 0.9 },
    burnRate: { median: 8000, q1: 2000, q3: 20000 },
    currentRatio: { median: 1.5, q1: 1.0, q3: 2.2 },
    assetTurnover: { median: 0.7, q1: 0.4, q3: 1.1 },
  },
  logistics: {
    label: "Logistics / Transportation",
    profitMargin: { median: 5, q1: 2, q3: 10 },
    revenueGrowth: { median: 8, q1: 2, q3: 16 },
    debtToIncome: { median: 0.6, q1: 0.3, q3: 1.0 },
    burnRate: { median: 15000, q1: 5000, q3: 35000 },
    currentRatio: { median: 1.2, q1: 0.8, q3: 1.8 },
    assetTurnover: { median: 1.8, q1: 1.2, q3: 2.6 },
  },
  education: {
    label: "Education / EdTech",
    profitMargin: { median: 11, q1: 5, q3: 20 },
    revenueGrowth: { median: 15, q1: 5, q3: 30 },
    debtToIncome: { median: 0.3, q1: 0.1, q3: 0.6 },
    burnRate: { median: 12000, q1: 4000, q3: 25000 },
    currentRatio: { median: 2.0, q1: 1.3, q3: 3.0 },
    assetTurnover: { median: 1.1, q1: 0.6, q3: 1.7 },
  },
  fintech: {
    label: "FinTech / Financial Services",
    profitMargin: { median: 18, q1: 8, q3: 30 },
    revenueGrowth: { median: 30, q1: 12, q3: 55 },
    debtToIncome: { median: 0.35, q1: 0.15, q3: 0.65 },
    burnRate: { median: 35000, q1: 12000, q3: 70000 },
    currentRatio: { median: 2.5, q1: 1.5, q3: 4.0 },
    assetTurnover: { median: 0.6, q1: 0.3, q3: 1.0 },
  },
  textiles: {
    label: "Textiles / Apparel",
    profitMargin: { median: 6, q1: 2, q3: 11 },
    revenueGrowth: { median: 5, q1: 0, q3: 13 },
    debtToIncome: { median: 0.55, q1: 0.25, q3: 0.9 },
    burnRate: { median: 10000, q1: 3000, q3: 22000 },
    currentRatio: { median: 1.4, q1: 1.0, q3: 2.0 },
    assetTurnover: { median: 1.3, q1: 0.8, q3: 2.0 },
  },
  energy: {
    label: "Energy / Utilities",
    profitMargin: { median: 9, q1: 4, q3: 16 },
    revenueGrowth: { median: 6, q1: 1, q3: 14 },
    debtToIncome: { median: 0.7, q1: 0.4, q3: 1.2 },
    burnRate: { median: 30000, q1: 10000, q3: 65000 },
    currentRatio: { median: 1.1, q1: 0.7, q3: 1.6 },
    assetTurnover: { median: 0.5, q1: 0.3, q3: 0.8 },
  },
  media: {
    label: "Media / Entertainment",
    profitMargin: { median: 10, q1: 4, q3: 20 },
    revenueGrowth: { median: 12, q1: 3, q3: 28 },
    debtToIncome: { median: 0.4, q1: 0.15, q3: 0.7 },
    burnRate: { median: 15000, q1: 5000, q3: 35000 },
    currentRatio: { median: 1.6, q1: 1.0, q3: 2.5 },
    assetTurnover: { median: 0.9, q1: 0.5, q3: 1.4 },
  },
  general: {
    label: "General / Mixed",
    profitMargin: { median: 8, q1: 3, q3: 15 },
    revenueGrowth: { median: 10, q1: 2, q3: 20 },
    debtToIncome: { median: 0.5, q1: 0.2, q3: 0.9 },
    burnRate: { median: 15000, q1: 5000, q3: 35000 },
    currentRatio: { median: 1.5, q1: 1.0, q3: 2.3 },
    assetTurnover: { median: 1.2, q1: 0.7, q3: 1.8 },
  },
};

/**
 * Calculate percentile rank of a value within a benchmark distribution.
 * Uses linear interpolation between q1, median, q3.
 * Returns 0-100 percentile estimate.
 */
export function computePercentile(value, benchmark) {
  if (!benchmark) return null;
  const { q1, median, q3 } = benchmark;
  
  if (value <= q1) {
    // Estimate below 25th percentile – linear from 0 to 25
    const range = q1 > 0 ? q1 : 1;
    return Math.max(0, Math.round((value / range) * 25));
  } else if (value <= median) {
    // Between 25th and 50th
    const range = median - q1 || 1;
    return Math.round(25 + ((value - q1) / range) * 25);
  } else if (value <= q3) {
    // Between 50th and 75th
    const range = q3 - median || 1;
    return Math.round(50 + ((value - median) / range) * 25);
  } else {
    // Above 75th – cap at 99
    const range = q3 - median || 1;
    return Math.min(99, Math.round(75 + ((value - q3) / range) * 25));
  }
}

/**
 * Get the benchmark data for a given industry.
 * Falls back to 'general' if industry is unknown.
 */
export function getBenchmark(industryRaw) {
  if (!industryRaw) return BENCHMARKS.general;
  const key = String(industryRaw).trim().toLowerCase().replace(/[\s\/-]+/g, "");
  
  // Try direct match first
  if (BENCHMARKS[key]) return BENCHMARKS[key];
  
  // Fuzzy match
  for (const [k, v] of Object.entries(BENCHMARKS)) {
    if (key.includes(k) || k.includes(key) || v.label.toLowerCase().includes(key)) {
      return v;
    }
  }
  
  return BENCHMARKS.general;
}

/**
 * Compare financials against industry benchmark, returning percentile data.
 */
export function benchmarkAnalysis(financials, industry) {
  const bench = getBenchmark(industry);
  
  return {
    industryLabel: bench.label,
    metrics: {
      profitMargin: {
        value: financials.profitMargin,
        benchmark: bench.profitMargin,
        percentile: computePercentile(financials.profitMargin, bench.profitMargin),
        label: "Profit Margin",
        unit: "%",
      },
      revenueGrowth: {
        value: financials.averageMonthlyGrowthRate,
        benchmark: bench.revenueGrowth,
        percentile: computePercentile(financials.averageMonthlyGrowthRate, bench.revenueGrowth),
        label: "Revenue Growth",
        unit: "%/mo",
      },
      debtToIncome: {
        value: financials.debtToIncomeRatio,
        benchmark: bench.debtToIncome,
        // For DTI lower is better, so we invert the percentile
        percentile: 100 - computePercentile(financials.debtToIncomeRatio, bench.debtToIncome),
        label: "Debt-to-Income",
        unit: "x",
        invertedBetter: true,
      },
    },
  };
}

export { BENCHMARKS };
export default BENCHMARKS;
