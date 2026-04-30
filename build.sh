#!/bin/bash
set -euo pipefail

# Build the React app, then publish the generated static output into public/.
# Render serves the contents of public/, so this keeps deployed assets in sync.

npm run build

if [ ! -d "react-vite/dist" ]; then
  echo "Error: react-vite/dist not found after build"
  exit 1
fi

mkdir -p public

# Preserve static header/config files while replacing the app bundle.
find public -mindepth 1 -maxdepth 1 \
  ! -name '_headers' \
  ! -name 'static.json' \
  -exec rm -rf {} +

cp -R react-vite/dist/. public/

# Keep a 404 fallback that serves the SPA shell on hosts that use 404.html for
# unknown client routes.
cp public/index.html public/404.html

if [ ! -f "public/_redirects" ]; then
  cat > public/_redirects << 'EOF'
/*    /index.html   200
EOF
fi

echo "Build complete. Static files published to public/."
echo "SPA routing configured with _redirects"