# SpendWise

<img src="https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/4x3/gb.svg" width="20" alt="English flag"> English &nbsp;·&nbsp;
<img src="https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/4x3/es.svg" width="20" alt="Spanish flag"> Español &nbsp;·&nbsp;
<img src="https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/4x3/es-pv.svg" width="20" alt="Basque flag"> Euskara &nbsp;·&nbsp;
<img src="https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/4x3/pl.svg" width="20" alt="Polish flag"> Polski &nbsp;·&nbsp;
<img src="https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/4x3/fr.svg" width="20" alt="French flag"> Français

SpendWise is a personal expense tracking application that helps you manage your finances. Track your daily expenses, categorize them, and visualize your spending patterns through interactive charts. Monitor your budget and gain insights into where your money goes each month.

## Website (live demo)

A hosted version of the frontend is online here:

`https://<your-project>.vercel.app` *(← replace after the first Vercel deploy)*

See [Deploy on Vercel](#deploy-on-vercel) below for the project settings, environment variable and optional `/api/` rewrite.

## Quick start (Docker)

The whole stack is dockerised. One command brings up the backend
(FastAPI + Uvicorn), the frontend (React built by Vite, served by
nginx) and wires them together so the browser never talks to the
backend directly — nginx proxies `/api/` to the backend container.

```bash
# 1. Configure Supabase credentials (only the first time)
cp .env.example .env
# then edit .env and fill in real values

# 2. Build and run everything
docker compose up --build
```

Once the containers report healthy:

| Service            | URL                                |
| ------------------ | ---------------------------------- |
| Frontend           | http://localhost:3000              |
| Backend (direct)   | http://localhost:8080              |
| Backend Swagger UI | http://localhost:8080/docs         |

Stop everything with `Ctrl+C` (or `docker compose down` from another
terminal).

If host port 3000 or 8080 is already taken on your machine, override
the mapping from the same root `.env` — the container ports stay the
same internally:

```
FRONTEND_PORT=3001
BACKEND_PORT=8081
```

## Development mode (hot reload)

Prefer this flow when you are actively writing code — Vite reloads the
browser on every save and `uvicorn --reload` restarts the API on every
Python edit. It needs two terminals, but skips the Docker rebuild
cycle.

Before either terminal, create `spendwise-backend/.env` with the same
Supabase keys as above:

```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
```

Backend (terminal 1):

```bash
cd spendwise-backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080
```

Frontend (terminal 2):

```bash
cd spendwise-front
npm install
npm run dev
```

| Service            | URL                                |
| ------------------ | ---------------------------------- |
| Frontend (Vite)    | http://localhost:5173              |
| Backend            | http://localhost:8080              |
| Backend Swagger UI | http://localhost:8080/docs         |

## Testing

### Backend Tests
```bash
cd spendwise-backend
pytest tests/ -v
```

### Frontend Tests

Unit + component tests:

```bash
cd spendwise-front
npm test
```

Integration tests (client-side calls hitting the real server):

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

## Deploy on Vercel

The frontend is set up to deploy on Vercel as a static SPA. The
backend (FastAPI) is **not** part of the Vercel deploy — host it
separately (Render, Railway, Fly, or a second Vercel project as
serverless functions) and point the frontend at its public URL.

### Project settings

In Vercel **Settings → General**, configure:

| Field            | Value              |
| ---------------- | ------------------ |
| Root directory   | `spendwise-front`  |
| Framework preset | Vite               |
| Build command    | `npm run build`    |
| Output directory | `dist`             |
| Install command  | `npm ci`           |

### Environment variable

In **Settings → Environment Variables**, add the public URL of the
deployed backend so the compiled JS knows where to send API calls:

```
VITE_API_BASE = https://<your-backend-host>/api/v1
```

Vite inlines this value at build time, so any change requires a fresh
deploy.

### Optional — rewrite `/api/` at the edge

If you would rather keep the frontend code calling the relative path
`/api/...` (so the same codebase stays portable between the Docker
setup and Vercel), drop a `vercel.json` at `spendwise-front/`:

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://<your-backend-host>/api/:path*" }
  ]
}
```

This mirrors what `nginx.conf` does in Docker — the browser only ever
talks to the Vercel domain, and Vercel proxies `/api/` to your real
backend. With this in place you can leave `VITE_API_BASE` unset and
the default `/api/v1` keeps working.

