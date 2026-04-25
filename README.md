# AnyPrint Frontend

Modern React + Vite frontend for the AnyPrint e-commerce platform.

## Structure

```
AnyPrint_Prototype/
├── react-vite/          # React source code & build config
│   ├── src/             # React components & pages
│   ├── public/          # Static assets
│   ├── vite.config.js   # Build configuration
│   └── package.json     # Dependencies
├── public/              # Production-ready build output
├── render.yaml          # Render deployment config
└── .github/workflows/   # CI/CD pipelines
```

## Key Files

- **react-vite/**: Complete React application source
  - `src/App.jsx` - Main router
  - `src/pages/` - Page components (Home, Shop, Checkout, Account, etc.)
  - `src/lib/` - Utilities (API, auth, cart, formatting)
  - `src/styles/app.css` - Global styles

- **public/**: Production build (static assets served by Render)
  - `_redirects` - SPA routing rewrite
  - `_headers` - Cache control headers
  - `assets/` - Optimized JS & CSS

- **render.yaml** - Static site deployment config for Render

## Development

```bash
cd react-vite
npm install
npm run dev
```

Build: `npm run build`

## Production

Deployed to Render as a static site at `https://anyprint-frontend.onrender.com`

API: `https://anyprint-prototype-backend.onrender.com/api`

## Features

- Product browsing with search
- User authentication (login/register)
- Shopping cart (localStorage)
- Multi-step checkout
- Order tracking
- Account management (addresses, wishlist, order history)
- Owner dashboard (analytics, product creation)
- Admin dashboard (order management, user roles)
- Responsive design

## Routing

| Route | Component |
|-------|-----------|
| `/` | Home |
| `/shop` | Product listing |
| `/products/:slug` | Product detail |
| `/account` | User account |
| `/checkout` | Checkout flow |
| `/tracking` | Order tracking |
| `/owner` | Owner dashboard (OWNER role) |
| `/admin` | Admin dashboard (OWNER/ADMIN role) |
| `/analytics` | Analytics (OWNER/ADMIN role) |

## Tech Stack

- React 19
- Vite 8
- React Router
- localStorage for state
- JWT authentication
