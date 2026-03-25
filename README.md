# SpendWise

Personal expense tracker application with budget management and analytics.

## Tech Stack

- **Backend**: Python (FastAPI) + Supabase
- **Frontend**: React + Vite + Tailwind CSS + Recharts

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
