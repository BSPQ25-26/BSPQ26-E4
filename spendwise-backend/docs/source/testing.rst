Testing
=======

This page documents the automated test suite that ships with the
SpendWise backend. The goal is twofold:

* give a precise inventory of **what** is covered by each file under
  ``spendwise-backend/tests/``, and
* explain **how** the tests are wired (mocking strategy, authentication
  override, performance harness) so that adding new tests is mechanical.

The suite combines three layers:

1. **Unit / integration tests** with `pytest`_ and FastAPI's
   :class:`fastapi.testclient.TestClient`. They exercise every public
   route of the API while mocking the Supabase layer, so the tests are
   deterministic and run without any external service.
2. **Security tests** that disable the dependency override and verify
   the authentication middleware blocks unauthenticated or malformed
   requests.
3. **Performance / load tests** with `Locust`_, simulating real users
   hitting the most expensive endpoints.

.. _pytest: https://docs.pytest.org/
.. _Locust: https://locust.io/


Layout
------

::

   spendwise-backend/
   └── tests/
       ├── __init__.py
       ├── test_budgets.py          # Budgets CRUD
       ├── test_categories.py       # Categories CRUD + shared visibility
       ├── test_dashboard.py        # Monthly summary endpoint
       ├── test_expenses.py         # Expenses CRUD + DB health check
       ├── test_security.py         # Auth middleware (HTTPBearer + JWT)
       ├── locustfile.py            # Load profile (Locust)
       └── performance_reports/     # Saved HTML reports from past runs


Running the suite
-----------------

From the ``spendwise-backend`` directory, with the virtual environment
activated:

.. code-block:: bash

   # Full pytest suite (unit + integration + security)
   pytest

   # A single file, with verbose output
   pytest tests/test_expenses.py -v

   # A single test by name
   pytest tests/test_budgets.py::test_create_budget_success -v

   # With coverage (requires pytest-cov)
   pytest --cov=services --cov=app --cov-report=term-missing

   # Performance / load test (interactive UI on http://localhost:8089)
   locust -f tests/locustfile.py --host http://localhost:8080

The ``locust`` command requires the API to be running locally on the
host passed via ``--host``, and the ``LOCUST_EMAIL`` / ``LOCUST_PASSWORD``
environment variables to point to a real Supabase test user.


Common test scaffolding
-----------------------

Every functional test file follows the same three-step pattern, which
is worth knowing before reading the per-file inventory:

1. **Build a TestClient** wrapped around the real FastAPI ``app``::

      from fastapi.testclient import TestClient
      from app.main import app

      client = TestClient(app)

2. **Override the authentication dependency** with an autouse fixture so
   every request inside the file behaves as if a known user (``MockUser``)
   were logged in::

      @pytest.fixture(autouse=True)
      def setup_user_override():
          app.dependency_overrides[get_current_user] = lambda: MockUser()
          yield
          app.dependency_overrides = {}

   Restoring ``app.dependency_overrides`` to ``{}`` after each test is
   important to prevent leakage between files (notably into
   ``test_security.py`` which deliberately wants the real dependency
   active).

3. **Patch the CRUD layer** of the route under test with
   ``unittest.mock.patch`` so the route logic is exercised without
   touching Supabase::

      @patch("services.budgets.routes.create_budget")
      def test_create_budget_success(mock_create_budget):
          ...

   This means the tests assert **HTTP behaviour and contract**
   (status codes, payload shape, dependency wiring), not Supabase query
   correctness — the database client is intentionally mocked out.


Test inventory
--------------

The following sections list every test currently shipped, with the
endpoint each one targets and the behaviour it locks in.

Budgets — ``tests/test_budgets.py``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Targets the router defined in :mod:`services.budgets.routes`.

.. list-table::
   :header-rows: 1
   :widths: 35 15 50

   * - Test
     - Route
     - What it verifies
   * - ``test_list_budgets``
     - ``GET /api/v1/budgets/``
     - Returns ``200`` and forwards the authenticated user id together
       with the ``month`` and ``year`` query params to
       :func:`services.budgets.crud.get_budgets`.
   * - ``test_create_budget_success``
     - ``POST /api/v1/budgets/``
     - Valid payload returns ``201`` and echoes the created budget.
   * - ``test_create_budget_fail``
     - ``POST /api/v1/budgets/``
     - When the CRUD layer returns ``None`` the route surfaces a
       ``400 Bad Request``.
   * - ``test_update_budget_success``
     - ``PUT /api/v1/budgets/{id}``
     - A partial update returns ``200`` with the new amount.
   * - ``test_update_budget_empty``
     - ``PUT /api/v1/budgets/{id}``
     - An empty body returns ``400`` with ``"No fields to update"``.
   * - ``test_delete_budget_success``
     - ``DELETE /api/v1/budgets/{id}``
     - Successful deletion returns ``204 No Content``.

Categories — ``tests/test_categories.py``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Targets the router defined in :mod:`services.categories.routes`,
including the *shared category visibility* feature (a user can hide
categories that are shared at the project level).

.. list-table::
   :header-rows: 1
   :widths: 40 15 45

   * - Test
     - Route
     - What it verifies
   * - ``test_list_categories_success``
     - ``GET /api/v1/categories/``
     - Returns the mocked list and propagates the user id to
       :func:`services.categories.crud.get_categories`.
   * - ``test_list_hidden_categories_success``
     - ``GET /api/v1/categories/hidden``
     - Returns the per-user list of hidden shared categories.
   * - ``test_create_category_success``
     - ``POST /api/v1/categories/``
     - A valid payload returns ``201``; the user id is the first
       positional argument passed to the CRUD function.
   * - ``test_update_category_success``
     - ``PUT /api/v1/categories/{id}``
     - Partial update returns ``200`` and the CRUD function receives
       ``(category_id, user_id, ...)``.
   * - ``test_update_category_empty_payload``
     - ``PUT /api/v1/categories/{id}``
     - Empty body returns ``400`` with ``"No fields to update"``.
   * - ``test_delete_category_success``
     - ``DELETE /api/v1/categories/{id}``
     - When no expense or budget references the category, deletion
       returns ``204``.
   * - ``test_delete_category_conflict``
     - ``DELETE /api/v1/categories/{id}``
     - When the category is still referenced, deletion returns
       ``409 Conflict`` with the human-readable conflict message.
   * - ``test_hide_shared_category_success``
     - ``POST /api/v1/categories/{id}/hide``
     - Hiding a shared category returns ``204``.
   * - ``test_hide_shared_category_not_found``
     - ``POST /api/v1/categories/{id}/hide``
     - When the shared category does not exist, returns ``404``.
   * - ``test_unhide_shared_category_success``
     - ``DELETE /api/v1/categories/{id}/hide``
     - Unhiding returns ``204``.

Dashboard — ``tests/test_dashboard.py``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Targets the aggregated monthly summary defined in
:mod:`services.dashboard.routes`.

.. list-table::
   :header-rows: 1
   :widths: 35 15 50

   * - Test
     - Route
     - What it verifies
   * - ``test_get_summary_with_params``
     - ``GET /api/v1/dashboard/summary``
     - Explicit ``month`` and ``year`` query params are passed through
       to :func:`services.dashboard.crud.get_monthly_summary`.
   * - ``test_get_summary_default``
     - ``GET /api/v1/dashboard/summary``
     - When the query string is empty, the route falls back to today's
       month and year (computed via :func:`datetime.date.today`).

Expenses — ``tests/test_expenses.py``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Targets the largest router of the app, :mod:`services.expenses.routes`,
which also exposes a database health check.

.. list-table::
   :header-rows: 1
   :widths: 35 20 45

   * - Test
     - Route
     - What it verifies
   * - ``test_create_expense_success``
     - ``POST /api/v1/expenses/``
     - A valid payload returns ``201`` with the persisted amount.
   * - ``test_get_expenses_with_filters``
     - ``GET /api/v1/expenses/``
     - The route forwards ``(user_id, None, month, year, None, None)``
       to :func:`services.expenses.crud.get_expenses` (the ``None``
       slots are the optional category and date filters).
   * - ``test_expense_schema_validation``
     - ``POST /api/v1/expenses/``
     - Sending a non-numeric ``amount`` is rejected by Pydantic with a
       ``422 Unprocessable Entity`` *before* the CRUD layer is reached.
   * - ``test_update_expense_success``
     - ``PUT /api/v1/expenses/{id}``
     - Partial update returns ``200``.
   * - ``test_update_expense_not_found``
     - ``PUT /api/v1/expenses/{id}``
     - When the CRUD layer returns ``None`` (no row), the route returns
       ``404 Not Found``.
   * - ``test_delete_expense_success``
     - ``DELETE /api/v1/expenses/{id}``
     - Successful deletion returns ``204``.
   * - ``test_db_health``
     - ``GET /api/v1/expenses/health``
     - Mocks the Supabase chain
       ``supabase.table().select().limit().execute()`` and asserts the
       endpoint reports ``{"status": "OK"}``.

Security — ``tests/test_security.py``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Unlike the other files, this module **does not** override the
authentication dependency. Its purpose is to assert that the JWT
middleware actually blocks unauthenticated traffic, so it sets
``app.dependency_overrides = {}`` at module load time.

.. list-table::
   :header-rows: 1
   :widths: 35 15 50

   * - Test
     - Route
     - What it verifies
   * - ``test_missing_auth_header``
     - ``GET /api/v1/expenses/``
     - Without an ``Authorization`` header,
       :class:`fastapi.security.HTTPBearer` rejects the request with
       ``403 Forbidden``.
   * - ``test_invalid_auth_header_format``
     - ``GET /api/v1/expenses/``
     - An ``Authorization: Basic …`` header (instead of ``Bearer``)
       returns ``403`` with ``"Invalid authentication credentials"``.
   * - ``test_invalid_or_expired_token``
     - ``GET /api/v1/expenses/``
     - When ``supabase.auth.get_user`` raises (e.g. expired JWT), the
       dependency converts it into ``401 Unauthorized`` with
       ``"Invalid or expired token"``.

.. note::

   ``test_security.py`` must run with the real
   :func:`app.dependencies.get_current_user` dependency. The autouse
   fixtures in the other test files clean up
   ``app.dependency_overrides`` on teardown precisely so this file is
   not affected by ordering.


Performance tests — ``tests/locustfile.py``
-------------------------------------------

The Locust file simulates realistic traffic against the deployed (or
locally running) backend. Each virtual user logs in once via
``POST /api/v1/auth/login`` using the credentials in the
``LOCUST_EMAIL`` and ``LOCUST_PASSWORD`` environment variables, stores
the returned JWT, and then loops over a weighted task set with a
1–3 second think time between actions
(``wait_time = between(1, 3)``).

Tasks executed and their relative weights:

.. list-table::
   :header-rows: 1
   :widths: 35 10 55

   * - Task
     - Weight
     - Endpoint
   * - ``get_dashboard_summary_current_month``
     - 3
     - ``GET /api/v1/dashboard/summary`` (no params, current month).
   * - ``get_dashboard_summary_with_params``
     - 2
     - ``GET /api/v1/dashboard/summary?month=3&year=2026``.
   * - ``get_expenses``
     - 2
     - ``GET /api/v1/expenses/``.
   * - ``get_budgets``
     - 1
     - ``GET /api/v1/budgets/``.
   * - ``check_health``
     - 1
     - ``GET /api/v1/expenses/health``.
   * - ``failed_request``
     - 1
     - Hits a non-existent route on purpose; uses
       ``catch_response=True`` to mark the expected ``404`` as a
       *success* in the report. Required by the Sprint 2 guideline that
       the load profile must include at least one *failed* test.

Sample reports captured during previous runs are stored next to the
load file:

* ``tests/performance_reports/succesful_locust_test.html`` — baseline
  run with the API healthy.
* ``tests/performance_reports/unsuccesful_locust_test.html`` — run
  performed against a degraded backend; useful as a reference for what
  failure looks like in the Locust UI.
* ``tests/performance_reports/profiling_snapshot.html`` — CPU/IO
  profiling snapshot taken during a load run.

To reproduce a run locally:

.. code-block:: bash

   export LOCUST_EMAIL=test@example.com
   export LOCUST_PASSWORD=•••
   uvicorn app.main:app --host 0.0.0.0 --port 8080 &
   locust -f tests/locustfile.py --host http://localhost:8080

Then open ``http://localhost:8089`` and configure the number of users
and the spawn rate from the Locust UI.


Adding a new test
-----------------

When adding a new endpoint, follow the existing layout to keep the
suite consistent:

1. Pick the matching ``tests/test_<service>.py`` (or create a new file
   under the same naming convention).
2. Reuse the autouse ``setup_user_override`` fixture so the route is
   reached as the mocked user.
3. Patch the function defined in the corresponding
   ``services/<service>/crud.py`` with
   ``@patch("services.<service>.routes.<crud_function>")`` rather than
   patching ``services.<service>.crud.<crud_function>`` — patching at
   the *route* import path is what actually intercepts the call inside
   the route handler.
4. Assert two things at minimum: the HTTP status code and that the
   CRUD function was called with the expected arguments
   (``mock.assert_called_once_with(...)``).
5. If the new endpoint must reject unauthenticated requests, add a
   companion test in ``tests/test_security.py`` that exercises it
   without the dependency override.
