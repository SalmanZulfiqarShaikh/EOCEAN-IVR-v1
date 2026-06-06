# eOcean IVR Robocall Analytics Platform

Centralized analytics and reporting for eOcean's Robocall services — React + Node.js + MariaDB.

---

## Features

**📊 Dashboard** — KPI cards, call timeline, status breakdown, campaign charts, hourly distribution, CDR table with Excel/CSV export  
**📋 Reports** — Filter by date, status, campaign, customer, duration with group-by and summaries  
**🎙️ Recordings** — Browse, search, play inline, bulk/individual download  
**🗄️ DB Manager** — Connect MySQL servers, auto-detect DBs, browse tables, edit rows, export CSV  
**🌙 Dark mode** — Easy-on-the-eyes dark theme  
**📱 Responsive** — Desktop & mobile friendly

---

## Quick Start

```bash
# Backend
cd BACKEND && npm install && cp .env.example .env && npm run dev

# Frontend
cd FRONTEND && npm install && cp .env.example .env && npm run dev
```

App runs at `http://localhost:5173` · Backend at `http://localhost:5000`

> **Mock mode:** Toggle `USE_MOCK` in `FRONTEND/src/services/api.js` (includes 500+ records)

---

## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | React 19, Vite, Tailwind v4, Recharts |
| Backend | Node.js, Express, mysql2 |
| DB | MariaDB / MySQL |
| Export | SheetJS (xlsx/csv) |

---

## Project Structure

```
BACKEND/          # Node.js + Express (MVC)
  src/config/     # DB pools
  src/controllers/# Route handlers
  src/services/   # Business logic
  src/routes/     # API endpoints

FRONTEND/         # React + Vite + Tailwind
  src/pages/      # Dashboard, Reports, Recordings, DbManager
  src/components/ # charts/, layout/, ui/
  src/services/   # API client + mock data
```

---

## Made by Salman Zulfiqar Shaikh

internal — eOcean Technologies
