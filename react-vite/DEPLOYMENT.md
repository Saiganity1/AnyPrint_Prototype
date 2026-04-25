# AnyPrint Frontend Deployment (React + Vite)

This guide makes React + Vite the primary frontend for production.

## 1. Build

From this folder:

```bash
npm install
npm run build
```

Build output is generated in `dist/`.

## 2. Environment Variable

Set this environment variable in your hosting platform:

- `VITE_API_BASE_URL=https://anyprint-prototype-backend.onrender.com/api`

For local Django backend:

- `VITE_API_BASE_URL=http://127.0.0.1:8000/api`

## 3. SPA Routing Requirement

Because this is a React SPA, all non-file routes must rewrite to `index.html`.

Examples:

- `/shop`
- `/products/some-slug`
- `/tracking`
- `/account`

If your host does not rewrite these paths to `index.html`, direct URL refresh will return 404.

## 4. Hosting Options

### Netlify

This project includes:

- `netlify.toml`
- `public/_redirects`

Use:

- Build command: `npm run build`
- Publish directory: `dist`

### Vercel

This project includes:

- `vercel.json`

Use:

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`

### Render Static Site

Use:

- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Redirect/Rewrite rule:
  - Source: `/*`
  - Destination: `/index.html`
  - Action: Rewrite

## 5. Final Cutover Checklist

- [ ] Frontend deploy points to this `react-vite` app, not legacy static HTML.
- [ ] `VITE_API_BASE_URL` is set correctly.
- [ ] SPA rewrite to `index.html` is enabled.
- [ ] Login, shop, product detail, checkout, wishlist, tracking, account, admin, and owner routes open directly via URL.
- [ ] CORS and CSRF are allowed in backend for deployed frontend domain.

## 6. Optional Cleanup

After confirming stable production behavior, you can archive or remove legacy static HTML pages in the root project to avoid confusion.
