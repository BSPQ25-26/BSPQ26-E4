# SpendWise

SpendWise is a personal expense tracking application that helps you manage your finances. Track your daily expenses, categorize them, and visualize your spending patterns through interactive charts. Monitor your budget and gain insights into where your money goes each month.

## Setup

### Backend

```bash
cd spendwise-backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080
```

API available at:
- http://localhost:8080
- http://localhost:8080/docs (Swagger UI)

### Frontend

```bash
cd spendwise-front
npm install
npm run dev
```

App available at: http://localhost:5173

## Environment Variables

Create a `.env` file in `spendwise-backend/` with:

```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
```

## Languages

The frontend supports **English** (default), **Spanish** and **Basque**.
Users can pick their language from the switcher in the login/register
pages, the navbar, or the Settings tab. The choice is persisted to
`localStorage` (`sw_lang` key) and, for authenticated users, also
synced to the backend so the preference follows the account across
devices.

To enable backend persistence, run this migration once on the
`user_profiles` table in Supabase:

```sql
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';
```

Without the column, the language switcher still works locally — the
backend update is best-effort and silently no-ops if the column is
missing.

## Testing

### Backend Tests
```bash
cd spendwise-backend
pytest tests/ -v
```

### Frontend Tests
```bash
cd spendwise-front
npm test
```
# Test cases from the client side that calls the server
```bash
cd spendwise-front
npm run test:integration
```

## Documentation

The repository ships a unified technical-documentation site that bundles
the backend API reference, the frontend code reference, the test
coverage reports and a downloadable PDF manual.

### Build everything locally

Requires Python 3.11+, Node 20+ and a working LaTeX install
(`latexmk`, `texlive-latex-extra`, `texlive-fonts-recommended`).

```bash
./scripts/build-docs.sh
# open site/index.html in your browser
```

The script produces `site/` at the repo root with this layout:

| Path                                  | Source                            |
| ------------------------------------- | --------------------------------- |
| `site/index.html`                     | Landing page (`docs-site/`)       |
| `site/backend/`                       | Sphinx HTML — FastAPI reference   |
| `site/backend-pdf/spendwisebackend.pdf` | Sphinx LaTeX → `pdflatex` PDF    |
| `site/frontend/`                      | JSDoc — React reference           |
| `site/coverage/backend/`              | pytest `--cov-report=html`        |
| `site/coverage/frontend/`             | vitest `--coverage` (v8)          |

### Build a single piece

```bash
# Backend HTML only
cd spendwise-backend/docs && make html

# Backend PDF only
cd spendwise-backend/docs && make latexpdf

# Frontend JSDoc only
cd spendwise-front && npm run docs
```

### Published site

Every push to `main` triggers `.github/workflows/docs.yml`, which runs
the same build script and deploys the result to GitHub Pages. After the
first successful run, the site is available at:

```
https://bspq25-26.github.io/BSPQ26-E4/
```

> Enable Pages in **Settings → Pages → Source: GitHub Actions** if it
> is not on yet.

## Releases

Sprint releases are cut as annotated git tags from `main` once all
Sprint exit criteria are green (tests passing, docs deploy successful).

```bash
# Sprint 3 release
git checkout main
git pull
git tag -a v3.0.0 -m "Sprint 3 — Continuous Integration & Documentation"
git push origin v3.0.0
```
