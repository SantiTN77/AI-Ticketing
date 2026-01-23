import os
from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient


os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "service-role")
os.environ.setdefault("GEMINI_API_KEY", "fake")
os.environ.setdefault("GEMINI_MODEL", "gemini-2.5-flash")
os.environ.setdefault("GEMINI_MODEL_FALLBACK", "gemini-2.0-flash")


from app import main  # noqa: E402


def test_idempotent_no_llm(monkeypatch):
    ticket = {
        "id": "d3f77bb1-888b-4537-942f-26302190beda",
        "category": "Tecnico",
        "sentiment": "Negativo",
        "processed": True,
    }

    mock_get = Mock(return_value=ticket)
    mock_update = Mock()
    mock_classify = Mock()

    monkeypatch.setattr(main, "get_ticket", mock_get)
    monkeypatch.setattr(main, "update_ticket", mock_update)
    monkeypatch.setattr(main, "classify_ticket", mock_classify)

    client = TestClient(main.app)
    response = client.post(
        "/process-ticket",
        json={"ticket_id": ticket["id"], "description": "No puedo iniciar sesion"},
    )

    assert response.status_code == 200
    assert response.json()["processed"] is True
    assert response.json()["category"] == "Tecnico"
    assert response.json()["sentiment"] == "Negativo"
    mock_classify.assert_not_called()
    mock_update.assert_not_called()


def test_invalid_uuid_returns_400():
    client = TestClient(main.app)
    response = client.post(
        "/process-ticket",
        json={"ticket_id": "not-a-uuid", "description": "test"},
    )
    assert response.status_code == 400
