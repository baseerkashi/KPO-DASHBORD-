/**
 * Smart Ingestion Module
 * 
 * Takes unstructured/messy Excel/CSV data and uses AI to:
 * 1. Detect which columns map to financial concepts
 * 2. Clean and normalize values (remove currency symbols, commas, etc.)
 * 3. Detect date/period formats
 * 4. Handle merged cells, multi-sheet workbooks, summary rows
 * 5. Output clean, analysis-ready rows
 */

import OpenAI from "openai";

/**
 * Clean a numeric string — strips currency symbols, commas, parentheses (negative), etc.
 */
function cleanNumeric(raw) {
  if (raw == null || raw === "") return null;
  let s = String(raw).trim();

  // Handle accounting negatives: (1,234) → -1234
  if (/^\(.*\)$/.test(s)) {
    s = "-" + s.replace(/[()]/g, "");
  }

  // Remove currency symbols and commas
  s = s.replace(/[₹$€£¥,\s]/g, "");

  // Handle "Cr" / "Lakh" / "K" / "M" suffixes
  let multiplier = 1;
  if (/cr(?:ore)?s?$/i.test(s)) {
    multiplier = 10000000;
    s = s.replace(/cr(?:ore)?s?$/i, "");
  } else if (/la(?:kh)?s?$/i.test(s)) {
    multiplier = 100000;
    s = s.replace(/la(?:kh)?s?$/i, "");
  } else if (/[mM]$/i.test(s) && !/am|pm/i.test(s)) {
    multiplier = 1000000;
    s = s.replace(/[mM]$/, "");
  } else if (/[kK]$/.test(s)) {
    multiplier = 1000;
    s = s.replace(/[kK]$/, "");
  }

  // Handle percentage
  const isPct = s.includes("%");
  s = s.replace(/%/g, "");

  const num = parseFloat(s);
  if (isNaN(num)) return null;
  return isPct ? num : num * multiplier;
}

/**
 * Try to detect if a value looks like a date/period
 */
function looksLikePeriod(value) {
  if (!value) return false;
  const s = String(value).trim();
  // Common patterns: "Jan-2024", "2024-01", "January 2024", "Q1 2024", "FY24", "Mar'24"
  return /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|q[1-4]|fy|h[12]|[0-9]{4})/i.test(s) ||
    /\d{4}[-\/]\d{1,2}/.test(s) ||
    /\d{1,2}[-\/]\d{4}/.test(s) ||
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(s);
}

/**
 * Attempt rule-based column detection (fast, no AI needed).
 * Returns a mapping or null if uncertain.
 */
function ruleBasedDetect(headers) {
  const mapping = { month: null, sales: null, expenses: null, cash: null, debt: null };
  const normalized = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ""));

  // Period/Date column
  const periodPatterns = ["month", "period", "date", "year", "quarter", "time", "fy", "fiscal"];
  for (let i = 0; i < normalized.length; i++) {
    if (periodPatterns.some(p => normalized[i].includes(p))) {
      mapping.month = headers[i];
      break;
    }
  }

  // Revenue column
  const revenuePatterns = ["revenue", "sales", "income", "turnover", "topline", "totalincome", "grossincome", "totalsales", "netrevenue", "netsales"];
  for (let i = 0; i < normalized.length; i++) {
    if (revenuePatterns.some(p => normalized[i].includes(p))) {
      mapping.sales = headers[i];
      break;
    }
  }

  // Expense column
  const expensePatterns = ["expense", "cost", "expenditure", "totalexpense", "totalcost", "opex", "operatingexpense", "cogs"];
  for (let i = 0; i < normalized.length; i++) {
    if (expensePatterns.some(p => normalized[i].includes(p))) {
      mapping.expenses = headers[i];
      break;
    }
  }

  // Cash column
  const cashPatterns = ["cash", "cashbalance", "cashinhand", "bankbalance", "liquidity", "cashequivalent"];
  for (let i = 0; i < normalized.length; i++) {
    if (cashPatterns.some(p => normalized[i].includes(p))) {
      mapping.cash = headers[i];
      break;
    }
  }

  // Debt column
  const debtPatterns = ["debt", "loan", "liability", "liabilities", "borrowing", "outstanding", "totaldebt"];
  for (let i = 0; i < normalized.length; i++) {
    if (debtPatterns.some(p => normalized[i].includes(p))) {
      mapping.debt = headers[i];
      break;
    }
  }

  // Must have at least period + revenue to be useful
  const confidence = (mapping.month ? 1 : 0) + (mapping.sales ? 1 : 0) + (mapping.expenses ? 1 : 0);
  return { mapping, confidence, method: "rule-based" };
}

/**
 * Use AI to detect column mappings from messy data.
 * Sends headers + sample rows to Gemini/OpenAI.
 */
async function aiDetectColumns(headers, sampleRows, aiConfig) {
  const { client, model } = aiConfig;

  const prompt = `You are a financial data parser. Given a messy spreadsheet, identify which columns contain:
- month/period (date, time period identifier)
- sales/revenue (income, turnover, top-line)
- expenses (costs, expenditure, COGS, opex)  
- cash (cash balance, bank balance, liquidity)
- debt (loans, liabilities, borrowings)
- total_assets (total assets)
- equity (net worth, shareholders equity)
- workforce (employees, headcount)

Here are the column headers:
${JSON.stringify(headers)}

Here are the first 3 data rows:
${sampleRows.map(r => JSON.stringify(r)).join("\n")}

RULES:
1. Map each financial concept to the EXACT header name from the list above
2. If a column doesn't exist for a concept, set it to null
3. If a column header is in a non-English language, still try to identify it
4. If numbers are in lakhs/crores, note this in the "scale" field
5. If the data appears transposed (periods as columns), set "transposed": true

Respond with ONLY valid JSON (no markdown):
{
  "mapping": {
    "month": "exact header name or null",
    "sales": "exact header name or null",
    "expenses": "exact header name or null",
    "cash": "exact header name or null",
    "debt": "exact header name or null",
    "total_assets": "exact header name or null",
    "equity": "exact header name or null",
    "workforce": "exact header name or null"
  },
  "scale": "units|thousands|lakhs|crores|millions",
  "transposed": false,
  "notes": "brief note about data structure"
}`;

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0,
    });

    let text = completion.choices[0]?.message?.content?.trim() || "";
    text = text.replace(/^```json\s*/g, "").replace(/```$/g, "").trim();
    return JSON.parse(text);
  } catch (e) {
    console.error("AI column detection failed:", e.message);
    return null;
  }
}

/**
 * Handle transposed data (periods as columns instead of rows).
 * Converts column-oriented to row-oriented.
 */
function transposeData(records, headers) {
  // First column is likely row labels (Revenue, Expenses, etc.)
  const labelCol = headers[0];
  const periodHeaders = headers.slice(1);
  
  const transposed = periodHeaders.map(period => {
    const row = { month: period };
    for (const record of records) {
      const label = String(record[labelCol] || "").toLowerCase().replace(/[^a-z]/g, "");
      const value = record[period];
      
      if (["revenue", "sales", "income", "turnover", "topline"].some(k => label.includes(k))) {
        row.sales = value;
      } else if (["expense", "cost", "expenditure", "cogs", "opex"].some(k => label.includes(k))) {
        row.expenses = value;
      } else if (["cash", "bank", "liquidity"].some(k => label.includes(k))) {
        row.cash = value;
      } else if (["debt", "loan", "liability", "borrowing"].some(k => label.includes(k))) {
        row.debt = value;
      } else if (["asset", "totalasset"].some(k => label.includes(k))) {
        row.total_assets = value;
      } else if (["equity", "networth", "shareholder"].some(k => label.includes(k))) {
        row.equity = value;
      }
    }
    return row;
  });
  
  return transposed;
}

/**
 * Remove summary/total rows that would skew analysis
 */
function removeSummaryRows(records, periodCol) {
  return records.filter(r => {
    const period = String(r[periodCol] || "").toLowerCase().trim();
    // Filter out totals, averages, summary rows
    return !["total", "sum", "average", "avg", "grand total", "subtotal", "net", ""].includes(period) &&
      !/^total/i.test(period);
  });
}

/**
 * Main smart ingestion pipeline.
 * Takes raw records from CSV/Excel and returns clean, analysis-ready data.
 */
export async function smartIngest(records, headers, aiConfig) {
  const result = {
    rows: [],
    mapping: {},
    method: "",
    warnings: [],
    notes: "",
    originalHeaders: headers,
    cleanedCount: 0,
    droppedCount: 0,
  };

  if (!records.length) {
    result.warnings.push("Empty dataset — no rows found.");
    return result;
  }

  // Step 1: Try rule-based detection first (fast)
  const ruleResult = ruleBasedDetect(headers);
  
  let mapping, scale = "units", transposed = false, notes = "";

  if (ruleResult.confidence >= 2) {
    // Rule-based detection is confident
    mapping = ruleResult.mapping;
    result.method = "rule-based (auto-detected)";
    notes = "Columns detected by header pattern matching.";
  } else if (aiConfig) {
    // Fall back to AI detection
    const sampleRows = records.slice(0, 3);
    const aiResult = await aiDetectColumns(headers, sampleRows, aiConfig);
    
    if (aiResult?.mapping) {
      mapping = aiResult.mapping;
      scale = aiResult.scale || "units";
      transposed = aiResult.transposed || false;
      notes = aiResult.notes || "";
      result.method = "AI-assisted (Gemini)";
    } else {
      // AI failed too, use best-effort rule-based
      mapping = ruleResult.mapping;
      result.method = "rule-based (best-effort)";
      result.warnings.push("AI column detection failed. Using best-effort pattern matching — verify results carefully.");
    }
  } else {
    mapping = ruleResult.mapping;
    result.method = "rule-based (no AI available)";
    result.warnings.push("No AI key configured for smart detection. Using pattern matching.");
  }

  result.mapping = mapping;
  result.notes = notes;

  // Step 2: Handle transposed data
  let workingRecords = records;
  if (transposed) {
    workingRecords = transposeData(records, headers);
    mapping.month = "month";
    mapping.sales = "sales";
    mapping.expenses = "expenses";
    result.warnings.push("Data was transposed (periods as columns). Auto-rotated to standard format.");
  }

  // Step 3: Remove summary rows
  if (mapping.month) {
    const before = workingRecords.length;
    workingRecords = removeSummaryRows(workingRecords, mapping.month);
    const dropped = before - workingRecords.length;
    if (dropped > 0) {
      result.warnings.push(`Removed ${dropped} summary/total row(s).`);
      result.droppedCount = dropped;
    }
  }

  // Step 4: Scale multiplier
  let scaleMultiplier = 1;
  if (scale === "thousands") scaleMultiplier = 1000;
  else if (scale === "lakhs") scaleMultiplier = 100000;
  else if (scale === "crores") scaleMultiplier = 10000000;
  else if (scale === "millions") scaleMultiplier = 1000000;

  if (scaleMultiplier > 1) {
    result.warnings.push(`Values detected in ${scale} — multiplied to absolute numbers.`);
  }

  // Step 5: Build clean rows
  const cleanRows = [];
  let skipped = 0;

  for (const record of workingRecords) {
    const month = mapping.month ? String(record[mapping.month] || "").trim() : `Period ${cleanRows.length + 1}`;
    
    if (!month) {
      skipped++;
      continue;
    }

    const salesRaw = mapping.sales ? cleanNumeric(record[mapping.sales]) : null;
    const expensesRaw = mapping.expenses ? cleanNumeric(record[mapping.expenses]) : null;

    // Skip rows where both revenue and expenses are null/zero
    if (salesRaw == null && expensesRaw == null) {
      skipped++;
      continue;
    }

    const row = {
      month,
      sales: (salesRaw || 0) * scaleMultiplier,
      expenses: (expensesRaw || 0) * scaleMultiplier,
    };

    // Optional columns
    if (mapping.cash) {
      const v = cleanNumeric(record[mapping.cash]);
      if (v != null) row.cash = v * scaleMultiplier;
    }
    if (mapping.debt) {
      const v = cleanNumeric(record[mapping.debt]);
      if (v != null) row.liabilities = v * scaleMultiplier;
    }
    if (mapping.total_assets) {
      const v = cleanNumeric(record[mapping.total_assets]);
      if (v != null) row.total_assets = v * scaleMultiplier;
    }
    if (mapping.equity) {
      const v = cleanNumeric(record[mapping.equity]);
      if (v != null) row.equity = v * scaleMultiplier;
    }
    if (mapping.workforce) {
      const v = cleanNumeric(record[mapping.workforce]);
      if (v != null) row.workforce = v; // Don't scale headcount
    }

    cleanRows.push(row);
  }

  if (skipped > 0) {
    result.warnings.push(`Skipped ${skipped} empty or unrecognizable row(s).`);
  }

  // Step 6: Auto-generate period names if missing
  if (!mapping.month) {
    cleanRows.forEach((r, i) => { r.month = `Period ${i + 1}`; });
    result.warnings.push("No period/date column found. Auto-generated period labels.");
  }

  result.rows = cleanRows;
  result.cleanedCount = cleanRows.length;
  return result;
}

export { cleanNumeric, ruleBasedDetect, aiDetectColumns, removeSummaryRows };
