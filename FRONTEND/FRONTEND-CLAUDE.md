# FRONTEND — Claude Instructions
# Place this file at: EOCEAN-IVR-ROBOCALL/FRONTEND/CLAUDE.md

## Stack
- React 18 + Vite
- Tailwind CSS
- Recharts (charts)
- Axios (API calls)
- React Router v6

## Component Rules
1. One component per file
2. Components go in `src/components/` by category (layout/, ui/, charts/)
3. Pages go in `src/pages/` — one file per route
4. No inline styles — Tailwind classes only
5. No business logic in components — use hooks or services/api.js
6. Every component gets proper PropTypes or TypeScript-style JSDoc

## File Naming
- PascalCase for components: `KpiCard.jsx`, `FilterBar.jsx`
- camelCase for hooks: `useApi.js`, `useDatabases.js`
- camelCase for services: `api.js`

## eOcean Design Tokens (Tailwind)
```js
// Already configured in tailwind.config.js:
navy: { DEFAULT: '#1a2353', light: '#242d63' }
teal: { DEFAULT: '#4ecdc4', dark: '#2a9d8f' }

// Use like: bg-navy text-teal border-teal-dark
```

## Component Categories

### layout/
- `Sidebar.jsx` — dark navy sidebar, nav items with icons
- `Header.jsx` — top bar with DB selector + connection status
- `Layout.jsx` — wraps Sidebar + main content area

### ui/
- `Badge.jsx` — status pill (answered/not_answered/busy/failed/hangup)
- `KpiCard.jsx` — metric card with value + label + colored top border
- `DataTable.jsx` — reusable table with sort, pagination, search
- `FilterBar.jsx` — filter row (date range, status, direction dropdowns)
- `LoadingSpinner.jsx` — centered spinner
- `Toast.jsx` — success/error toast notifications

### charts/
- `TimelineChart.jsx` — line chart (daily call volume)
- `StatusDonut.jsx` — doughnut (answered vs not vs hangup)
- `CampaignBar.jsx` — horizontal bar (top campaigns)
- `HourlyChart.jsx` — bar chart (calls by hour)

## API Service Pattern
```js
// src/services/api.js — single axios instance
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL })

export const getDashboard = (dbName, days) =>
  api.get(`/dashboard/${dbName}`, { params: { days } })

// Components never use axios directly — always import from api.js
```

## Global State (Context)
```js
// src/context/DbContext.jsx
// Provides: { databases, selectedDb, setSelectedDb }
// Wrap App.jsx with <DbProvider>
// Access with: const { selectedDb } = useDb()
```

## Page Structure
Each page follows this pattern:
```jsx
// pages/Dashboard.jsx
export default function Dashboard() {
  const { selectedDb } = useDb()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedDb) return
    fetchData()
  }, [selectedDb])

  if (!selectedDb) return <SelectDbPrompt />
  if (loading) return <LoadingSpinner />

  return (
    <div className="p-6 space-y-6">
      {/* KPI Grid */}
      {/* Charts Grid */}
      {/* CDR Table */}
    </div>
  )
}
```

## Styling Rules
- Sidebar bg: `bg-navy` text: `text-white`
- Main bg: `bg-surface-muted` (or `bg-gray-50`)
- Cards: `bg-white rounded-xl border border-surface-border shadow-sm`
- Active nav item: `bg-teal/10 text-teal border-l-2 border-teal`
- Buttons primary: `bg-navy text-white hover:bg-navy-light`
- Buttons accent: `bg-teal text-white hover:bg-teal-dark`

## Charts (Recharts)
```jsx
// Always wrap in ResponsiveContainer
<ResponsiveContainer width="100%" height={240}>
  <LineChart data={data}>
    ...
  </LineChart>
</ResponsiveContainer>
```

## Environment Variables
```
VITE_API_URL=http://localhost:5000/api
```
