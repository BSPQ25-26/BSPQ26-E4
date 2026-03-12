from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from services.auth.routes import router as auth_router
from services.expenses.routes import router as expenses_router
from services.categories.routes import router as categories_router
from services.budgets.routes import router as budgets_router
from services.alerts.routes import router as alerts_router


app = FastAPI(title="SpendWise API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "SpendWise Backend Ready"}


# ROUTERS
app.include_router(auth_router,       prefix="/api/v1/auth",       tags=["auth"])
app.include_router(expenses_router,   prefix="/api/v1/expenses",   tags=["expenses"])
app.include_router(categories_router, prefix="/api/v1/categories", tags=["categories"])
app.include_router(budgets_router,    prefix="/api/v1/budgets",    tags=["budgets"])
app.include_router(alerts_router,     prefix="/api/v1/alerts",     tags=["alerts"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
