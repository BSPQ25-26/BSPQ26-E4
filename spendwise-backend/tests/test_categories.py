import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from app.main import app

client = TestClient(app)

# Verifies that when querying categories, the API successfully returns a mocked list with a 200 code.
@patch("services.categories.routes.supabase.table")
def test_list_categories_success(mock_table):
    # Setup mock chain: supabase.table().select().order().execute()
    mock_execute = mock_table.return_value.select.return_value.order.return_value.execute
    mock_execute.return_value = type('obj', (object,), {'data': [{"id": 1, "name": "Food"}, {"id": 2, "name": "Travel"}]})
    
    response = client.get("/api/v1/categories/")
    
    assert response.status_code == 200
    assert len(response.json()) == 2
    assert response.json()[0]["name"] == "Food"
