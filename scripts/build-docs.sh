#!/usr/bin/env bash
#
# Build the unified SpendWise documentation site.
#
# Output layout (relative to the repo root):
#
#   site/
#     index.html                       <- landing page (from docs-site/)
#     backend/                         <- Sphinx HTML (FastAPI reference)
#     backend-pdf/spendwisebackend.pdf <- Sphinx LaTeX -> pdflatex
#     frontend/                        <- JSDoc HTML (React reference)
#     coverage/backend/                <- pytest --cov-report=html
#     coverage/frontend/               <- vitest --coverage (v8 HTML reporter)
#
# Run locally (requires LaTeX, Node 20+, Python 3.11+):
#
#   ./scripts/build-docs.sh
#
# CI runs the same script via .github/workflows/docs.yml.

set -euo pipefail

# Resolve repo root regardless of where the script is invoked from.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SITE="$ROOT/site"

BACKEND="$ROOT/spendwise-backend"
FRONTEND="$ROOT/spendwise-front"
LANDING="$ROOT/docs-site"

# Allow the caller to override the python/npm binaries (handy for CI or
# when the local .venv has broken shebangs).
PYTHON="${PYTHON:-python3}"
NPM="${NPM:-npm}"

log() { printf '\n\033[1;36m==>\033[0m %s\n' "$*"; }

# ---------------------------------------------------------------------------
# Clean previous build
# ---------------------------------------------------------------------------
log "Cleaning previous site/ output"
rm -rf "$SITE"
mkdir -p "$SITE/backend" "$SITE/backend-pdf" "$SITE/frontend" \
         "$SITE/coverage/backend" "$SITE/coverage/frontend"

# ---------------------------------------------------------------------------
# Backend: Sphinx HTML + PDF
# ---------------------------------------------------------------------------
log "Building backend reference (Sphinx HTML)"
"$PYTHON" -m sphinx -b html "$BACKEND/docs/source" "$BACKEND/docs/_build/html"
cp -R "$BACKEND/docs/_build/html/." "$SITE/backend/"

log "Building backend manual (Sphinx LaTeX → PDF)"
"$PYTHON" -m sphinx -b latex "$BACKEND/docs/source" "$BACKEND/docs/_build/latex"
( cd "$BACKEND/docs/_build/latex" \
  && latexmk -pdf -interaction=nonstopmode -halt-on-error spendwisebackend.tex >/dev/null )
cp "$BACKEND/docs/_build/latex/spendwisebackend.pdf" "$SITE/backend-pdf/"

# ---------------------------------------------------------------------------
# Frontend: JSDoc
# ---------------------------------------------------------------------------
log "Building frontend reference (JSDoc)"
( cd "$FRONTEND" && "$NPM" run docs )
cp -R "$FRONTEND/docs/_build/." "$SITE/frontend/"

# ---------------------------------------------------------------------------
# Backend coverage (pytest)
# ---------------------------------------------------------------------------
log "Running backend tests with coverage (pytest)"
(
  cd "$BACKEND"
  # CI sets these via the workflow; provide harmless placeholders for
  # local runs so Supabase import-time validation doesn't blow up.
  export SUPABASE_URL="${SUPABASE_URL:-https://placeholder.supabase.co}"
  export SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-placeholder_anon_key}"
  export SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_KEY:-placeholder_service_key}"
  "$PYTHON" -m pytest tests/ \
    --ignore=tests/locustfile.py \
    --cov=app --cov=core --cov=services \
    --cov-report=html:"$SITE/coverage/backend" \
    --cov-report=term
)

# ---------------------------------------------------------------------------
# Frontend coverage (vitest)
# ---------------------------------------------------------------------------
log "Running frontend tests with coverage (vitest)"
( cd "$FRONTEND" && "$NPM" run test:coverage )
cp -R "$FRONTEND/coverage/." "$SITE/coverage/frontend/"

# ---------------------------------------------------------------------------
# Landing page
# ---------------------------------------------------------------------------
log "Copying landing page"
cp "$LANDING/index.html" "$SITE/index.html"
# .nojekyll keeps GitHub Pages from running Jekyll over the Sphinx
# output (which uses _-prefixed static asset directories).
touch "$SITE/.nojekyll"

log "Done. Open: $SITE/index.html"
