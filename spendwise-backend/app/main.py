"""FastAPI application entry point for the SpendWise backend.

This module wires the application together: it instantiates the
:class:`fastapi.FastAPI` app, configures CORS so the React frontend can
talk to it during development, and mounts every service router under a
versioned ``/api/v1`` prefix.

Run the server locally with::

    uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
"""

import logging # Added for Issue #56
from fastapi import FastAPI, Request # Request added for Issue #55
from fastapi.middleware.cors import CORSMiddleware
from pyinstrument import Profiler # Added for Issue #55

from services.auth.routes import router as auth_router
from services.expenses.routes import router as expenses_router
from services.categories.routes import router as categories_router
from services.budgets.routes import router as budgets_router
from services.alerts.routes import router as alerts_router
from services.dashboard.routes import router as dashboard_router


# --- Logging Configuration (Issue #56: Log4J Equivalent) ---
# Set up standard Python logging to avoid using print() statements.
# This configures a professional log format including timestamp, level, and message.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    handlers=[
        logging.StreamHandler() # Outputs the logs directly to the console
    ]
)
logger = logging.getLogger(__name__)


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


# --- Profiling Middleware (Issue #55: VisualVM Snapshot Equivalent) ---
@app.middleware("http")
async def profile_request(request: Request, call_next):
    """
    Middleware to profile endpoint execution time (VisualVM equivalent).
    It activates only if '?profile=true' is present in the request URL.
    """
    if "profile=true" in request.url.query:
        logger.info(f"Profiling activated for request: {request.url.path}")
        
        # Initialize and start the pyinstrument profiler
        profiler = Profiler(interval=0.0001, async_mode="enabled")
        profiler.start()
        
        # Process the actual request
        response = await call_next(request)
        
        # Stop profiler and generate the HTML snapshot
        profiler.stop()
        with open("profiling_snapshot.html", "w", encoding="utf-8") as f:
            f.write(profiler.output_html())
            
        logger.info("Profiling snapshot saved as 'profiling_snapshot.html'")
        return response
        
    # If no profile query param, process request normally
    return await call_next(request)


@app.get("/")
async def root() -> dict:
    """Root endpoint used as a lightweight liveness probe.

    Returns:
        dict: A small JSON payload confirming the backend is reachable.
    """
    # Log the access to the root endpoint instead of using print()
    logger.info("Root endpoint accessed successfully.")
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