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

```
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

---

## Instructions (very simple)

### 1) How to add your OpenAI API key

1. Open [OpenAI API keys](https://platform.openai.com/api-keys) and create a key. **Never paste it in chat or GitHub.**
2. On your PC, go to the `server` folder.
3. Copy the example file to a real env file:
   - **Windows (Command Prompt):**  
     `copy server\.env.example server\.env`
4. Open `server\.env` in Notepad and add **one line** (use your real key):
   ```env
   OPENAI_API_KEY=sk-proj-your-key-here
   ```
5. Save the file.
6. **Restart** the backend (see step 2) so it reads the new key.

---

### 2) How to run the project locally

**One-time install** (from the project root folder):

```bat
cd /d "c:\path\to\kpodaashboard and website"
npm install
npm run install:all
```

**Terminal A — backend**

```bat
cd /d "c:\path\to\kpodaashboard and website\server"
npm run dev
```

Leave it running. Default API: `http://localhost:5001`

**Terminal B — frontend**

```bat
cd /d "c:\path\to\kpodaashboard and website\client"
npm run dev
```

Open **http://localhost:5173** in your browser. Upload a CSV from `data\` (e.g. `sample-mse-financials.csv`).

**Optional — both in one terminal** (after `npm install` in the root):

```bat
npm run dev
```

---

### 3) How to deploy the frontend to Vercel

1. Push your code to **GitHub** (see section 4).
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
3. **Add New Project** → import your repository.
4. Set **Root Directory** to `client` (important).
5. Build defaults: **Framework Preset** Vite (or leave auto-detect). Build command: `npm run build`, output: `dist`.
6. Add an environment variable in Vercel:
   - Name: `VITE_API_URL`
   - Value: your **public backend URL** from Render (below), e.g. `https://your-api.onrender.com`  
     **No** trailing slash. **Do not** put `OPENAI_API_KEY` here.
7. Deploy. The site will call your API using `VITE_API_URL`.

`client/vercel.json` keeps SPA routing (client-side routes work on refresh).

---

### 4) How to deploy the backend to Render (optional but typical with Vercel)

1. Push the same repo to GitHub.
2. On [render.com](https://render.com): **New** → **Web Service** → connect the repo.
3. **Root Directory:** `server`  
   **Build Command:** `npm install`  
   **Start Command:** `npm start`  
4. Add environment variables in Render:
   - `OPENAI_API_KEY` = your secret key  
   - `PORT` is usually set by Render automatically (the app uses `process.env.PORT`).
5. After deploy, copy the service URL (e.g. `https://xxx.onrender.com`) and put it in Vercel as `VITE_API_URL`.

---

### 5) How to push your project to GitHub (beginner, exact commands)

Replace `YOUR-USERNAME` and `YOUR-REPO` with yours.

1. Create an empty repo on GitHub (no README needed) named e.g. `kpo-intelligence-dashboard`.

2. On your PC, in the project folder:

```bat
cd /d "c:\path\to\kpodaashboard and website"
git init
git add .
git commit -m "Initial commit: KPO Intelligence Dashboard"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

3. **Important:** Before `git add`, make sure **secrets are not committed**:
   - `server/.env` should be listed in `.gitignore` (this repo ignores `.env`).
   - Never commit API keys.

If Git asks you to log in, use GitHub’s browser login or a **Personal Access Token** as the password.

---

## Example CSV format

Required (aliases supported): period (`month`, `year_month`, …), sales (`revenue`, `income`, …), expenses (`costs`, `total_cost`, …).

Optional: workforce, liabilities, extra numeric columns for expense breakdown.

Sample files are in **`data/`** — see filenames in the repo.

---

## Troubleshooting

### Port already in use

Default API port is **5001**. If busy, set `PORT=5002` in `server\.env` and `VITE_API_PORT=5002` in `client\.env`, then restart both.

### AI insights empty

- Confirm `OPENAI_API_KEY` in `server\.env` and **restart** the server.
- Stay on **Dashboard** (insights load automatically) or open **Intelligence** and click **Refresh**.

---

## Security

- `OPENAI_API_KEY` only in **server** environment (local `.env` or Render).
- Client only uses `VITE_API_URL` (public API base URL).

## License

Use for your KPO / internal projects as needed.
