# Vertex — Financial Triage & Turnaround Advisor

An institutional-grade financial triage and restructuring cockpit designed for turnaround advisors, distressed enterprise operators, and fractional CFOs. Vertex eliminates financial panic by diagnosing cash runway, prioritizing high-impact liquidity levers with minimal operational friction, and generating auditable recovery execution playbooks with deterministic mathematical rigor.

---

## ⚡ The 4-Step Restructuring Workflow

```
┌─────────────────────────┐       ┌─────────────────────────┐
│ 1. Ingest Financials    │       │ 2. 60-Sec Triage        │
│ Upload raw CSV or XLSX  │ ────> │ Enter current bank cash │
│ records; auto-scrubs    │       │ and identify overdue    │
│ columns & currency tags │       │ receivables & payables  │
└─────────────────────────┘       └─────────────────────────┘
             │                                 │
             ▼                                 ▼
┌─────────────────────────┐       ┌─────────────────────────┐
│ 3. Impact vs. Pain      │       │ 4. Executive Memo       │
│ Simulate Quick Wins vs. │ ────> │ Export client-ready     │
│ Strategic Deferrals in  │       │ 2-page auditable PDF    │
│ interactive 2x2 sandbox │       │ turnaround blueprint    │
└─────────────────────────┘       └─────────────────────────┘
```

1. **Ingest Financial Records**: Upload historical monthly CSV or Excel statements. The intake pipeline detects columns, standardizes accounting negatives `(1,200)`, strips currency symbols/Lakhs/Crores, and removes summary rows.
2. **60-Second Diagnostic Interview**: Enter verified liquid bank cash, non-negotiable payroll floor, overdue accounts receivable, and vendor payables leeway.
3. **Vital Signs & Impact vs. Pain Sandbox**: Real-time runway simulation (`Days to Zero Cash` $\rightarrow$ `Recovery Runway`) comparing Quick Wins, Balanced Recovery, and Maximum Survival playbooks.
4. **Executive Turnaround Memo**: 2-page institutional restructuring memo generated server-side via PDFKit with complete audit logs for lenders, partners, and stakeholders.

---

## 🛡️ Mathematical Honesty & Security Highlights

- **Pure Deterministic Turnaround Math**: Zero hallucinated dollar amounts or arbitrary multipliers. Runway days, daily burn, and recovery extensions derive strictly from verified accounting entries.
- **Zero Proxy Balance-Sheet Fabrication**: Solvency indicators (Altman Z'-Score and DuPont 3-factor ROE) compute **strictly** when verified `total_assets` and `equity` columns are present. If missing, Vertex clearly reports `insufficient_data` instead of inventing proxy balance sheets.
- **Multi-Tenant Ownership Isolation (IDOR Defense)**: Every company, assessment, diagnostic interview, and PDF memo is strictly scoped to the authenticated `user_id`. Attempted cross-tenant access returns an immediate `404 Not Found`.
- **`httpOnly` Session Cookie Authentication**: Secure, strict `SameSite=Lax` cookie tokens protect against XSS token harvesting, with dedicated `authLimiter` brute-force defenses.
- **Graceful Edge-Case Resilience**:
  - *Profitable / Zero-Burn Companies*: Displays `"Cash-Flow Positive (Sustainable)"` in emerald with positive surplus metrics rather than distress alerts.
  - *Zero Liquid Cash*: Division-by-zero guards highlight immediate deficit with an interactive prompt to enter verified bank reserves.
  - *Unconfigured AI Keys*: Deterministic math, sandbox simulation, and PDF memos remain 100% active with an informational banner if external LLM keys are omitted.
- **19 Automated Backend & Security Tests**: Native `node:test` suite verifying math precision, accounting scrubbing, multi-tenant IDOR protection, and PDF binary validation.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Chart.js, Lucide Icons |
| **Backend** | Node.js (ESM), Express 4 |
| **Database** | SQLite via `better-sqlite3` with WAL mode enabled |
| **Reporting** | PDFKit (server-side stream generation) |
| **Security** | Helmet, Cookie-Parser, JWT, Bcrypt, Express-Rate-Limit |
| **Test Runner** | Native Node.js test runner (`node:test`, `node:assert/strict`) |

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- Node.js 18+ (tested on Node 20+)
- npm 9+

### 1. Installation
```bash
# Clone the repository
git clone https://github.com/your-org/vertex.git
cd vertex

# Install server and client dependencies
npm install --prefix server
npm install --prefix client
```

### 2. Configure Environment Variables
```bash
# Copy sample environment configuration
cp server/.env.example server/.env
```

Edit `server/.env` with your preferred settings:

| Variable | Description | Default / Example |
|---|---|---|
| `PORT` | Backend HTTP listening port | `5001` |
| `NODE_ENV` | Runtime environment (`development`, `production`, `test`) | `development` |
| `JWT_SECRET` | Secret key for signing tokens (`openssl rand -hex 32`) | *Required in production* |
| `CLIENT_ORIGIN` | Allowed CORS origin for frontend | `http://localhost:5173` |
| `DB_PATH` | Path to persistent SQLite database file | `server/vertex.db` |
| `ENABLE_DEMO` | Allows instant 1-click demo analyst session | `true` |
| `GEMINI_API_KEY` | *(Optional)* Google Gemini key for advisory commentary | |
| `OPENAI_API_KEY` | *(Optional)* OpenAI API key for advisory commentary | |
| `GROQ_API_KEY` | *(Optional)* Groq key for fast commentary | |

### 3. Run Automated Tests
```bash
# Executes 19 native automated tests across turnaround math, ingest, and security
npm test
```

### 4. Run Development Servers
```bash
# Terminal 1: Start backend API server
npm run dev --prefix server

# Terminal 2: Start frontend client
npm run dev --prefix client
```
Open **[http://localhost:5173](http://localhost:5173)** to access the workspace.

---

## 🐳 Production Deployment

### Option A: Docker Deployment
Build and run the unified single-container image (builds client SPA, mounts persistent database volume, exposes port 5001):

```bash
# Build multi-stage container
docker build -t vertex:latest .

# Run container with persistent data volume
docker run -d \
  -p 5001:5001 \
  -v vertex-data:/data \
  -e JWT_SECRET=$(openssl rand -hex 32) \
  -e NODE_ENV=production \
  --name vertex-app vertex:latest
```

### Option B: Render Blueprint Deployment
The repository includes an out-of-the-box `render.yaml` blueprint with a persistent disk for SQLite:

1. Connect your repository to **Render**.
2. Create a new **Blueprint** service pointing to `render.yaml`.
3. Render automatically provisions the Docker service, persistent 1GB `/data` disk, and generates a secure `JWT_SECRET`.

---

## 📡 API Reference

All protected endpoints require authentication via the `httpOnly` cookie (`vertex_jwt`) or `Authorization: Bearer <token>`.

### Authentication
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/auth/signup` | Public | Register new analyst account; sets `httpOnly` cookie |
| `POST` | `/auth/login` | Public | Authenticate user; sets `httpOnly` cookie |
| `POST` | `/auth/demo` | Public | Instant 1-click access to demo restructuring workspace |
| `POST` | `/auth/logout` | Authenticated | Clears session cookie |
| `GET` | `/auth/me` | Authenticated | Returns current authenticated user and role |
| `POST` | `/auth/register` | Admin | Provision new accounts |

### Companies (Client Accounts)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/clients` | Authenticated | List all companies owned by the current user |
| `POST` | `/clients` | Authenticated | Create a company profile with industry classification |
| `GET` | `/clients/:id` | Authenticated | Retrieve single company details (IDOR-protected) |
| `GET` | `/clients/:id/analyses` | Authenticated | List historical turnaround analyses for company |
| `DELETE` | `/clients/:id` | Authenticated | Cascade delete company and all historical analyses |
| `GET` | `/clients/:id/compare` | Authenticated | Multi-period trend comparison (Revenue, Expenses, Runway, Net Profit) |

### Turnaround Assessments & Diagnostics
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/analyses` | Authenticated | Upload & parse monthly financial CSV/XLSX file |
| `GET` | `/analyses/:id` | Authenticated | Fetch assessment metrics, vital signs, and recovery levers |
| `PATCH` | `/analyses/:id/interview` | Authenticated | Save 60-second interview context and active recovery levers |
| `GET` | `/analyses/:id/report` | Authenticated | Download client-ready 2-page Executive Turnaround Memo (`.pdf`) |
| `DELETE` | `/analyses/:id` | Authenticated | Delete single analysis record |

### Advisory & System Utilities
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/analyses/:id/insights` | Authenticated | Generate AI restructuring commentary (rate-limited) |
| `POST` | `/insights/simulate` | Authenticated | Interactive scenario query sandbox (rate-limited) |
| `GET` | `/template` | Public | Download verified spreadsheet financial intake template (`.xlsx`) |
| `GET` | `/audit-log` | Admin | Review immutable compliance audit trail |
| `POST` | `/seed-demo` | Authenticated | Seed realistic distressed enterprise scenario |
| `GET` | `/health` | Public | Health check endpoint |

---

## 📄 License
MIT License. Created for institutional turnaround advisory, restructuring practitioners, and SME enterprise operators.
