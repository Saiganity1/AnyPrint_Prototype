#!/bin/bash
# Build script for Render static site deployment
# Ensures all React routes redirect to index.html

# Verify public folder exists
if [ ! -d "public" ]; then
  echo "Error: public folder not found"
  exit 1
fi

# Verify index.html exists
if [ ! -f "public/index.html" ]; then
  echo "Error: public/index.html not found"
  exit 1
fi

# Ensure _redirects file exists for SPA routing
cat > public/_redirects << 'EOF'
/* /index.html 200
EOF

echo "Build complete. Static files ready in public/ folder."
echo "SPA routing configured with _redirects"