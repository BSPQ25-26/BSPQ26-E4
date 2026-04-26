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

# Verifies that when querying categories, the API successfully returns a mocked list with a 200 code.
@patch("services.categories.routes.get_categories")
def test_list_categories_success(mock_get_categories):
    mock_get_categories.return_value = [{"id": 1, "name": "Food"}, {"id": 2, "name": "Travel"}]
    
    response = client.get("/api/v1/categories/")
    
    assert response.status_code == 200
    assert len(response.json()) == 2
    assert response.json()[0]["name"] == "Food"
    mock_get_categories.assert_called_once_with(MockUser.id)


@patch("services.categories.routes.get_hidden_shared_categories")
def test_list_hidden_categories_success(mock_get_hidden_categories):
    mock_get_hidden_categories.return_value = [{"id": 9, "name": "Travel"}]

    response = client.get("/api/v1/categories/hidden")

    assert response.status_code == 200
    assert response.json() == [{"id": 9, "name": "Travel"}]
    mock_get_hidden_categories.assert_called_once_with(MockUser.id)


@patch("services.categories.routes.create_category")
def test_create_category_success(mock_create_category):
    mock_create_category.return_value = {"id": 3, "name": "Pets", "icon": "🐶"}

    response = client.post(
        "/api/v1/categories/",
        json={"name": "Pets", "icon": "🐶", "color": "#22C55E"},
    )

    assert response.status_code == 201
    assert response.json()["name"] == "Pets"
    mock_create_category.assert_called_once()
    assert mock_create_category.call_args.args[0] == MockUser.id


@patch("services.categories.routes.update_category")
def test_update_category_success(mock_update_category):
    mock_update_category.return_value = {"id": 1, "name": "Food & Drinks"}

    response = client.put(
        "/api/v1/categories/1",
        json={"name": "Food & Drinks"},
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Food & Drinks"
    assert mock_update_category.call_args.args[0] == 1
    assert mock_update_category.call_args.args[1] == MockUser.id


def test_update_category_empty_payload():
    response = client.put("/api/v1/categories/1", json={})

    assert response.status_code == 400
    assert response.json()["detail"] == "No fields to update"


@patch("services.categories.routes.category_has_dependencies")
@patch("services.categories.routes.delete_category")
def test_delete_category_success(mock_delete_category, mock_category_has_dependencies):
    mock_category_has_dependencies.return_value = False

    response = client.delete("/api/v1/categories/1")

    assert response.status_code == 204
    mock_delete_category.assert_called_once_with(1, MockUser.id)


@patch("services.categories.routes.category_has_dependencies")
def test_delete_category_conflict(mock_category_has_dependencies):
    mock_category_has_dependencies.return_value = True

    response = client.delete("/api/v1/categories/1")

    assert response.status_code == 409
    assert response.json()["detail"] == "Category is still in use by expenses or budgets"


@patch("services.categories.routes.hide_shared_category")
def test_hide_shared_category_success(mock_hide_shared_category):
    mock_hide_shared_category.return_value = True

    response = client.post("/api/v1/categories/5/hide")

    assert response.status_code == 204
    mock_hide_shared_category.assert_called_once_with(5, MockUser.id)


@patch("services.categories.routes.hide_shared_category")
def test_hide_shared_category_not_found(mock_hide_shared_category):
    mock_hide_shared_category.return_value = False

    response = client.post("/api/v1/categories/5/hide")

    assert response.status_code == 404
    assert response.json()["detail"] == "Shared category not found"


@patch("services.categories.routes.unhide_shared_category")
def test_unhide_shared_category_success(mock_unhide_shared_category):
    response = client.delete("/api/v1/categories/5/hide")

    assert response.status_code == 204
    mock_unhide_shared_category.assert_called_once_with(5, MockUser.id)
