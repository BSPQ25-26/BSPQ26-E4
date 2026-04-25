import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from datetime import date
from app.main import app
from app.dependencies import get_current_user

client = TestClient(app)

class MockUser:
    id = "123e4567-e89b-12d3-a456-426614174000"

@pytest.fixture(autouse=True)
def setup_user_override():
    app.dependency_overrides[get_current_user] = lambda: MockUser()
    yield
    app.dependency_overrides = {}

# Verifies that the dashboard endpoint correctly returns the summary using the month and year filters specified in the URL.
@patch("services.dashboard.routes.get_monthly_summary")
def test_get_summary_with_params(mock_get_monthly_summary):
    mock_get_monthly_summary.return_value = {
        "total_monthly_spending": 150.0,
        "average_daily_costs": 5.0,
        "month": 3,
        "year": 2026
    }
    
    response = client.get("/api/v1/dashboard/summary?month=3&year=2026")
    
    assert response.status_code == 200
    assert response.json()["total_monthly_spending"] == 150.0
    mock_get_monthly_summary.assert_called_once_with(MockUser.id, 3, 2026)

# Verifies that if no URL filters are sent, the dashboard intelligently defaults to the current month and year.
@patch("services.dashboard.routes.get_monthly_summary")
def test_get_summary_default(mock_get_monthly_summary):
    mock_get_monthly_summary.return_value = {
        "total_monthly_spending": 0.0,
        "average_daily_costs": 0.0,
        "month": date.today().month,
        "year": date.today().year
    }
    
    response = client.get("/api/v1/dashboard/summary")
    
    today = date.today()
    assert response.status_code == 200
    mock_get_monthly_summary.assert_called_once_with(MockUser.id, today.month, today.year)
