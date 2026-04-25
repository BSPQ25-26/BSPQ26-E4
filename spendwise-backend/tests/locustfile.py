from locust import HttpUser, task, between
import json
import os

# ─────────────────────────────────────────────────────────────────────────────
# IMPORTANT: Set these credentials to a valid test user in your Supabase DB.
# These are used only for load testing and are NOT stored anywhere.
# ─────────────────────────────────────────────────────────────────────────────
TEST_EMAIL = os.getenv("LOCUST_EMAIL")
TEST_PASSWORD = os.getenv("LOCUST_PASSWORD")


class SpendWiseUser(HttpUser):
    # Simulates a user waiting between 1 and 3 seconds between actions
    wait_time = between(1, 3)

    def on_start(self):
        """
        Called once per simulated user at session start.
        Logs in and stores the JWT token for authenticated requests.
        """
        response = self.client.post(
            "/api/v1/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        )
        if response.status_code == 200:
            token = response.json().get("access_token", "")
            self.headers = {"Authorization": f"Bearer {token}"}
        else:
            # If login fails, mark all requests as unauthenticated so errors
            # are visible in the Locust report instead of silently skipped.
            self.headers = {}

    # ── Authenticated endpoints ───────────────────────────────────────────────

    @task(3)
    def get_dashboard_summary_current_month(self):
        """
        Tests dashboard data aggregation for the current month.
        This is the main endpoint under load to verify it scales correctly.
        """
        self.client.get(
            "/api/v1/dashboard/summary",
            headers=self.headers,
            name="/api/v1/dashboard/summary (current month)",
        )

    @task(2)
    def get_dashboard_summary_with_params(self):
        """
        Tests dashboard aggregation with explicit month/year query parameters.
        Verifies that filtered historical queries also perform correctly under load.
        """
        self.client.get(
            "/api/v1/dashboard/summary?month=3&year=2026",
            headers=self.headers,
            name="/api/v1/dashboard/summary (with params)",
        )

    @task(2)
    def get_expenses(self):
        """
        Tests listing expenses — one of the most frequent user actions.
        """
        self.client.get(
            "/api/v1/expenses/",
            headers=self.headers,
            name="/api/v1/expenses/ (list)",
        )

    @task(1)
    def get_budgets(self):
        """
        Tests listing budgets for the current month.
        """
        self.client.get(
            "/api/v1/budgets/",
            headers=self.headers,
            name="/api/v1/budgets/ (list)",
        )

    # ── Health & failure endpoints ────────────────────────────────────────────

    @task(1)
    def check_health(self):
        """
        Tests the health check endpoint to verify the DB connection is alive.
        """
        self.client.get("/api/v1/expenses/health")

    @task(1)
    def failed_request(self):
        """
        Intentionally hits a non-existent route to generate 404 errors.
        Required by Sprint 2 guidelines: at least one 'failed' performance test.
        """
        with self.client.get(
            "/api/v1/ruta_inventada_para_que_falle",
            catch_response=True,
            name="/api/v1/NONEXISTENT (expected 404)",
        ) as response:
            if response.status_code == 404:
                # Mark as success — a 404 here is the expected, correct behavior
                response.success()