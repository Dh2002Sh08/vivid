# TWS Vivid Seats – Frontend

This Vite + React + TypeScript application surfaces Vivid Seats event intelligence with a responsive UX:

- **Home** – hero, favourites area (persisted via the backend), featured events, quick add cards.
- **Events Listing** – date/price/home-away filters, ticket insight modal per event.
- **Performers** – list & calendar views with filters (day/night, opponents, max price) and zone dialogs.
- **Performer Detail** – schedule management with list/calendar toggles and deep ticket drilldowns.
- **Production & Stadium View** – ticket filters (price slider, deal score, perks), multi-zone selection, stadium grid, and listing table.
- **Analytics** – documentation of the accompanying analytics pipeline design.

API calls are proxied through the backend server (`/api/...`) to avoid CORS and to integrate MongoDB favourites.

## Getting started

```bash
# install dependencies
npm install

# run the dev server
npm run dev

# build for production
npm run build
```

By default the app expects `VITE_API_BASE_URL` to point at the backend (`http://localhost:4000/api`). Set this in a `.env` file if you run the frontend against a different host.

## Project structure

- `src/api` – Axios client + domain typings.
- `src/components` – navigation, logo, search popover.
- `src/pages` – route-level views.
- `src/store` – Zustand store for favourites (syncs with backend MongoDB).

Styling relies on custom utility classes in `index.css`/`App.css` with a deep slate/blue palette tailored for dark mode.
