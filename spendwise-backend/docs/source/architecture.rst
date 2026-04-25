Backend architecture
====================

The SpendWise backend follows a modular layout organised by **services**.
Each service encapsulates a single domain (expenses, budgets, categories,
etc.) and is composed of three typical files:

* ``routes.py`` — HTTP endpoints exposed via FastAPI.
* ``crud.py`` — functions that talk to the database (Supabase).
* ``schemas.py`` — Pydantic models for request and response validation.

Package overview
----------------

.. list-table::
   :header-rows: 1
   :widths: 25 75

   * - Package
     - Responsibility
   * - ``app``
     - FastAPI entry point, global configuration, and shared dependencies
       (authentication, etc.).
   * - ``core``
     - Cross-cutting infrastructure: Supabase client and security
       utilities.
   * - ``services.auth``
     - Sign-up, login, user profile, and logout.
   * - ``services.expenses``
     - Expense CRUD and monthly analytics.
   * - ``services.budgets``
     - Per-category, per-month budget management.
   * - ``services.categories``
     - Listing of available expense categories.
   * - ``services.alerts``
     - Notifications generated from budgets and expenses.
   * - ``services.dashboard``
     - Aggregated monthly summary used by the frontend dashboard.

Typical request lifecycle
-------------------------

1. **FastAPI** receives the request and routes it to the corresponding
   service router (``app/main.py`` registers each ``/api/v1/...``
   prefix).
2. The :func:`app.dependencies.get_current_user` dependency validates
   the JWT against Supabase whenever the route requires authentication.
3. Incoming data is validated by a Pydantic model from ``schemas.py``.
4. Business logic is delegated to a function in ``crud.py``, which is
   the only layer that talks to Supabase.
5. The response is serialised through another Pydantic model (whenever
   ``response_model`` is declared) to keep the contract with the
   frontend stable.

Persistence
-----------

The backend does not use SQLAlchemy directly; every database operation
goes through the official Supabase Python client defined in
:mod:`core.database`. Two clients are exposed:

* ``supabase`` — public client, subject to RLS policies.
* ``supabase_admin`` — service-role client that **bypasses** RLS. It must
  only be used from server-side code and never exposed to the client.
