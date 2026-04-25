Installation and setup
======================

This page describes how to bring the SpendWise backend up in a local
development environment.

Prerequisites
-------------

* Python 3.11 or higher.
* A Supabase project with both the ``anon`` and ``service`` keys
  available.
* (Optional) Docker, if you would rather run the backend in a container.

Environment variables
---------------------

The backend reads its configuration from environment variables (loaded
through ``python-dotenv``). Copy the example file and fill in the values:

.. code-block:: bash

   cp spendwise-backend/.env.example spendwise-backend/.env

The expected variables are:

* ``SUPABASE_URL`` — URL of the Supabase project.
* ``SUPABASE_ANON_KEY`` — public key used by routes that go through user
  authentication.
* ``SUPABASE_SERVICE_KEY`` — service-role key used for server-side
  operations that need to bypass RLS policies.

Installing dependencies
-----------------------

.. code-block:: bash

   cd spendwise-backend
   python -m venv .venv
   source .venv/bin/activate         # Windows: .venv\Scripts\activate
   pip install -r requirements.txt

Running the server
------------------

With the virtual environment activated:

.. code-block:: bash

   uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload

The API becomes available at ``http://localhost:8080`` and the
interactive documentation (Swagger UI) at ``http://localhost:8080/docs``.

Tests
-----

The project uses **pytest** and **locust** (for load tests):

.. code-block:: bash

   pytest                          # unit and integration tests
   locust -f tests/locustfile.py   # performance tests (UI on :8089)

Building this documentation
---------------------------

From ``spendwise-backend/docs``:

.. code-block:: bash

   make html

The generated output lands at ``docs/_build/html/index.html``.
