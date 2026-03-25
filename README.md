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
