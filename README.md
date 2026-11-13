# VelvetReel — Frontend

A movie ticket booking web app. Customers browse movies, pick a show and seats, and book (guest-friendly, email + OTP login). Staff get a separate admin panel to manage movies, theatres, shows, offers and other admins.

> This repo contains the **frontend only**. The backend (REST API) lives in a separate repository.

## Features

**Customer site**
- Browse Now Showing / Coming Soon movies, theatres and offers
- Filter shows by movie, theatre, date and location
- Seat map and booking flow with simulated payment
- Email + OTP login, profile and booking history
- In-app notifications (bell with unread count)

**Admin panel** (`/admin`)
- Email + password staff login
- Dashboard (charts via Recharts)
- Manage movies, theatres/screens, shows (single and recurring runs), offers and streaming movies
- Cancel shows (auto-refund), extend/decline-extend/cancel show runs
- Activity logs and admin management

## Tech stack

- React 18 + Vite
- React Router v6
- Axios (JWT access token + automatic refresh-token retry on 401)
- Recharts
- Plain CSS

## Getting started

**Prerequisites:** Node.js 18+ and the backend running (default `http://localhost:8080`).

```bash
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>
npm install
cp .env.example .env     # then edit if your API is elsewhere
npm run dev
```

App runs at http://localhost:5173.

### Environment variables

| Variable       | Default                     | Description                            |
| -------------- | --------------------------- | -------------------------------------- |
| `VITE_API_URL` | `http://localhost:8080/api` | Backend base URL (include the `/api`)  |

### Scripts

| Command           | Description                      |
| ----------------- | -------------------------------- |
| `npm run dev`     | Start dev server                 |
| `npm run build`   | Production build into `dist/`    |
| `npm run preview` | Preview the production build     |

## Project structure

```
src/
├── admin/          # Admin layout, login, pages (movies, theatres, shows, offers, logs, admins)
├── api/            # Axios instance + token refresh interceptor
├── context/        # AuthContext, LocationContext
├── services/       # API wrappers (auth, shows, bookings, offers, theatres, ...)
├── utils/          # Role helpers, movie options
├── App.jsx         # Routes
├── BookingPage.jsx # Seat selection + booking flow
└── ...             # Home page components (Navbar, Hero, NowShowing, Offers, Footer, ...)
```

## Backend API

The app expects these route groups under `VITE_API_URL`:

`/auth` · `/movies` · `/theatres` · `/screens` · `/shows` · `/bookings` · `/offers` · `/notifications` · `/admin/*` (shows, show-runs, offers, streaming-movies, logs, admins)

Auth uses JWT access/refresh tokens. The backend must allow CORS from the frontend origin (e.g. `http://localhost:5173`).

## Deployment

```bash
npm run build
```

Deploy `dist/` to any static host (Vercel, Netlify, GitHub Pages). Set `VITE_API_URL` at build time, and configure a rewrite of all routes to `index.html` since this is a single-page app using client-side routing.
