import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from app.main import app

client = TestClient(app)

# Nos aseguramos de que para estos tests la seguridad esté ACTIVADA
app.dependency_overrides = {}

def test_missing_auth_header():
    response = client.get("/api/v1/expenses/")
    assert response.status_code == 422 # Error de Header faltante

def test_invalid_auth_header_format():
    response = client.get("/api/v1/expenses/", headers={"Authorization": "Basic 123"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid authorization header"

@patch("app.dependencies.supabase.auth.get_user")
def test_invalid_or_expired_token(mock_get_user):
    mock_get_user.side_effect = Exception("Expired")
    response = client.get("/api/v1/expenses/", headers={"Authorization": "Bearer token"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid or expired token"