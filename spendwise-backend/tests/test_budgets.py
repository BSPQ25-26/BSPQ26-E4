import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
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

# Verifies that requesting the list of budgets returns a 200 code and the mocked list.
@patch("services.budgets.routes.get_budgets")
def test_list_budgets(mock_get_budgets):
    mock_get_budgets.return_value = [{"id": 1, "amount": 500, "category_id": 2}]
    response = client.get("/api/v1/budgets/?month=3&year=2026")
    
    assert response.status_code == 200
    mock_get_budgets.assert_called_once_with(MockUser.id, 2026, 3)

# Verifies that a budget can be created correctly and returns HTTP 201.
@patch("services.budgets.routes.create_budget")
def test_create_budget_success(mock_create_budget):
    mock_create_budget.return_value = {"id": 1, "amount": 500, "category_id": 2, "month": 3, "year": 2026}
    payload = {"amount": 500, "category_id": 2, "month": 3, "year": 2026}
    response = client.post("/api/v1/budgets/", json=payload)
    
    assert response.status_code == 201
    assert response.json()["amount"] == 500

# Verifies that if creation fails internally (returns None), the API responds with a 400 Bad Request.
@patch("services.budgets.routes.create_budget")
def test_create_budget_fail(mock_create_budget):
    mock_create_budget.return_value = None
    payload = {"amount": 500, "category_id": 2, "month": 3, "year": 2026}
    response = client.post("/api/v1/budgets/", json=payload)
    
    assert response.status_code == 400

# Verifies that the budget is updated correctly (HTTP 200).
@patch("services.budgets.routes.update_budget")
def test_update_budget_success(mock_update_budget):
    mock_update_budget.return_value = {"id": 1, "amount": 600}
    payload = {"amount": 600}
    response = client.put("/api/v1/budgets/1", json=payload)
    
    assert response.status_code == 200
    assert response.json()["amount"] == 600

# Verifies that sending an update request with no fields returns a 400 error.
def test_update_budget_empty():
    payload = {}
    response = client.put("/api/v1/budgets/1", json=payload)
    assert response.status_code == 400
    assert response.json()["detail"] == "No fields to update"

# Verifies that deleting a budget returns HTTP 204.
@patch("services.budgets.routes.delete_budget")
def test_delete_budget_success(mock_delete_budget):
    mock_delete_budget.return_value = None
    response = client.delete("/api/v1/budgets/1")
    assert response.status_code == 204
