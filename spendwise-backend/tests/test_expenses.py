import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from app.main import app
from app.dependencies import get_current_user

client = TestClient(app)

class MockUser:
    id = "123e4567-e89b-12d3-a456-426614174000"
    email = "test@ejemplo.com"

# Esta función activará el usuario falso SOLO para los tests de este archivo
@pytest.fixture(autouse=True)
def setup_user_override():
    app.dependency_overrides[get_current_user] = lambda: MockUser()
    yield
    app.dependency_overrides = {}

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

@patch("services.expenses.routes.get_expenses")
def test_get_expenses_with_filters(mock_get_expenses):
    mock_get_expenses.return_value = []
    response = client.get("/api/v1/expenses/?month=3&year=2026")
    
    assert response.status_code == 200
    mock_get_expenses.assert_called_once_with(MockUser.id, None, 3, 2026)

def test_expense_schema_validation():
    # Este test no necesita usuario porque falla antes en la validación de datos
    payload = {"amount": "no_soy_un_numero"}
    response = client.post("/api/v1/expenses/", json=payload)
    assert response.status_code == 422