import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import { parse } from "csv-parse/sync";
import * as xlsx from "xlsx";
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
  res.json({ ok: true, service: "vertex-intelligence-api" });
});

/**
 * Helper to get a properly configured AI client and model name.
 * Supports Google Gemini (free tier via AI Studio), Groq (free), and OpenAI.
 */
function getAIClient() {
  if (process.env.GEMINI_API_KEY) {
    return {
      client: new OpenAI({ apiKey: process.env.GEMINI_API_KEY, baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/" }),
      model: "gemini-2.5-flash"
    };
  }
  if (process.env.GROQ_API_KEY) {
    return {
      client: new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" }),
      model: "llama-3.1-8b-instant"
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
      model: process.env.OPENAI_MODEL || "gpt-4o-mini"
    };
  }
  return null;
}

/**
 * POST /upload — multipart field "file" (CSV or XLSX)
 */
app.post("/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded. Use field name 'file'." });
    }
    
    let text = "";
    
    // Check if file is excel
    const isExcel = req.file.originalname.match(/\.(xlsx|xls)$/i) || 
                   req.file.mimetype.includes("spreadsheetml") || 
                   req.file.mimetype.includes("excel");
                   
    if (isExcel) {
      const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      text = xlsx.utils.sheet_to_csv(sheet);
    } else {
      text = req.file.buffer.toString("utf8");
    }

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
 * POST /insights — AI: cost, revenue, risk (3–5 bullets)
 */
app.post("/insights", async (req, res) => {
  try {
    const aiConfig = getAIClient();
    if (!aiConfig) {
      return res.json({
        error: "No AI key configured. Set GEMINI_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY in server/.env.",
        insights: [
          "Configure an AI API key (like GEMINI_API_KEY for a great free tier) to enable insights.",
          "Until then, use Risk Assessment and Financial Analysis tabs for manual review.",
        ],
      });
    }
    const { client, model } = aiConfig;
    const payload = req.body?.insightContext || req.body?.summary || req.body;
    if (!payload || typeof payload !== "object") {
      return res.status(400).json({ error: "Send insightContext or summary from /analyze response." });
    }
    const sys = `You are a ruthless, Wall Street-caliber Turnaround Executive and Strategic Financial Enforcer.
Analyze the provided JSON business financials and risk assessment. DO NOT ask politely. DO NOT give vague suggestions. Command the business owner on exactly what they MUST do to survive and grow.

Requirements:
1. Generate 7 to 10 rapid-fire, brutal, highly detailed strategic commands.
2. Tell them exactly where to CUT costs, where to FORCE revenue, and how to SURVIVE their cash runways. Use direct, commanding verbs (e.g., "Cut X immediately", "Deploy capital into Y", "Liquidate Z"). 
3. Do not simply restate numbers. Give them a hard-hitting action plan based on those numbers. Be harsh if the risk is high.
4. Each command MUST be a detailed paragraph (3-4 sentences long). 
5. Separate each command distinctly by strict use of a "---" separator between them on its own line. Do not use bullets or numbers.`;

    const completion = await client.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: JSON.stringify(payload) },
      ],
      max_tokens: 2500,
      temperature: 0.7,
    });
    const text = completion.choices[0]?.message?.content?.trim() || "";
    const lines = text
      .split(/\n?---\n?/)
      .map((l) => l.trim().replace(/^[-•*\d.)]+\s*/, ""))
      .filter((l) => l.length > 20)
      .slice(0, 10);
    return res.json({ insights: lines.length ? lines : [text] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Insights request failed" });
  }
});

/**
 * POST /insights/simulate — AI: Answer custom What-if based on simulated financials
 */
app.post("/insights/simulate", async (req, res) => {
  try {
    const aiConfig = getAIClient();
    if (!aiConfig) {
      return res.json({
        error: "No AI key configured.",
        answer: "Please configure GEMINI_API_KEY or GROQ_API_KEY in server/.env to use the AI simulator."
      });
    }
    const { client, model } = aiConfig;
    const { context, question } = req.body;
    if (!context || !question) {
      return res.status(400).json({ error: "Missing context or question." });
    }
    const sys = `You are a ruthless and highly authoritative Financial Turnaround Enforcer.

Given:
- Current financial state
- Simulated changes

You MUST take charge. Do not give soft "suggestions" or ask them to "consider" options.
1. Forcefully predict the outcome (short term + medium term).
2. Highlight exactly why their plan will fail or succeed. 
3. Tell them EXACTLY what to do instead. Use commanding verbs ("Cut costs by...", "Execute this immediately...", "Halt this expenditure...").

Keep the response aggressive, concise, and highly actionable.
Must include a blunt confidence tone (e.g., 'Failure is imminent', 'High likelihood of success', 'This is a dangerous gamble').`;

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
      model: model,
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
    console.log(`Vertex API listening on http://localhost:${PORT}`);
  });
}

export default app;
