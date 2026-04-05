import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import { parse } from "csv-parse/sync";
import OpenAI from "openai";
import {
  detectColumns,
  parseNumericRows,
  computeFinancials,
  computeRisk,
  buildInsightPayload,
} from "./analysis.js";

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "kpo-intelligence-api" });
});

/**
 * POST /upload — multipart field "file" (CSV)
 */
app.post("/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded. Use field name 'file'." });
    }
    const text = req.file.buffer.toString("utf8");
    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });
    if (!records.length) {
      return res.status(400).json({ error: "CSV is empty or could not be parsed." });
    }
    const headers = Object.keys(records[0]);
    const columnKeys = detectColumns(headers);
    const parsed = parseNumericRows(records, columnKeys);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error, headers, columnKeys });
    }
    return res.json({
      success: true,
      rowCount: parsed.rows.length,
      headers,
      columnKeys,
      data: parsed.rows,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Upload failed" });
  }
});

/**
 * POST /analyze — { data: [...] } normalized rows from upload
 */
app.post("/analyze", (req, res) => {
  try {
    const { data } = req.body;
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: "Body must include non-empty 'data' array." });
    }
    const financials = computeFinancials(data);
    const risk = computeRisk(data, financials);
    return res.json({
      financials,
      risk,
      insightContext: buildInsightPayload(financials, risk, data.length),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Analysis failed" });
  }
});

/**
 * POST /insights — OpenAI: cost, revenue, risk (3–5 bullets)
 */
app.post("/insights", async (req, res) => {
  try {
    const key = process.env.OPENAI_API_KEY?.trim();
    if (!key) {
      return res.json({
        error: "OPENAI_API_KEY is not configured on the server.",
        insights: [
          "Configure OPENAI_API_KEY in server/.env to enable AI-generated insights.",
          "Until then, use Risk Assessment and Financial Analysis tabs for manual review.",
        ],
      });
    }
    const payload = req.body?.insightContext || req.body?.summary || req.body;
    if (!payload || typeof payload !== "object") {
      return res.status(400).json({ error: "Send insightContext or summary from /analyze response." });
    }
    const client = new OpenAI({ apiKey: key });
    const sys = `You are a financial advisor for Micro and Small Enterprises (MSEs) working with KPO analysts.
Given JSON financial and risk summary, respond with exactly 3 to 5 concise bullet points (one line each).
Cover: cost optimization, revenue improvement, and risk warnings where relevant.
Use plain language, no markdown headings, start each line with "• ".`;

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: JSON.stringify(payload) },
      ],
      max_tokens: 500,
      temperature: 0.4,
    });
    const text = completion.choices[0]?.message?.content?.trim() || "";
    const lines = text
      .split("\n")
      .map((l) => l.replace(/^[-•*\d.)]+\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 5);
    return res.json({ insights: lines.length ? lines : [text] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Insights request failed" });
  }
});

/**
 * POST /insights/simulate — OpenAI: Answer custom What-if based on simulated financials
 */
app.post("/insights/simulate", async (req, res) => {
  try {
    const key = process.env.OPENAI_API_KEY?.trim();
    if (!key) {
      return res.json({
        error: "OPENAI_API_KEY is not configured.",
        answer: "Please configure OPENAI_API_KEY in server/.env to use the AI simulator."
      });
    }
    const { context, question } = req.body;
    if (!context || !question) {
      return res.status(400).json({ error: "Missing context or question." });
    }
    const client = new OpenAI({ apiKey: key });
    const sys = `You are a financial risk advisor.

Given:
- Current financial state
- Simulated changes

1. Predict outcome (short term + medium term)
2. Highlight risks
3. Suggest better alternative (if any)

Keep response concise and actionable.
Must include a confidence tone (e.g., 'High likelihood', 'Moderate risk', 'Low confidence due to limited data').`;

    const userMsg = `Current State:
Revenue: $${context.baseline.monthlyRevenue}
Expenses: $${context.baseline.monthlyExpenses}
Risk: ${context.baseline.riskLevel || 'Unknown'}

Simulated State:
Revenue: $${context.scenario.projected.simAvgRev} (${context.scenario.adjustments.revenueChangePct}%)
Expenses: $${context.scenario.projected.simAvgExp} (${context.scenario.adjustments.expenseChangePct}%)
Cash: $${context.scenario.projected.simCash}

User Question:
"${question}"`;

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: userMsg },
      ],
      max_tokens: 300,
      temperature: 0.5,
    });
    const answer = completion.choices[0]?.message?.content?.trim() || "";
    return res.json({ answer });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Simulation request failed" });
  }
});

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`KPO Intelligence API listening on http://localhost:${PORT}`);
  });
}

export default app;
