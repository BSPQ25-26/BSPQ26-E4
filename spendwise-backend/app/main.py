"""FastAPI application entry point for the SpendWise backend.

This module wires the application together: it instantiates the
:class:`fastapi.FastAPI` app, configures CORS so the React frontend can
talk to it during development, and mounts every service router under a
versioned ``/api/v1`` prefix.

Run the server locally with::

    uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services.auth.routes import router as auth_router
from services.expenses.routes import router as expenses_router
from services.categories.routes import router as categories_router
from services.budgets.routes import router as budgets_router
from services.alerts.routes import router as alerts_router
from services.dashboard.routes import router as dashboard_router


# FastAPI application instance. The title and version are surfaced by
# the auto-generated OpenAPI schema (Swagger UI at ``/docs``).
app = FastAPI(title="SpendWise API", version="1.0.0")

# CORS middleware is intentionally permissive during development. Tighten
# ``allow_origins`` before deploying to production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root() -> dict:
    """Root endpoint used as a lightweight liveness probe.

    Returns:
        dict: A small JSON payload confirming the backend is reachable.
    """
    return {"message": "SpendWise Backend Ready"}


# Mount every domain router under its own ``/api/v1`` prefix. The ``tags``
# values are also used by Swagger UI to group endpoints visually.
app.include_router(auth_router,       prefix="/api/v1/auth",       tags=["auth"])
app.include_router(expenses_router,   prefix="/api/v1/expenses",   tags=["expenses"])
app.include_router(categories_router, prefix="/api/v1/categories", tags=["categories"])
app.include_router(budgets_router,    prefix="/api/v1/budgets",    tags=["budgets"])
app.include_router(alerts_router,     prefix="/api/v1/alerts",     tags=["alerts"])
app.include_router(dashboard_router,  prefix="/api/v1/dashboard",  tags=["dashboard"])


if __name__ == "__main__":
    # Allow ``python -m app.main`` as an alternative to running uvicorn
    # directly. Useful for quick local debugging from an IDE.
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8080)
