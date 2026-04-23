import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from app.main import app

client = TestClient(app)

# We ensure that security is ENABLED for these tests
app.dependency_overrides = {}

# Verifies that attempting to access a protected route without a Token blocks access with a 403 Forbidden error.
def test_missing_auth_header():
    response = client.get("/api/v1/expenses/")
    assert response.status_code == 403 # HTTPBearer devuelve 403 si falta el header

# Verifies that sending a Token with an incorrect format (e.g., 'Basic' instead of 'Bearer') throws a 403 error.
def test_invalid_auth_header_format():
    response = client.get("/api/v1/expenses/", headers={"Authorization": "Basic 123"})
    assert response.status_code == 403
    assert response.json()["detail"] == "Invalid authentication credentials"

# Simulates a failure in the Supabase authentication service (e.g., Expired Token) and verifies it returns a 401 Unauthorized error.
@patch("app.dependencies.supabase.auth.get_user")
def test_invalid_or_expired_token(mock_get_user):
    mock_get_user.side_effect = Exception("Expired")
    response = client.get("/api/v1/expenses/", headers={"Authorization": "Bearer token"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid or expired token"