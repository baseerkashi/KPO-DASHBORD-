import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { parse } from "csv-parse/sync";
import * as xlsx from "xlsx";
import OpenAI from "openai";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import PDFDocument from "pdfkit";
import db from "./db.js";
import {
  detectColumns,
  parseNumericRows,
  computeFinancials,
  computeRisk,
  buildInsightPayload,
} from "./analysis.js";
import {
  computeAltmanZScore,
  computeDuPont,
  computeVarianceAnalysis,
  validateData,
  computeEnhancedRisk,
} from "./analysis-advanced.js";
import { benchmarkAnalysis, getBenchmark } from "./benchmarks.js";
import { smartIngest } from "./smart-ingest.js";

const app = express();
const PORT = process.env.PORT || 5001;
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === "production") {
  console.error("FATAL ERROR: JWT_SECRET must be set in production.");
  process.exit(1);
}
JWT_SECRET = JWT_SECRET || "dev_fallback_secret_only";

app.use(helmet());
app.use(cors({ origin: ['https://vertex.app', 'http://localhost:5173'] }));
app.use(express.json({ limit: "2mb" }));
app.use(rateLimit({ windowMs: 15*60*1000, max: 100 }));

const aiLimiter = rateLimit({ windowMs: 60*60*1000, max: 10, keyGenerator: req => req.user.id });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

/* ══════════════════════════════════════════════════════════ */
/*  UTILITY: Audit Logging                                   */
/* ══════════════════════════════════════════════════════════ */

function logAudit(userId, action, entityType, entityId, details = null) {
  try {
    const id = crypto.randomUUID();
    db.prepare(
      "INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, userId, action, entityType, entityId, details ? JSON.stringify(details) : null);
  } catch (e) {
    console.error("Audit log write failed:", e.message);
  }
}

/* ══════════════════════════════════════════════════════════ */
/*  HEALTH CHECK                                             */
/* ══════════════════════════════════════════════════════════ */

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "vertex-intelligence-api", version: "2.0.0" });
});

/* ══════════════════════════════════════════════════════════ */
/*  AUTH MIDDLEWARE                                           */
/* ══════════════════════════════════════════════════════════ */

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

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

/* ══════════════════════════════════════════════════════════ */
/*  AUTH ROUTES                                              */
/* ══════════════════════════════════════════════════════════ */

app.post("/auth/login", (req, res) => {
  const { username, password } = req.body;
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  const user = stmt.get(username);
  
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role || "analyst", plan: user.plan || "free", name: user.name },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
  
  logAudit(user.id, "login", "user", user.id);
  res.json({ token, user: { id: user.id, email: user.email, role: user.role, plan: user.plan || "free", name: user.name } });
});

app.post("/auth/signup", (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || password.length < 8) {
    return res.status(400).json({ error: "Invalid email or password too short (min 8 chars)" });
  }
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return res.status(409).json({ error: "User already exists." });
  
  const id = crypto.randomUUID();
  const hash = bcrypt.hashSync(password, 10);
  
  db.prepare("INSERT INTO users (id, email, password_hash, role, name, plan) VALUES (?, ?, ?, ?, ?, ?)").run(
    id, email, hash, "analyst", name || null, "free"
  );
  
  const token = jwt.sign(
    { id, email, role: "analyst", plan: "free", name },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
  
  logAudit(id, "signup", "user", id);
  res.json({ token, user: { id, email, role: "analyst", plan: "free", name } });
});

app.post("/auth/register", authenticateToken, (req, res) => {
  // Only admins can register new users
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Only admins can register new users." });
  }
  
  const { email, password, role } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required." });
  
  // Check if user already exists
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return res.status(409).json({ error: "User already exists." });
  
  const id = crypto.randomUUID();
  const hash = bcrypt.hashSync(password, 10);
  const userRole = (role === "admin" || role === "analyst" || role === "viewer") ? role : "analyst";
  
  db.prepare("INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)").run(
    id, email, hash, userRole
  );
  
  logAudit(req.user.id, "register_user", "user", id, { email, role: userRole });
  res.json({ id, email, role: userRole });
});

/* ══════════════════════════════════════════════════════════ */
/*  CLIENT MANAGEMENT                                        */
/* ══════════════════════════════════════════════════════════ */

app.get("/clients", authenticateToken, (req, res) => {
  const stmt = db.prepare('SELECT * FROM clients WHERE user_id = ? ORDER BY created_at DESC');
  res.json(stmt.all(req.user.id));
});

const PLAN_LIMITS = {
  free:       { clients: 2,  analyses: 5,   aiInsights: 3   },
  pro:        { clients: 25, analyses: 50,  aiInsights: 999 },
  team:       { clients: -1, analyses: 200, aiInsights: 999 },
  enterprise: { clients: -1, analyses: -1,  aiInsights: -1  },
};

app.post("/clients", authenticateToken, (req, res) => {
  const { company_name, industry } = req.body;
  if (!company_name) return res.status(400).json({ error: "company_name is required" });
  
  const plan = req.user.plan || 'free';
  const limit = PLAN_LIMITS[plan]?.clients || 2;
  
  if (limit !== -1) {
    const { c } = db.prepare("SELECT count(*) as c FROM clients WHERE user_id = ?").get(req.user.id);
    if (c >= limit) {
      return res.status(403).json({ error: "Client limit reached. Upgrade to Pro." });
    }
  }
  
  const id = crypto.randomUUID();
  const stmt = db.prepare('INSERT INTO clients (id, user_id, company_name, industry) VALUES (?, ?, ?, ?)');
  stmt.run(id, req.user.id, company_name, industry || null);
  
  logAudit(req.user.id, "create_client", "client", id, { company_name, industry });
  res.json({ id, company_name, industry });
});

app.get("/clients/:id", authenticateToken, (req, res) => {
  const stmt = db.prepare("SELECT * FROM clients WHERE id = ? AND user_id = ?");
  const client = stmt.get(req.params.id, req.user.id);
  if (!client) return res.status(404).json({ error: "Client not found" });
  res.json(client);
});

app.get("/clients/:id/analyses", authenticateToken, (req, res) => {
  const stmt = db.prepare('SELECT id, period_title, created_at FROM analyses WHERE client_id = ? ORDER BY created_at DESC');
  res.json(stmt.all(req.params.id));
});

app.delete("/clients/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  const client = db.prepare("SELECT * FROM clients WHERE id = ? AND user_id = ?").get(id, req.user.id);
  if (!client) return res.status(404).json({ error: "Client not found or unauthorized" });
  
  // Delete all analyses associated with this client
  db.prepare("DELETE FROM analyses WHERE client_id = ?").run(id);
  // Delete client
  db.prepare("DELETE FROM clients WHERE id = ? AND user_id = ?").run(id, req.user.id);
  
  logAudit(req.user.id, "delete_client", "client", id);
  res.json({ success: true });
});

/* ══════════════════════════════════════════════════════════ */
/*  ANALYSIS ENDPOINTS                                       */
/* ══════════════════════════════════════════════════════════ */

app.get("/analyses/:id", authenticateToken, (req, res) => {
  const stmt = db.prepare('SELECT * FROM analyses WHERE id = ?');
  const row = stmt.get(req.params.id);
  if (!row) return res.status(404).json({ error: "Analysis not found" });
  
  res.json({
    id: row.id,
    client_id: row.client_id,
    period_title: row.period_title,
    parsed_data: JSON.parse(row.parsed_data),
    financials: JSON.parse(row.financials),
    risk: JSON.parse(row.risk_score),
    insights: row.insights ? JSON.parse(row.insights) : null,
    advanced: row.advanced_analysis ? JSON.parse(row.advanced_analysis) : null,
    validation: row.validation_results ? JSON.parse(row.validation_results) : null,
  });
});

app.get("/analyses/:id/report", authenticateToken, (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT a.*, c.company_name, c.industry 
      FROM analyses a 
      JOIN clients c ON a.client_id = c.id 
      WHERE a.id = ? AND c.user_id = ?
    `);
    const row = stmt.get(req.params.id, req.user.id);
    
    if (!row) return res.status(404).json({ error: "Analysis not found or unauthorized" });
    
    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${row.company_name.replace(/\s+/g, '_')}_Financial_Report.pdf"`);
    
    doc.pipe(res);
    
    doc.fontSize(24).font('Helvetica-Bold').text("Vertex Intelligence", { align: 'center' });
    doc.fontSize(10).font('Helvetica').text("CONFIDENTIAL CREDIT ASSESSMENT REPORT", { align: 'center' });
    doc.moveDown(2);
    
    doc.fontSize(16).font('Helvetica-Bold').text(row.company_name);
    doc.fontSize(12).font('Helvetica').text(`Period: ${row.period_title}`);
    doc.text(`Industry: ${row.industry || 'General'}`);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`);
    doc.moveDown(2);
    
    const risk = JSON.parse(row.risk_score);
    doc.fontSize(14).font('Helvetica-Bold').text("Overall Risk Assessment", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').text(`Risk Score: ${risk.riskScore} / 100`);
    doc.text(`Risk Category: ${risk.riskLevel}`);
    doc.moveDown(1.5);
    
    const fin = JSON.parse(row.financials);
    doc.fontSize(14).font('Helvetica-Bold').text("Key Financial Metrics", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').text(`Average Monthly Revenue: $${Math.round(fin.totalRevenue / fin.monthCount).toLocaleString()}`);
    doc.text(`Average Monthly Profit: $${Math.round(fin.netProfit / fin.monthCount).toLocaleString()}`);
    doc.text(`Profit Margin: ${fin.profitMargin}%`);
    doc.text(`Average Growth Rate: ${fin.averageMonthlyGrowthRate}%`);
    if (fin.runway !== null) doc.text(`Cash Runway: ${fin.runway} months`);
    doc.moveDown(1.5);
    
    if (row.insights) {
      const insights = JSON.parse(row.insights);
      doc.fontSize(14).font('Helvetica-Bold').text("AI Strategic Insights", { underline: true });
      doc.moveDown(0.5);
      
      insights.forEach(insight => {
        doc.fontSize(11).font('Helvetica-Bold').text(`[${insight.category}] ${insight.observation}`);
        doc.fontSize(10).font('Helvetica').text(`Risk Impact: ${insight.risk}`);
        doc.text(`Action: ${insight.recommendation}`);
        doc.moveDown(0.8);
      });
    }
    
    doc.fontSize(8).font('Helvetica-Oblique').text("This report is generated automatically by Vertex AI. Not financial advice.", 50, doc.page.height - 50, { align: 'center' });
    
    doc.end();
    
    logAudit(req.user.id, "export_pdf", "analysis", row.id);
  } catch (e) {
    console.error("PDF Gen Error:", e);
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate PDF report" });
  }
});

app.delete("/analyses/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  // Make sure user owns the client this analysis belongs to
  const analysis = db.prepare("SELECT a.id, c.user_id FROM analyses a JOIN clients c ON a.client_id = c.id WHERE a.id = ?").get(id);
  
  if (!analysis || analysis.user_id !== req.user.id) {
    return res.status(404).json({ error: "Analysis not found or unauthorized" });
  }
  
  db.prepare("DELETE FROM analyses WHERE id = ?").run(id);
  logAudit(req.user.id, "delete_analysis", "analysis", id);
  res.json({ success: true });
});

app.post("/analyses", authenticateToken, upload.single("file"), async (req, res) => {
  try {
    const { client_id, period_title } = req.body;
    if (!client_id) return res.status(400).json({ error: "client_id is required." });
    if (!req.file) return res.status(400).json({ error: "No file uploaded. Use field name 'file'." });
    
    // Get client info for industry benchmarking
    const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(client_id);
    const industry = client?.industry || null;
    
    let records = [];
    let headers = [];
    
    const isExcel = req.file.originalname.match(/\.(xlsx|xls)$/i) || 
                   req.file.mimetype.includes("spreadsheetml") || 
                   req.file.mimetype.includes("excel");
                   
    if (isExcel) {
      const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const text = xlsx.utils.sheet_to_csv(sheet);
      records = parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      });
    } else {
      const text = req.file.buffer.toString("utf8");
      records = parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      });
    }
    
    if (!records.length) {
      return res.status(400).json({ error: "File is empty or could not be parsed." });
    }
    
    headers = Object.keys(records[0]);

    // ─── SMART INGESTION PIPELINE ───
    // Try AI-powered smart ingestion first (handles messy data)
    const aiConfig = getAIClient();
    const ingestion = await smartIngest(records, headers, aiConfig);
    
    let analysisRows;
    let ingestionMeta = {};
    
    if (ingestion.rows.length >= 2) {
      // Smart ingestion succeeded
      analysisRows = ingestion.rows;
      ingestionMeta = {
        method: ingestion.method,
        mapping: ingestion.mapping,
        warnings: ingestion.warnings,
        notes: ingestion.notes,
        cleanedCount: ingestion.cleanedCount,
        droppedCount: ingestion.droppedCount,
      };
    } else {
      // Fallback to old parser
      const columnKeys = detectColumns(headers);
      const parsed = parseNumericRows(records, columnKeys);
      
      if (parsed.error) {
        return res.status(400).json({ 
          error: "Could not parse the file. " + parsed.error,
          hint: "Try renaming columns to: month, sales, expenses, cash, debt",
          headers, 
          detectedMapping: ingestion.mapping,
          ingestionWarnings: ingestion.warnings,
        });
      }
      
      analysisRows = parsed.rows;
      ingestionMeta = {
        method: "legacy-parser (fallback)",
        mapping: columnKeys,
        warnings: ingestion.warnings.concat(["Smart ingestion found <2 rows. Used legacy parser."]),
      };
    }

    // ─── Data Validation ───
    const validation = validateData(analysisRows);
    // Merge ingestion warnings into validation
    if (ingestionMeta.warnings?.length) {
      validation.warnings = [...(ingestionMeta.warnings || []), ...(validation.warnings || [])];
    }
    
    // ─── Core Metrics ───
    const financials = computeFinancials(analysisRows);
    
    // ─── Enhanced Risk (10-factor) ───
    const risk = computeEnhancedRisk(analysisRows, financials, industry);
    
    // ─── Advanced Analysis ───
    const altmanZ = computeAltmanZScore(analysisRows, financials);
    const duPont = computeDuPont(analysisRows, financials);
    const variance = computeVarianceAnalysis(analysisRows, financials);
    const benchmark = benchmarkAnalysis(financials, industry);
    
    const advancedAnalysis = {
      altmanZScore: altmanZ,
      duPont,
      variance,
      benchmark,
    };

    // ─── Save to Database ───
    const id = crypto.randomUUID();
    const stmt = db.prepare(
      "INSERT INTO analyses (id, client_id, period_title, parsed_data, financials, risk_score, advanced_analysis, validation_results) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    stmt.run(
      id,
      client_id,
      period_title || "New Period",
      JSON.stringify(analysisRows),
      JSON.stringify(financials),
      JSON.stringify(risk),
      JSON.stringify(advancedAnalysis),
      JSON.stringify(validation)
    );

    logAudit(req.user.id, "create_analysis", "analysis", id, { 
      client_id, period_title, rows: analysisRows.length,
      ingestionMethod: ingestionMeta.method,
    });

    return res.json({ 
      id,
      ingestion: ingestionMeta,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Analysis failed" });
  }
});

/* ══════════════════════════════════════════════════════════ */
/*  AI INSIGHTS (Enhanced with Industry Context)             */
/* ══════════════════════════════════════════════════════════ */

app.post("/analyses/:id/insights", authenticateToken, aiLimiter, async (req, res) => {
  try {
    const analysisId = req.params.id;
    const stmt = db.prepare('SELECT a.*, c.industry, c.company_name FROM analyses a LEFT JOIN clients c ON a.client_id = c.id WHERE a.id = ?');
    const row = stmt.get(analysisId);
    
    if (!row) return res.status(404).json({ error: "Analysis not found." });
    if (row.insights) return res.json({ insights: JSON.parse(row.insights) });

    const aiConfig = getAIClient();
    if (!aiConfig) {
      return res.json({
        error: "No AI key configured. Set GEMINI_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY in server/.env.",
        insights: [
          { category: "Setup", observation: "AI not configured", risk: "Cannot generate AI insights", evidence: "No API Key in .env", recommendation: "Add GEMINI_API_KEY or OPENAI_API_KEY to server/.env", confidenceScore: 1 }
        ]
      });
    }

    const { client, model } = aiConfig;
    const financials = JSON.parse(row.financials);
    const risk = JSON.parse(row.risk_score);
    const advanced = row.advanced_analysis ? JSON.parse(row.advanced_analysis) : null;
    const industry = row.industry || "general business";
    const bench = getBenchmark(industry);
    
    // Build enhanced system prompt with real context
    const sys = `You are a Senior Credit Analyst at a top-tier KPO firm reviewing: "${row.company_name || "Subject Company"}" in the ${bench.label} industry.

ANALYTICAL CONTEXT PROVIDED:
- Altman Z-Score: ${advanced?.altmanZScore?.available ? `${advanced.altmanZScore.score} (${advanced.altmanZScore.zone} Zone)` : "Not computed"}
- DuPont ROE: ${advanced?.duPont?.available ? `${advanced.duPont.roe}% (Margin: ${advanced.duPont.netProfitMargin}%, Turnover: ${advanced.duPont.assetTurnover}x, Leverage: ${advanced.duPont.equityMultiplier}x)` : "N/A"}
- Industry Median Profit Margin: ${bench.profitMargin.median}% (this company: ${financials.profitMargin}%)
- Industry Median Growth: ${bench.revenueGrowth.median}% (this company: ${financials.averageMonthlyGrowthRate}%)
- Risk Score: ${risk.riskScore}/100 (${risk.riskLevel})

RULES:
1. Every claim MUST cite a specific number from the provided data or computed metrics.
2. Compare against industry benchmarks and state if the company is above/below median.
3. Reference the Altman Z-Score zone and DuPont components where relevant.
4. Rate confidence 1-5 based on data quality and completeness.
5. If data is insufficient for a definitive conclusion, say so explicitly.
6. Be direct and actionable — no vague suggestions.

Output a JSON array of 3-5 critical insights.
Format EXACTLY as:
[
  {
    "category": "Liquidity | Growth | Profitability | Debt | Solvency",
    "observation": "Factual statement citing specific metrics",
    "risk": "What this means for creditworthiness and business survival",
    "evidence": "Specific calculation or ratio proving this",
    "recommendation": "Precise, calculated action to take with expected impact",
    "confidenceScore": 1 to 5
  }
]
Output ONLY valid JSON. No markdown wrappers.`;

    const payload = buildInsightPayload(financials, risk, JSON.parse(row.parsed_data).length);
    // Add advanced analysis to the payload sent to AI
    if (advanced) {
      payload.advanced = {
        altmanZScore: advanced.altmanZScore,
        duPont: advanced.duPont,
        industryBenchmark: advanced.benchmark?.industryLabel,
      };
    }
    
    const completion = await client.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: JSON.stringify(payload) },
      ],
      max_tokens: 3000,
      temperature: 0.1,
    });

    let text = completion.choices[0]?.message?.content?.trim() || "";
    text = text.replace(/^```json/g, '').replace(/```$/g, '').trim(); 
    
    try {
      const parsedInsights = JSON.parse(text);
      const updateStmt = db.prepare('UPDATE analyses SET insights = ? WHERE id = ?');
      updateStmt.run(JSON.stringify(parsedInsights), analysisId);
      
      logAudit(req.user.id, "generate_insights", "analysis", analysisId);
      return res.json({ insights: parsedInsights });
    } catch (parseError) {
      console.error("AI output was not valid JSON:", text);
      return res.status(500).json({ error: "AI produced invalid JSON format." });
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Insights request failed" });
  }
});

/* ══════════════════════════════════════════════════════════ */
/*  SCENARIO SIMULATION                                      */
/* ══════════════════════════════════════════════════════════ */

app.post("/insights/simulate", authenticateToken, async (req, res) => {
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
    const sys = `You are a conservative Credit Analyst discussing simulated scenario.

Given:
- Current financial state
- Simulated changes

You MUST take charge. Do not give soft "suggestions".
1. Forcefully predict the outcome.
2. Highlight exactly why their plan will fail or succeed based on numbers. 
3. Tell them EXACTLY what to do instead.`;

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
    
    logAudit(req.user.id, "simulate", "analysis", null, { question });
    return res.json({ answer });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Simulation request failed" });
  }
});

/* ══════════════════════════════════════════════════════════ */
/*  AUDIT LOG                                                */
/* ══════════════════════════════════════════════════════════ */

app.get("/audit-log", authenticateToken, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin only" });
  }
  const limit = parseInt(req.query.limit) || 50;
  const logs = db.prepare(
    "SELECT al.*, u.email FROM audit_log al LEFT JOIN users u ON al.user_id = u.id ORDER BY al.created_at DESC LIMIT ?"
  ).all(limit);
  res.json(logs);
});

/* ══════════════════════════════════════════════════════════ */
/*  EXCEL TEMPLATE DOWNLOAD                                  */
/* ══════════════════════════════════════════════════════════ */

app.get("/template", (_req, res) => {
  const wb = xlsx.utils.book_new();
  
  const sampleData = [
    { month: "Jan-2024", sales: 50000, expenses: 42000, cash: 30000, debt: 15000 },
    { month: "Feb-2024", sales: 53000, expenses: 41500, cash: 38500, debt: 14500 },
    { month: "Mar-2024", sales: 55000, expenses: 43000, cash: 47000, debt: 14000 },
    { month: "Apr-2024", sales: "", expenses: "", cash: "", debt: "" },
    { month: "May-2024", sales: "", expenses: "", cash: "", debt: "" },
    { month: "Jun-2024", sales: "", expenses: "", cash: "", debt: "" },
  ];
  
  const ws = xlsx.utils.json_to_sheet(sampleData);
  
  // Set column widths
  ws["!cols"] = [
    { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
  ];
  
  xlsx.utils.book_append_sheet(wb, ws, "Financial Data");
  
  // Instructions sheet
  const instructions = [
    { Instructions: "VERTEX FINANCIAL DATA TEMPLATE" },
    { Instructions: "" },
    { Instructions: "Required Columns:" },
    { Instructions: "  month (or 'period', 'date') - Period identifier" },
    { Instructions: "  sales (or 'revenue', 'income') - Total revenue for the period" },
    { Instructions: "  expenses (or 'costs', 'total_cost') - Total expenses for the period" },
    { Instructions: "" },
    { Instructions: "Optional Columns (recommended):" },
    { Instructions: "  cash (or 'cash_balance') - Cash on hand at end of period" },
    { Instructions: "  debt (or 'liabilities', 'loans') - Total outstanding debt" },
    { Instructions: "  workforce (or 'employees') - Employee count" },
    { Instructions: "" },
    { Instructions: "For expense breakdown, add columns like: 'rent', 'salaries', 'marketing', etc." },
    { Instructions: "" },
    { Instructions: "For advanced analysis (Altman Z-Score, DuPont), add:" },
    { Instructions: "  total_assets - Total assets" },
    { Instructions: "  equity - Total equity / net worth" },
    { Instructions: "  retained_earnings - Accumulated retained earnings" },
    { Instructions: "" },
    { Instructions: "Fill in at least 6 months of data for meaningful analysis." },
  ];
  
  const ws2 = xlsx.utils.json_to_sheet(instructions);
  ws2["!cols"] = [{ wch: 70 }];
  xlsx.utils.book_append_sheet(wb, ws2, "Instructions");
  
  const buf = xlsx.write(wb, { bookType: "xlsx", type: "buffer" });
  
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=Vertex_Template.xlsx");
  res.send(buf);
});

/* ══════════════════════════════════════════════════════════ */
/*  MULTI-PERIOD COMPARISON                                  */
/* ══════════════════════════════════════════════════════════ */

app.get("/clients/:id/compare", authenticateToken, (req, res) => {
  const ids = (req.query.ids || "").split(",").filter(Boolean);
  if (ids.length < 2) return res.status(400).json({ error: "Provide at least 2 analysis IDs (ids=a,b)" });
  
  const analyses = ids.map(id => {
    const row = db.prepare("SELECT * FROM analyses WHERE id = ?").get(id);
    if (!row) return null;
    return {
      id: row.id,
      period_title: row.period_title,
      financials: JSON.parse(row.financials),
      risk: JSON.parse(row.risk_score),
      advanced: row.advanced_analysis ? JSON.parse(row.advanced_analysis) : null,
    };
  }).filter(Boolean);
  
  if (analyses.length < 2) return res.status(404).json({ error: "One or more analyses not found." });
  
  // Compute comparison
  const comparison = [];
  const metrics = [
    { key: "totalRevenue", label: "Total Revenue", format: "currency" },
    { key: "totalExpenses", label: "Total Expenses", format: "currency" },
    { key: "netProfit", label: "Net Profit", format: "currency" },
    { key: "profitMargin", label: "Profit Margin (%)", format: "percent" },
    { key: "averageMonthlyGrowthRate", label: "Avg Growth (%)", format: "percent" },
    { key: "burnRate", label: "Monthly Burn", format: "currency" },
    { key: "debtToIncomeRatio", label: "Debt/Income Ratio", format: "ratio" },
  ];
  
  for (const m of metrics) {
    const row = { metric: m.label, format: m.format, values: [] };
    for (const a of analyses) {
      row.values.push({
        period: a.period_title,
        value: a.financials[m.key],
      });
    }
    // Calculate variance between first and last
    const first = row.values[0].value;
    const last = row.values[row.values.length - 1].value;
    row.variance = {
      absolute: Math.round((last - first) * 100) / 100,
      percent: first !== 0 ? Math.round(((last - first) / Math.abs(first)) * 10000) / 100 : 0,
    };
    comparison.push(row);
  }
  
  // Risk comparison
  comparison.push({
    metric: "Risk Score",
    format: "score",
    values: analyses.map(a => ({ period: a.period_title, value: a.risk.riskScore })),
    variance: {
      absolute: analyses[analyses.length - 1].risk.riskScore - analyses[0].risk.riskScore,
      percent: 0,
    },
  });
  
  res.json({ analyses: analyses.map(a => ({ id: a.id, period: a.period_title })), comparison });
});

/* ══════════════════════════════════════════════════════════ */
/*  DEMO DATA SEED                                           */
/* ══════════════════════════════════════════════════════════ */

app.post("/seed-demo", authenticateToken, (req, res) => {
  const clientId = crypto.randomUUID();
  db.prepare("INSERT INTO clients (id, user_id, company_name, industry) VALUES (?, ?, ?, ?)").run(
    clientId, req.user.id, "Acme Manufacturing Co.", "manufacturing"
  );

  const demoRows = [
    { month: "Jan-2024", sales: 120000, expenses: 95000, cash: 85000, liabilities: 45000 },
    { month: "Feb-2024", sales: 125000, expenses: 98000, cash: 92000, liabilities: 43000 },
    { month: "Mar-2024", sales: 118000, expenses: 96000, cash: 88000, liabilities: 42000 },
    { month: "Apr-2024", sales: 132000, expenses: 102000, cash: 96000, liabilities: 40000 },
    { month: "May-2024", sales: 128000, expenses: 99000, cash: 103000, liabilities: 38000 },
    { month: "Jun-2024", sales: 140000, expenses: 105000, cash: 115000, liabilities: 36000 },
    { month: "Jul-2024", sales: 135000, expenses: 101000, cash: 124000, liabilities: 34000 },
    { month: "Aug-2024", sales: 145000, expenses: 108000, cash: 137000, liabilities: 32000 },
    { month: "Sep-2024", sales: 142000, expenses: 106000, cash: 150000, liabilities: 30000 },
    { month: "Oct-2024", sales: 155000, expenses: 112000, cash: 168000, liabilities: 28000 },
    { month: "Nov-2024", sales: 160000, expenses: 115000, cash: 185000, liabilities: 26000 },
    { month: "Dec-2024", sales: 170000, expenses: 120000, cash: 210000, liabilities: 24000 },
  ];

  const financials = computeFinancials(demoRows);
  const risk = computeEnhancedRisk(demoRows, financials, "manufacturing");
  const altmanZ = computeAltmanZScore(demoRows, financials);
  const duPont = computeDuPont(demoRows, financials);
  const variance = computeVarianceAnalysis(demoRows, financials);
  const benchmark = benchmarkAnalysis(financials, "manufacturing");

  const analysisId = crypto.randomUUID();
  db.prepare(
    "INSERT INTO analyses (id, client_id, period_title, parsed_data, financials, risk_score, advanced_analysis, validation_results) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    analysisId,
    clientId,
    "FY 2024 Annual Review",
    JSON.stringify(demoRows),
    JSON.stringify(financials),
    JSON.stringify(risk),
    JSON.stringify({ altmanZScore: altmanZ, duPont, variance, benchmark }),
    JSON.stringify({ warnings: [], errors: [], valid: true })
  );

  logAudit(req.user.id, "seed_demo", "client", clientId);
  res.json({ client_id: clientId, analysis_id: analysisId, message: "Demo data created" });
});

/* ══════════════════════════════════════════════════════════ */
/*  START SERVER                                             */
/* ══════════════════════════════════════════════════════════ */

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Vertex API v2.0 listening on http://localhost:${PORT}`);
  });
}

export default app;
