# AnyPrint React Frontend (Vite)

This is the React + Vite upgrade frontend for AnyPrint, connected to your existing Django backend API.

## Tech Stack

- React 19
- Vite 8
- React Router
- Existing Django API backend

## Available Routes

- `/` Home
- `/shop` Product listing
- `/products/:slug` Product detail
- `/login` Login with show-password toggle
- `/analytics` Sales analytics (Owner/Admin only)

## Environment

Create `.env` from `.env.example`:

`VITE_API_BASE_URL=https://anyprint-prototype-backend.onrender.com/api`

For local backend development, use:

`VITE_API_BASE_URL=http://127.0.0.1:8000/api`

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Migration Notes

- Existing static frontend remains untouched in `AnyPrint_Prototype`.
- React upgrade is isolated in `AnyPrint_Prototype_React`.
- Core flows migrated: shop, product detail, login/auth session, sales analytics report.
