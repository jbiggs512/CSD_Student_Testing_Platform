import pytest
from fastapi.testclient import TestClient

from app.main import app

@pytest.fixture
def client():
    """
    A test client for the FastAPI app.
    This lets you make requests without actually running a web server.
    """
    with TestClient(app) as c:
        yield c
