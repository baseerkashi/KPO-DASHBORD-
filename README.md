# KPO Intelligence Dashboard

A production-style MVP for **KPO teams** analyzing **Micro and Small Enterprises (MSEs)** from CSVs: **financial KPIs**, **Chart.js** visuals, **risk scoring**, and **OpenAI** insights. The UI uses **React**, **Tailwind CSS v4**, **glassmorphism**, and a **neon / cyber** dark theme. API keys stay on the **server only**.

## Features

- **CSV upload** — Parse & validate; optional workforce, liabilities, expense categories.
- **Financial analysis** — Revenue, expenses, profit, margin, growth, bar + pie charts.
- **Risk assessment** — Score 0–100, Low / Medium / High, indicator bullets.
- **AI insights** — Backend calls OpenAI; **3–5** short insights (also auto-loads on **Dashboard** after upload).
- **UI** — Sidebar + top bar, neon glass cards, hover glow, full command-center layout.

## Tech stack

| Layer    | Choice                                      |
|----------|---------------------------------------------|
| Frontend | React 18 (Vite), **Tailwind CSS**, Chart.js |
| Icons    | lucide-react                                |
| Backend  | Node.js, Express                            |
| AI       | OpenAI (`OPENAI_API_KEY` on server)         |

## Project structure

```text
├── client/                 # React + Tailwind dashboard
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   └── components/
│   ├── vercel.json
│   └── package.json
├── server/                 # Express API
│   ├── index.js            # /upload, /analyze, /insights, /health
│   ├── analysis.js
│   └── package.json
├── data/                   # Sample CSVs
├── package.json            # Root: concurrently
└── README.md
```

## API (backend)

| Method | Path        | Description |
|--------|-------------|-------------|
| GET    | `/health`   | Health check |
| POST   | `/upload`   | `multipart/form-data`, field `file` (CSV) |
| POST   | `/analyze`  | `{ "data": [ ... ] }` |
| POST   | `/insights` | `{ "insightContext": { ... } }` from `/analyze` |

## Example CSV format

Required (aliases supported): period (`month`, `year_month`, …), sales (`revenue`, `income`, …), expenses (`costs`, `total_cost`, …).

Optional: workforce, liabilities, extra numeric columns for expense breakdown.

Sample files are in **`data/`** — see filenames in the repo.

## Security

- `OPENAI_API_KEY` only in **server** environment.
- Client only uses `VITE_API_URL` (public API base URL).

## License

Use for your KPO / internal projects as needed.
