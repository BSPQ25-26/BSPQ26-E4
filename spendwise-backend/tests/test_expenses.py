import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from app.main import app
from app.dependencies import get_current_user

client = TestClient(app)

class MockUser:
    id = "123e4567-e89b-12d3-a456-426614174000"
    email = "test@ejemplo.com"

# This function activates the mock user ONLY for the tests in this file
@pytest.fixture(autouse=True)
def setup_user_override():
    app.dependency_overrides[get_current_user] = lambda: MockUser()
    yield
    app.dependency_overrides = {}

# Verifies that sending valid data to create an expense returns HTTP 201 and the correct amount.
@patch("services.expenses.routes.create_expense")
def test_create_expense_success(mock_create_expense):
    mock_create_expense.return_value = {
        "id": 1, "amount": 50.50, "user_id": MockUser.id,
        "expense_date": "2026-03-25", "description": "Compra"
    }

    payload = {"amount": 50.50, "description": "Compra", "category_id": 2}
    response = client.post("/api/v1/expenses/", json=payload)
    
    assert response.status_code == 201
    assert response.json()["amount"] == 50.50

# Verifies that the list expenses endpoint works correctly and passes the date parameters.
@patch("services.expenses.routes.get_expenses")
def test_get_expenses_with_filters(mock_get_expenses):
    mock_get_expenses.return_value = []
    response = client.get("/api/v1/expenses/?month=3&year=2026")
    
    assert response.status_code == 200
    mock_get_expenses.assert_called_once_with(MockUser.id, None, 3, 2026, None, None)

# Verifies data validation: sending text instead of a number for 'amount' should return a 422 error.
def test_expense_schema_validation():
    # This test does not need a user because it fails before during data validation
    payload = {"amount": "no_soy_un_numero"}
    response = client.post("/api/v1/expenses/", json=payload)
    assert response.status_code == 422

# Verifies that updating an expense returns 200 when successful.
@patch("services.expenses.routes.update_expense")
def test_update_expense_success(mock_update_expense):
    mock_update_expense.return_value = {"id": 1, "amount": 100.0, "description": "Updated"}
    payload = {"amount": 100.0}
    response = client.put("/api/v1/expenses/1", json=payload)
    assert response.status_code == 200
    assert response.json()["amount"] == 100.0

# Verifies that trying to update a non-existent expense returns a 404 error.
@patch("services.expenses.routes.update_expense")
def test_update_expense_not_found(mock_update_expense):
    mock_update_expense.return_value = None
    payload = {"amount": 100.0}
    response = client.put("/api/v1/expenses/999", json=payload)
    assert response.status_code == 404

# Verifies that successfully deleting an expense returns HTTP 204 No Content.
@patch("services.expenses.routes.delete_expense")
def test_delete_expense_success(mock_delete_expense):
    mock_delete_expense.return_value = None
    response = client.delete("/api/v1/expenses/1")
    assert response.status_code == 204

# Verifies that the health check endpoint responds with OK by mocking the database.
@patch("services.expenses.routes.supabase.table")
def test_db_health(mock_table):
    # Mocking the supabase chain: supabase.table().select().limit().execute()
    mock_execute = mock_table.return_value.select.return_value.limit.return_value.execute
    mock_execute.return_value = type('obj', (object,), {'data': []})
    
    # Needs to clear auth overrides since health is usually public, but we have an autouse fixture.
    # We will just test it directly.
    response = client.get("/api/v1/expenses/health")
    assert response.status_code == 200
    assert response.json()["status"] == "OK"