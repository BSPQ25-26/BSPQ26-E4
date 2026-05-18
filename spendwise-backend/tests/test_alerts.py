import pytest
from datetime import date
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch

from app.main import app
from app.dependencies import get_current_user
from services.alerts.crud import get_alert_statuses

client = TestClient(app)

class MockUser:
    id = "123e4567-e89b-12d3-a456-426614174000"


@pytest.fixture(autouse=True)
def setup_user_override():
    app.dependency_overrides[get_current_user] = lambda: MockUser()
    yield
    app.dependency_overrides = {}


@patch("services.alerts.routes.get_alert_statuses")
def test_list_alert_statuses(mock_get_alert_statuses):
    mock_get_alert_statuses.return_value = [
        {
            "id": 1,
            "category_id": 2,
            "category_name": "Food",
            "month": 3,
            "year": 2026,
            "limit_amount": 200.0,
            "spent_amount": 220.0,
            "remaining_amount": -20.0,
            "status": "exceeded",
            "is_over_limit": True,
        }
    ]

    response = client.get("/api/v1/alerts/statuses?month=3&year=2026")

    assert response.status_code == 200
    assert response.json()[0]["status"] == "exceeded"
    mock_get_alert_statuses.assert_called_once_with(MockUser.id, 3, 2026)


@patch("services.alerts.routes.get_alert_statuses")
def test_list_alert_statuses_default_month_year(mock_get_alert_statuses):
    mock_get_alert_statuses.return_value = []

    response = client.get("/api/v1/alerts/statuses")
    today = date.today()

    assert response.status_code == 200
    mock_get_alert_statuses.assert_called_once_with(MockUser.id, today.month, today.year)


@patch("services.alerts.crud.get_expenses")
def test_get_alert_statuses_computes_status(mock_get_expenses):
    mock_get_expenses.return_value = [
        {"amount": "120.0", "category_id": 2},
        {"amount": "90.0", "category_id": None},
    ]
    mock_query = Mock()
    mock_query.select.return_value = mock_query
    mock_query.eq.return_value = mock_query
    mock_query.execute.return_value.data = [
        {
            "id": 1,
            "amount": "100.0",
            "month": 3,
            "year": 2026,
            "category_id": 2,
            "categories": {"name": "Food", "icon": "utensils", "color": "#FF0000"},
        },
        {
            "id": 2,
            "amount": "250.0",
            "month": 3,
            "year": 2026,
            "category_id": None,
            "categories": None,
        },
    ]

    with patch("services.alerts.crud.supabase", new=Mock(table=Mock(return_value=mock_query))):
        statuses = get_alert_statuses("user-id", 3, 2026)

    assert len(statuses) == 2
    assert statuses[0]["status"] == "exceeded"
    assert statuses[1]["status"] == "ok"
    assert statuses[0]["category_name"] == "Food"
    assert statuses[1]["category_name"] is None
