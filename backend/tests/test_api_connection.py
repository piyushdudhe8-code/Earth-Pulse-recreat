import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_health_endpoint_returns_ok(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_docs_and_existing_api_routes_are_registered(client):
    response = client.get("/docs")
    assert response.status_code == 200

    paths = app.openapi()["paths"]
    assert "/api/analyze" in paths
    assert "/api/projection/models" in paths
    assert "/api/projection/analyze" in paths
    assert "/api/cmr/collections" in paths
    assert "/api/geocode" in paths
    assert "/api/probability" in paths
    assert "/api/research-assistant" in paths


@pytest.mark.parametrize("origin", ["http://localhost:3000", "http://127.0.0.1:3000"])
@pytest.mark.parametrize("method", ["GET", "POST"])
def test_cors_preflight_allows_frontend_requests(client, origin, method):
    response = client.options(
        "/api/analyze",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": method,
            "Access-Control-Request-Headers": "content-type,authorization",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
    assert method in response.headers["access-control-allow-methods"]
    allowed_headers = response.headers["access-control-allow-headers"].lower()
    assert "content-type" in allowed_headers
    assert "authorization" in allowed_headers
    assert response.headers.get("access-control-allow-credentials") != "true"


def test_cors_preflight_does_not_allow_unconfigured_origins(client):
    response = client.options(
        "/api/analyze",
        headers={
            "Origin": "https://untrusted.example",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers
