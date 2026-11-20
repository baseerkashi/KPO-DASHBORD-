import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import multer from "multer";
import cookieParser from "cookie-parser";
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
import { computeTurnaroundTriage, simulateTurnaroundPlan } from "./turnaround-engine.js";

const app = express();
const PORT = process.env.PORT || 5001;
const rawJwtSecret = process.env.JWT_SECRET;
if (!rawJwtSecret && process.env.NODE_ENV === "production") {
  throw new Error("FATAL ERROR: JWT_SECRET environment variable must be set in production mode.");
}
const JWT_SECRET = rawJwtSecret || "dev_fallback_secret_only";

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const isProduction = process.env.NODE_ENV === "production";
const COOKIE_NAME = "vertex_jwt";
const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: isProduction,
  maxAge: 12 * 60 * 60 * 1000, // 12 hours
};

app.use(helmet());
app.use(cors({
  origin: CLIENT_ORIGIN,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));

// Normalize /api prefix so single-port production requests resolve cleanly
app.use((req, _res, next) => {
  if (req.url.startsWith("/api/")) {
    req.url = req.url.slice(4);
  } else if (req.url === "/api") {
    req.url = "/";
  }
  next();
});

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 10000 : 100,
}));

// Dedicated strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 10000 : 10,
  message: { error: "Too many authentication attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 10000 : 10,
  keyGenerator: (req) => req.user?.id || "anonymous",
  validate: { keyGeneratorIpFallback: false },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB strict limit
  fileFilter: (_req, file, cb) => {
    if (!file.originalname.match(/\.(csv|xlsx|xls)$/i)) {
      return cb(new Error("Invalid file type. Only .csv, .xlsx, and .xls files are allowed."));
    }
    cb(null, true);
  },
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
  const token = req.cookies?.[COOKIE_NAME] || (req.headers["authorization"] && req.headers["authorization"].split(" ")[1]);
  if (!token) return res.sendStatus(401);

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

app.post("/auth/login", authLimiter, (req, res) => {
  const username = typeof req.body.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (!username || !password) {
    return res.status(400).json({ error: "Username and passcode are required." });
  }

  const stmt = db.prepare("SELECT * FROM users WHERE email = ?");
  const user = stmt.get(username);
  
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role || "analyst", name: user.name },
    JWT_SECRET,
    { expiresIn: "12h" }
  );
  
  res.cookie(COOKIE_NAME, token, cookieOptions);
  logAudit(user.id, "login", "user", user.id);
  res.json({
    success: true,
    user: { id: user.id, email: user.email, role: user.role || "analyst", name: user.name },
  });
});

app.post("/auth/signup", authLimiter, (req, res) => {
  const rawEmail = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const rawName = typeof req.body.name === "string" ? req.body.name.trim().slice(0, 100) : null;
  const password = typeof req.body.password === "string" ? req.body.password : "";

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!rawEmail || !emailRegex.test(rawEmail)) {
    return res.status(400).json({ error: "Please provide a valid email address." });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters long." });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(rawEmail);
  if (existing) return res.status(409).json({ error: "User already exists." });
  
  const id = crypto.randomUUID();
  const hash = bcrypt.hashSync(password, 10);
  
  db.prepare("INSERT INTO users (id, email, password_hash, role, name, plan) VALUES (?, ?, ?, ?, ?, ?)").run(
    id, rawEmail, hash, "analyst", rawName, "free"
  );
  
  const token = jwt.sign(
    { id, email: rawEmail, role: "analyst", name: rawName },
    JWT_SECRET,
    { expiresIn: "12h" }
  );
  
  res.cookie(COOKIE_NAME, token, cookieOptions);
  logAudit(id, "signup", "user", id);
  res.json({
    success: true,
    user: { id, email: rawEmail, role: "analyst", name: rawName },
  });
});

app.post("/auth/demo", authLimiter, (req, res) => {
  const isDemoAllowed = process.env.NODE_ENV !== "production" || process.env.ENABLE_DEMO === "true";
  if (!isDemoAllowed) {
    return res.status(403).json({ error: "Demo workspace is disabled in production." });
  }

  let demoUser = db.prepare("SELECT * FROM users WHERE role = 'demo' OR email = 'demo@vertex.local'").get();
  if (!demoUser) {
    const demoId = "user_demo";
    const demoPass = crypto.randomUUID();
    const hash = bcrypt.hashSync(demoPass, 10);
    db.prepare("INSERT INTO users (id, email, password_hash, role, name, plan) VALUES (?, ?, ?, ?, ?, ?)").run(
      demoId, "demo@vertex.local", hash, "demo", "Demo Analyst", "free"
    );
    demoUser = { id: demoId, email: "demo@vertex.local", role: "demo", name: "Demo Analyst" };
  }

  const token = jwt.sign(
    { id: demoUser.id, email: demoUser.email, role: "demo", name: demoUser.name },
    JWT_SECRET,
    { expiresIn: "12h" }
  );

  res.cookie(COOKIE_NAME, token, cookieOptions);
  logAudit(demoUser.id, "demo_login", "user", demoUser.id);
  res.json({
    success: true,
    user: { id: demoUser.id, email: demoUser.email, role: "demo", name: demoUser.name },
  });
});

app.post("/auth/logout", authenticateToken, (req, res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
  });
  logAudit(req.user.id, "logout", "user", req.user.id);
  res.json({ success: true, message: "Logged out successfully" });
});

app.get("/auth/me", authenticateToken, (req, res) => {
  const user = db.prepare("SELECT id, email, role, name FROM users WHERE id = ?").get(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user });
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

app.post("/clients", authenticateToken, (req, res) => {
  const company_name = typeof req.body.company_name === "string" ? req.body.company_name.trim() : "";
  const industry = typeof req.body.industry === "string" ? req.body.industry.trim() : null;
  if (!company_name) return res.status(400).json({ error: "company_name is required" });
  
  const id = crypto.randomUUID();
  const stmt = db.prepare('INSERT INTO clients (id, user_id, company_name, industry) VALUES (?, ?, ?, ?)');
  stmt.run(id, req.user.id, company_name, industry || null);
  
  logAudit(req.user.id, "create_client", "client", id, { company_name, industry });
  res.json({ id, company_name, industry });
});

app.get("/clients/:id", authenticateToken, (req, res) => {
  const stmt = db.prepare("SELECT * FROM clients WHERE id = ? AND user_id = ?");
  const client = stmt.get(req.params.id, req.user.id);
  if (!client) return res.status(404).json({ error: "Client not found or unauthorized" });
  res.json(client);
});

app.get("/clients/:id/analyses", authenticateToken, (req, res) => {
  const client = db.prepare("SELECT id FROM clients WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!client) return res.status(404).json({ error: "Client not found or unauthorized" });

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
  const stmt = db.prepare(`
    SELECT a.* FROM analyses a
    JOIN clients c ON a.client_id = c.id
    WHERE a.id = ? AND c.user_id = ?
  `);
  const row = stmt.get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: "Analysis not found or unauthorized" });
  
  const parsedData = JSON.parse(row.parsed_data || "[]");
  const financials = JSON.parse(row.financials || "{}");
  const interviewContext = row.interview_context ? JSON.parse(row.interview_context) : {};
  const turnaround = computeTurnaroundTriage(parsedData, financials, interviewContext);
  turnaround.analysisId = row.id;

  res.json({
    id: row.id,
    client_id: row.client_id,
    period_title: row.period_title,
    parsed_data: parsedData,
    financials,
    risk: JSON.parse(row.risk_score),
    insights: row.insights ? JSON.parse(row.insights) : null,
    advanced: row.advanced_analysis ? JSON.parse(row.advanced_analysis) : null,
    validation: row.validation_results ? JSON.parse(row.validation_results) : null,
    interview_context: row.interview_context ? JSON.parse(row.interview_context) : null,
    turnaround,
  });
});

app.patch("/analyses/:id/interview", authenticateToken, (req, res) => {
  try {
    const analysisId = req.params.id;
    const stmt = db.prepare(`
      SELECT a.* FROM analyses a
      JOIN clients c ON a.client_id = c.id
      WHERE a.id = ? AND c.user_id = ?
    `);
    const row = stmt.get(analysisId, req.user.id);
    if (!row) return res.status(404).json({ error: "Analysis not found or unauthorized" });

    const existingContext = row.interview_context ? JSON.parse(row.interview_context) : {};
    const interviewContext = { ...existingContext, ...(req.body || {}) };
    db.prepare("UPDATE analyses SET interview_context = ? WHERE id = ?").run(
      JSON.stringify(interviewContext),
      analysisId
    );

    const parsedData = JSON.parse(row.parsed_data || "[]");
    const financials = JSON.parse(row.financials || "{}");
    const turnaround = computeTurnaroundTriage(parsedData, financials, interviewContext);
    turnaround.analysisId = analysisId;

    logAudit(req.user.id, "update_interview", "analysis", analysisId);

    res.json({
      success: true,
      interview_context: interviewContext,
      turnaround,
    });
  } catch (e) {
    console.error("Interview Update Error:", e);
    res.status(500).json({ error: "Failed to update interview context" });
  }
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

    const parsedData = JSON.parse(row.parsed_data || "[]");
    const financials = JSON.parse(row.financials || "{}");
    const interviewContext = row.interview_context ? JSON.parse(row.interview_context) : {};

    const turnaround = computeTurnaroundTriage(parsedData, financials, interviewContext);
    const { vitalSigns, levers, presets } = turnaround;

    // Use saved selectedLeverIds or fallback to preset
    const selectedLeverIds = Array.isArray(interviewContext.selectedLeverIds) && interviewContext.selectedLeverIds.length > 0
      ? interviewContext.selectedLeverIds
      : (presets.balanced_recovery || presets.quick_wins || []);

    const plan = simulateTurnaroundPlan(vitalSigns, levers, selectedLeverIds);
    const selectedLeversList = levers.filter(l => selectedLeverIds.includes(l.id));

    let adv = null;
    if (row.advanced_analysis) {
      try { adv = JSON.parse(row.advanced_analysis); } catch (e) {}
    }

    const doc = new PDFDocument({
      size: "LETTER",
      margin: 40,
      autoFirstPage: true,
      bufferPages: true,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${row.company_name.replace(/\s+/g, '_')}_Turnaround_Execution_Memo.pdf"`
    );

    doc.pipe(res);

    const formatMoney = (n) => {
      if (n === null || n === undefined || isNaN(n)) return "0";
      return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(n));
    };

    /* ══════════════════════════════════════════════════════════ */
    /* PAGE 1: HEADER, VITAL SIGNS & BASELINE VS RECOVERY MODEL    */
    /* ══════════════════════════════════════════════════════════ */

    // Top Brand / Advisory Pill
    doc.rect(40, 40, 532, 4).fill("#0f172a");

    // Header Title
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(18).text("TURNAROUND EXECUTION MEMO", 40, 52);
    doc.fillColor("#059669").font("Helvetica-Bold").fontSize(8.5).text("CONFIDENTIAL FINANCIAL RECOVERY & CASH PRESERVATION PLAN", 40, 73);

    // Metadata Block
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(13).text(row.company_name, 40, 90);
    doc.fillColor("#475569").font("Helvetica").fontSize(8.5).text(`Industry: ${row.industry || "General"}  |  Period: ${row.period_title}`, 40, 107);

    // Header Right
    doc.fillColor("#334155").font("Helvetica-Bold").fontSize(8.5).text("Advisory: Vertex Intelligence", 360, 54, { align: "right", width: 212 });
    doc.fillColor("#64748b").font("Helvetica").fontSize(8).text(`Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`, 360, 68, { align: "right", width: 212 });
    
    // Status Badge Right
    const statusText = vitalSigns.isCashFlowPositive ? "Sustainable" : vitalSigns.solvencyStatus;
    doc.fillColor(vitalSigns.isCashFlowPositive ? "#059669" : "#e11d48").font("Helvetica-Bold").fontSize(8.5).text(`Status: ${statusText}`, 330, 84, { align: "right", width: 242 });

    // Header separator line
    doc.moveTo(40, 124).lineTo(572, 124).lineWidth(1).strokeColor("#e2e8f0").stroke();

    // Section 1: Vital Signs
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(11).text("1. Baseline Vital Signs & Liquidity Assessment", 40, 134);
    doc.fillColor("#64748b").font("Helvetica").fontSize(8).text("Deterministic baseline derived strictly from verified uploaded financials and diagnostic interview.", 40, 149);

    // 4 Vital Sign Metric Cards
    const vitalCards = [
      {
        title: "Net Monthly Burn",
        value: vitalSigns.netMonthlyBurn > 0 ? `-$${formatMoney(vitalSigns.netMonthlyBurn)}/mo` : "$0 (Breakeven)",
        sub: "Baseline operating cash drain",
        color: vitalSigns.netMonthlyBurn > 0 ? "#e11d48" : "#059669",
      },
      {
        title: "Breakeven Gap",
        value: vitalSigns.breakevenGapMonthly > 0 ? `-$${formatMoney(vitalSigns.breakevenGapMonthly)}/mo` : "$0 (Achieved)",
        sub: "Monthly revenue shortfall",
        color: vitalSigns.breakevenGapMonthly > 0 ? "#d97706" : "#059669",
      },
      {
        title: "Days to Zero Cash",
        value: vitalSigns.daysToZeroCash !== null ? `${vitalSigns.daysToZeroCash} Days` : "Sustainable",
        sub: `Cash on hand: $${formatMoney(vitalSigns.liquidCashNow)}`,
        color: vitalSigns.daysToZeroCash !== null && vitalSigns.daysToZeroCash < 60 ? "#e11d48" : "#0f172a",
      },
      {
        title: "Zero-Cash Date",
        value: vitalSigns.zeroCashDate || "None (Sustainable)",
        sub: "Projected insolvency date",
        color: vitalSigns.zeroCashDate ? "#e11d48" : "#059669",
      },
    ];

    const cardWidth = 126;
    const cardGap = 9.3;
    const cardY = 164;
    const cardH = 58;

    vitalCards.forEach((c, idx) => {
      const x = 40 + idx * (cardWidth + cardGap);
      doc.roundedRect(x, cardY, cardWidth, cardH, 4).fillAndStroke("#f8fafc", "#e2e8f0");
      doc.fillColor("#64748b").font("Helvetica-Bold").fontSize(7.5).text(c.title.toUpperCase(), x + 8, cardY + 8, { width: cardWidth - 16 });
      doc.fillColor(c.color).font("Helvetica-Bold").fontSize(11).text(c.value, x + 8, cardY + 23, { width: cardWidth - 16 });
      doc.fillColor("#94a3b8").font("Helvetica").fontSize(7).text(c.sub, x + 8, cardY + 41, { width: cardWidth - 16 });
    });

    // Section 2: Baseline vs. Recovery Runway Model
    const sec2Y = 236;
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(11).text("2. Baseline vs. Recovery Comparison Model", 40, sec2Y);
    doc.fillColor("#64748b").font("Helvetica").fontSize(8).text(
      `Financial impact of approved turnaround plan incorporating ${selectedLeversList.length} active operational lever${selectedLeversList.length === 1 ? "" : "s"}.`,
      40,
      sec2Y + 15
    );

    // Table Header
    const tableTop = sec2Y + 32;
    doc.rect(40, tableTop, 532, 22).fill("#0f172a");
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(8);
    doc.text("METRIC", 48, tableTop + 7, { width: 152 });
    doc.text("BASELINE", 205, tableTop + 7, { width: 100 });
    doc.text("RECOVERY PLAN", 310, tableTop + 7, { width: 110 });
    doc.text("VARIANCE / GAIN", 425, tableTop + 7, { width: 140 });

    const tableRows = [
      {
        metric: "Available Liquid Capital",
        baseline: `$${formatMoney(plan.baselineCash)}`,
        recovery: `$${formatMoney(plan.recoveryCash)}`,
        delta: plan.totalOneTimeCash > 0 ? `+$${formatMoney(plan.totalOneTimeCash)} cash injected` : "$0 variance",
        highlight: plan.totalOneTimeCash > 0,
      },
      {
        metric: "Net Monthly Burn Rate",
        baseline: plan.baselineBurn > 0 ? `-$${formatMoney(plan.baselineBurn)}/mo` : "$0/mo",
        recovery: plan.recoveryBurn > 0 ? `-$${formatMoney(plan.recoveryBurn)}/mo` : "$0/mo (Sustainable)",
        delta: plan.totalMonthlyBurnReduction > 0 ? `+$${formatMoney(plan.totalMonthlyBurnReduction)}/mo saved` : "$0 variance",
        highlight: plan.totalMonthlyBurnReduction > 0,
      },
      {
        metric: "Days to Zero Cash",
        baseline: plan.baselineDays !== null ? `${plan.baselineDays} Days` : "Sustainable",
        recovery: plan.isNowSustainable ? "Sustainable (0 Burn)" : `${plan.recoveryDaysToZero} Days`,
        delta: plan.daysGained > 0 ? `+${plan.daysGained} Days gained` : "No runway change",
        highlight: plan.daysGained > 0,
      },
      {
        metric: "Zero-Cash Target Date",
        baseline: vitalSigns.zeroCashDate || "Sustainable",
        recovery: plan.isNowSustainable ? "None (Sustainable)" : (plan.recoveryZeroDate || "N/A"),
        delta: plan.isNowSustainable ? "Insolvency Avoided" : (plan.daysGained > 0 ? `Deferred by +${plan.daysGained}d` : "Unchanged"),
        highlight: plan.daysGained > 0 || plan.isNowSustainable,
      },
      {
        metric: "Solvency Risk Profile",
        baseline: vitalSigns.solvencyStatus,
        recovery: plan.recoveryStatus,
        delta: plan.isNowSustainable ? "Stabilized & Self-Sustaining" : "Extended Decision Horizon",
        highlight: plan.isNowSustainable,
      },
    ];

    let rowY = tableTop + 22;
    tableRows.forEach((r, idx) => {
      const rowH = 26;
      doc.rect(40, rowY, 532, rowH).fillAndStroke(idx % 2 === 0 ? "#ffffff" : "#f8fafc", "#e2e8f0");
      doc.fillColor("#1e293b").font("Helvetica-Bold").fontSize(8).text(r.metric, 48, rowY + 9, { width: 152 });
      doc.fillColor("#475569").font("Helvetica").fontSize(8).text(r.baseline, 205, rowY + 9, { width: 100 });
      doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(8).text(r.recovery, 310, rowY + 9, { width: 110 });
      doc.fillColor(r.highlight ? "#059669" : "#475569").font("Helvetica-Bold").fontSize(8).text(r.delta, 425, rowY + 9, { width: 140 });
      rowY += rowH;
    });

    // Executive Synthesis Box on Page 1
    const synY = rowY + 16;
    doc.roundedRect(40, synY, 532, 90, 5).fillAndStroke("#f1f5f9", "#cbd5e1");
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(9.5).text("Executive Synthesis & Board Outlook", 52, synY + 10);

    const burnReductionText = plan.totalMonthlyBurnReduction > 0
      ? `reduces net monthly burn by $${formatMoney(plan.totalMonthlyBurnReduction)}/mo (from -$${formatMoney(plan.baselineBurn)}/mo to -$${formatMoney(plan.recoveryBurn)}/mo)`
      : "maintains current burn profile";
    const cashInjectedText = plan.totalOneTimeCash > 0
      ? `injects $${formatMoney(plan.totalOneTimeCash)} in one-time liquidity via rapid AR realization and vendor standstills`
      : "requires zero external liquidity injections";
    const runwayResultText = plan.isNowSustainable
      ? "This fully closes the breakeven gap, restoring the company to sustainable positive cash flow."
      : `This extends the company's operating runway by +${plan.daysGained} days (moving zero-cash date to ${plan.recoveryZeroDate || "N/A"}), providing critical breathing room for strategic repositioning.`;

    const synthesisParagraph = `Under the selected turnaround execution plan, the company ${burnReductionText} and ${cashInjectedText}. ${runwayResultText}`;
    doc.fillColor("#334155").font("Helvetica").fontSize(8).text(synthesisParagraph, 52, synY + 26, { width: 508, lineGap: 2 });
    doc.fillColor("#64748b").font("Helvetica-Oblique").fontSize(7.5).text("Deterministic execution plan — turn to Page 2 for itemized lever breakdown and solvency diagnostics.", 52, synY + 74);

    // Page 1 Footer
    doc.fillColor("#94a3b8").font("Helvetica").fontSize(7.5).text("Vertex Intelligence • Turnaround Execution Memo", 40, 742);
    doc.text("Page 1 of 2", 525, 742, { align: "right", width: 47 });

    /* ══════════════════════════════════════════════════════════ */
    /* PAGE 2: ITEMIZED ACTION PLAN & SOLVENCY DIAGNOSTICS        */
    /* ══════════════════════════════════════════════════════════ */
    doc.addPage();

    // Top Brand Bar
    doc.rect(40, 40, 532, 4).fill("#0f172a");

    // Page 2 Header
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(14).text("TURNAROUND EXECUTION MEMO — ACTION PLAN", 40, 52);
    doc.fillColor("#64748b").font("Helvetica").fontSize(8.5).text(
      `${row.company_name}  |  Period: ${row.period_title}  |  Plan: ${selectedLeversList.length} Active Levers`,
      40,
      69
    );
    doc.fillColor("#334155").font("Helvetica-Bold").fontSize(8.5).text("Page 2 of 2", 510, 56, { align: "right", width: 62 });

    doc.moveTo(40, 84).lineTo(572, 84).lineWidth(1).strokeColor("#e2e8f0").stroke();

    // Section 3: Itemized Action Plan
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(11).text("3. Itemized Operational Action Plan (Selected Levers)", 40, 94);
    doc.fillColor("#64748b").font("Helvetica").fontSize(8).text(
      "Approved operational levers scheduled for immediate implementation with deterministic mathematical formula basis.",
      40,
      109
    );

    let leverY = 124;
    if (selectedLeversList.length === 0) {
      doc.roundedRect(40, leverY, 532, 50, 4).fillAndStroke("#f8fafc", "#e2e8f0");
      doc.fillColor("#64748b").font("Helvetica-Oblique").fontSize(8.5).text(
        "No turnaround levers selected. The baseline trajectory remains active without intervention.",
        52,
        leverY + 18
      );
      leverY += 60;
    } else {
      selectedLeversList.forEach((lever) => {
        const cardH = 52;
        doc.roundedRect(40, leverY, 532, cardH, 4).fillAndStroke("#f8fafc", "#e2e8f0");

        // Quadrant tag
        const quadLabels = {
          quick_wins: "QUICK WIN",
          strategic_fixes: "STRATEGIC FIX",
          tough_decisions: "TOUGH DECISION",
          distractions: "DISTRACTION",
        };
        const quadColors = {
          quick_wins: "#059669",
          strategic_fixes: "#2563eb",
          tough_decisions: "#e11d48",
          distractions: "#64748b",
        };
        const tagLabel = quadLabels[lever.quadrant] || "RECOVERY LEVER";
        const tagColor = quadColors[lever.quadrant] || "#0f172a";

        // Title and Tag
        doc.fillColor(tagColor).font("Helvetica-Bold").fontSize(7.5).text(`[${tagLabel}]`, 48, leverY + 8);
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(9).text(lever.title, 120, leverY + 7, { width: 280 });

        // Metrics on the right
        let impactStr = "";
        if (lever.impactType === "monthly_burn_reduction") {
          impactStr = `-$${formatMoney(lever.monthlyBurnDelta)}/mo burn`;
        } else if (lever.impactType === "one_time_cash" || lever.impactType === "cash_deferral") {
          impactStr = `+$${formatMoney(lever.cashImpact)} cash`;
        }
        if (lever.runwayDaysAdded > 0) {
          impactStr += `  (+${lever.runwayDaysAdded}d runway)`;
        }

        doc.fillColor("#059669").font("Helvetica-Bold").fontSize(8.5).text(impactStr, 400, leverY + 7, { align: "right", width: 162 });

        // Formula Basis
        doc.fillColor("#475569").font("Helvetica").fontSize(7.5).text(
          lever.formulaBasis,
          48,
          leverY + 23,
          { width: 514, lineGap: 1 }
        );

        leverY += cardH + 7;
      });
    }

    // Section 4: Solvency & Balance Sheet Diagnostics
    const sec4Y = Math.max(leverY + 8, 380);
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(11).text("4. Solvency Diagnostics & Structural Capital Health", 40, sec4Y);
    doc.fillColor("#64748b").font("Helvetica").fontSize(8).text(
      "Corporate solvency status and bankruptcy risk diagnostics.",
      40,
      sec4Y + 15
    );

    const solBoxY = sec4Y + 28;
    const solBoxH = 110;
    doc.roundedRect(40, solBoxY, 532, solBoxH, 4).fillAndStroke("#ffffff", "#e2e8f0");

    // Altman Z'-Score
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(8.5).text("Altman Z'-Score Diagnostic:", 52, solBoxY + 10);
    if (adv?.altmanZScore?.available) {
      doc.fillColor("#1e293b").font("Helvetica").fontSize(8).text(
        `${adv.altmanZScore.score} (${adv.altmanZScore.zone} Zone) — ${adv.altmanZScore.assessment || "Calculated from balance sheet metrics"}`,
        195,
        solBoxY + 10,
        { width: 365 }
      );
    } else {
      doc.fillColor("#64748b").font("Helvetica").fontSize(8).text(
        "Balance sheet columns required",
        195,
        solBoxY + 10
      );
    }

    // DuPont Decomposition
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(8.5).text("DuPont Decomposition (ROE):", 52, solBoxY + 28);
    if (adv?.duPont?.available) {
      doc.fillColor("#1e293b").font("Helvetica").fontSize(8).text(
        `ROE: ${adv.duPont.roe}% (Net Margin: ${adv.duPont.netProfitMargin}%, Asset Turnover: ${adv.duPont.assetTurnover}x, Equity Multiplier: ${adv.duPont.equityMultiplier}x)`,
        195,
        solBoxY + 28,
        { width: 365 }
      );
    } else {
      doc.fillColor("#64748b").font("Helvetica").fontSize(8).text(
        "Balance sheet columns required",
        195,
        solBoxY + 28
      );
    }

    // Solvency Status Note
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(8.5).text("Operational Solvency Profile:", 52, solBoxY + 46);
    const solvencyNote = (!adv?.altmanZScore?.available && !adv?.duPont?.available)
      ? `Baseline: ${vitalSigns.solvencyStatus} → Post-Plan: ${plan.recoveryStatus} (Note: Balance sheet columns required for structural bankruptcy scoring)`
      : `Baseline: ${vitalSigns.solvencyStatus} → Post-Plan: ${plan.recoveryStatus}`;
    doc.fillColor("#334155").font("Helvetica").fontSize(8).text(solvencyNote, 195, solBoxY + 46, { width: 365 });

    // Recommendation Note inside solvency box
    doc.fillColor("#64748b").font("Helvetica-Oblique").fontSize(7.5).text(
      "Governance Recommendation: Execute Phase 1 quick wins immediately (AR settlement discount & discretionary freeze) to halt active liquidity leakage prior to debt workout negotiations.",
      52,
      solBoxY + 76,
      { width: 508 }
    );

    // Section 5: Execution Governance & Sign-off Block
    const signY = solBoxY + solBoxH + 16;
    doc.roundedRect(40, signY, 532, 70, 4).fillAndStroke("#f8fafc", "#cbd5e1");
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(8.5).text("Execution Governance & Plan Acknowledgment", 52, signY + 9);

    doc.moveTo(52, signY + 46).lineTo(260, signY + 46).strokeColor("#94a3b8").stroke();
    doc.fillColor("#64748b").font("Helvetica").fontSize(7).text("Managing Director / Executive Committee", 52, signY + 50);

    doc.moveTo(310, signY + 46).lineTo(520, signY + 46).strokeColor("#94a3b8").stroke();
    doc.fillColor("#64748b").font("Helvetica").fontSize(7).text("Turnaround Advisory Officer / Vertex Intelligence", 310, signY + 50);

    // Page 2 Footer
    doc.fillColor("#94a3b8").font("Helvetica").fontSize(7.5).text("This execution memo is generated by Vertex Intelligence for restructuring advisory. Not legal advice.", 40, 742);
    doc.text("Page 2 of 2", 525, 742, { align: "right", width: 47 });

    doc.end();

    logAudit(req.user.id, "export_pdf", "analysis", row.id);
  } catch (e) {
    console.error("PDF Gen Error:", e);
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate PDF report" });
  }
});

app.delete("/analyses/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  const analysis = db.prepare(`
    SELECT a.id FROM analyses a
    JOIN clients c ON a.client_id = c.id
    WHERE a.id = ? AND c.user_id = ?
  `).get(id, req.user.id);
  
  if (!analysis) {
    return res.status(404).json({ error: "Analysis not found or unauthorized" });
  }
  
  db.prepare("DELETE FROM analyses WHERE id = ?").run(id);
  logAudit(req.user.id, "delete_analysis", "analysis", id);
  res.json({ success: true });
});

app.post("/analyses", authenticateToken, (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "File size exceeds 5MB limit. Please upload a smaller file." });
      }
      return res.status(400).json({ error: `File upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message || "Invalid file format." });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { client_id, period_title } = req.body;
    if (!client_id) return res.status(400).json({ error: "client_id is required." });
    if (!req.file) return res.status(400).json({ error: "No file uploaded. Use field name 'file'." });
    
    // Verify client belongs to authenticated user
    const client = db.prepare("SELECT * FROM clients WHERE id = ? AND user_id = ?").get(client_id, req.user.id);
    if (!client) return res.status(404).json({ error: "Client not found or unauthorized." });
    const industry = client.industry || null;
    
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
    const initialInterview = {
      liquidCashNow: financials.latestCash || 0,
      monthlyPayroll: 0,
      nonNegotiablePayrollPct: 75,
      collectibleOverdueAR: 0,
      monthlyVendorPayables: 0,
      vendorDeferralLeeway: "none",
      discretionarySpendMonthly: 0,
    };
    const stmt = db.prepare(
      "INSERT INTO analyses (id, client_id, period_title, parsed_data, financials, risk_score, advanced_analysis, validation_results, interview_context) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    stmt.run(
      id,
      client_id,
      period_title || "New Period",
      JSON.stringify(analysisRows),
      JSON.stringify(financials),
      JSON.stringify(risk),
      JSON.stringify(advancedAnalysis),
      JSON.stringify(validation),
      JSON.stringify(initialInterview)
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
    const stmt = db.prepare(`
      SELECT a.*, c.industry, c.company_name 
      FROM analyses a 
      JOIN clients c ON a.client_id = c.id 
      WHERE a.id = ? AND c.user_id = ?
    `);
    const row = stmt.get(analysisId, req.user.id);
    
    if (!row) return res.status(404).json({ error: "Analysis not found or unauthorized." });
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
    const sys = `You are a Senior Turnaround and Restructuring Advisor reviewing: "${row.company_name || "Subject Company"}" in the ${bench.label} industry.

ANALYTICAL CONTEXT PROVIDED:
- Altman Z'-Score: ${advanced?.altmanZScore?.available ? `${advanced.altmanZScore.score} (${advanced.altmanZScore.zone} Zone)` : "Unavailable (Balance sheet columns total_assets and equity required)"}
- DuPont ROE: ${advanced?.duPont?.available ? `${advanced.duPont.roe}% (Margin: ${advanced.duPont.netProfitMargin}%, Turnover: ${advanced.duPont.assetTurnover}x, Leverage: ${advanced.duPont.equityMultiplier}x)` : "Unavailable (Balance sheet columns total_assets and equity required)"}
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

app.post("/insights/simulate", authenticateToken, aiLimiter, async (req, res) => {
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
  const client = db.prepare("SELECT id FROM clients WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!client) return res.status(404).json({ error: "Client not found or unauthorized" });

  let ids = (req.query.ids || "").split(",").filter(Boolean);
  if (ids.length < 2) {
    const rows = db.prepare("SELECT id FROM analyses WHERE client_id = ? ORDER BY created_at ASC").all(req.params.id);
    ids = rows.map(r => r.id);
  }
  if (ids.length < 2) return res.status(400).json({ error: "Provide at least 2 analysis IDs (ids=a,b)" });
  
  const analyses = ids.map(id => {
    const row = db.prepare(`
      SELECT a.* FROM analyses a
      JOIN clients c ON a.client_id = c.id
      WHERE a.id = ? AND a.client_id = ? AND c.user_id = ?
    `).get(id, req.params.id, req.user.id);
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
    { key: "runway", label: "Runway", format: "runway" },
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
        value: a.financials[m.key] !== undefined ? a.financials[m.key] : null,
      });
    }
    // Calculate variance between first and last
    const firstVal = row.values[0].value;
    const lastVal = row.values[row.values.length - 1].value;
    const firstNum = typeof firstVal === "number" && !isNaN(firstVal) ? firstVal : 0;
    const lastNum = typeof lastVal === "number" && !isNaN(lastVal) ? lastVal : 0;
    row.variance = {
      absolute: Math.round((lastNum - firstNum) * 100) / 100,
      percent: firstNum !== 0 ? Math.round(((lastNum - firstNum) / Math.abs(firstNum)) * 10000) / 100 : 0,
    };
    comparison.push(row);
  }
  
  // Risk comparison
  comparison.push({
    metric: "Risk Score",
    format: "score",
    values: analyses.map(a => ({ period: a.period_title, value: a.risk?.riskScore || 0 })),
    variance: {
      absolute: (analyses[analyses.length - 1].risk?.riskScore || 0) - (analyses[0].risk?.riskScore || 0),
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
  const demoInterview = {
    liquidCashNow: 210000,
    monthlyPayroll: 65000,
    nonNegotiablePayrollPct: 75,
    collectibleOverdueAR: 42000,
    monthlyVendorPayables: 24000,
    vendorDeferralLeeway: "30_days",
    discretionarySpendMonthly: 8500,
  };

  db.prepare(
    "INSERT INTO analyses (id, client_id, period_title, parsed_data, financials, risk_score, advanced_analysis, validation_results, interview_context) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    analysisId,
    clientId,
    "FY 2024 Annual Review",
    JSON.stringify(demoRows),
    JSON.stringify(financials),
    JSON.stringify(risk),
    JSON.stringify({ altmanZScore: altmanZ, duPont, variance, benchmark }),
    JSON.stringify({ warnings: [], errors: [], valid: true }),
    JSON.stringify(demoInterview)
  );

  logAudit(req.user.id, "seed_demo", "client", clientId);
  res.json({ client_id: clientId, analysis_id: analysisId, message: "Demo data created" });
});

/* ══════════════════════════════════════════════════════════ */
/*  STATIC CLIENT SERVING & SPA FALLBACK (Production)         */
/* ══════════════════════════════════════════════════════════ */

if (process.env.NODE_ENV === "production") {
  const clientDistPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../client/dist");
  app.use(express.static(clientDistPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
}

/* ══════════════════════════════════════════════════════════ */
/*  START SERVER                                             */
/* ══════════════════════════════════════════════════════════ */

const isDirectRun = Boolean(
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
);

if (isDirectRun && process.env.NODE_ENV !== "test" && !process.env.DISABLE_LISTEN) {
  app.listen(PORT, () => {
    console.log(`Vertex API v2.0 listening on http://localhost:${PORT}`);
  });
}

export default app;
