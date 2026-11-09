# Frontend

Simple web UI for the [monorepo](../../README.md), built with **React + Vite** (JavaScript). It manages `Location` records (list, add, delete) and has a listings view (switch with the „Oferty” / „Lokalizacje” buttons) with filters: total price, price per m² and area ranges, multi-select rooms, city and district with autocomplete, a live result counter and a reset button.

## Requirements

- Node.js 20.19+ (or 22+)
- the backend running (see [`../backend`](../backend)), by default at `http://127.0.0.1:8000`

## Run

```bash
cd services/frontend
npm install
npm run dev        # http://localhost:5173
```

Other scripts: `npm test` (Vitest + Testing Library in jsdom, `*.test.js(x)` next to sources), `npm run build` (production bundle in `dist/`), `npm run preview`.

## Backend connection

The backend has no CORS configured, so the dev server proxies `/api/*` to the backend (the `/api` prefix is stripped). To use a different backend address:

```bash
BACKEND_URL=http://127.0.0.1:9000 npm run dev
```

The API client lives in `src/api.js`.

## Structure

```
index.html
vite.config.js      # React plugin + /api proxy
src/
├── main.jsx        # entry point
├── App.jsx         # locations list + add form, switch to the listings view
├── ListingsView.jsx   # listings table + result counter (debounced, abortable fetches)
├── ListingFilters.jsx # filter panel: ranges, rooms, city/district, reset
├── useSuggestions.js  # debounced autocomplete hook (<datalist>)
├── filterQuery.js  # filter state → query params, validation, Polish plural for the counter
├── api.js          # fetch wrapper for the backend
└── App.css
```
