from pathlib import Path

from fastapi.testclient import TestClient

from drop_portfolio.api import app
from drop_portfolio.backends.mock import MockBackend
from drop_portfolio.config import Settings
from drop_portfolio.services.session_service import SessionService


def test_api_like_flow(monkeypatch, tmp_path: Path):
    settings = Settings(openrouter_api_key='test-key', runs_dir=tmp_path)
    service = SessionService(settings, MockBackend())

    import drop_portfolio.api as api_mod
    monkeypatch.setattr(api_mod, '_service', lambda: service)

    client = TestClient(app)
    r = client.post('/sessions', json={
        'project_brief': 'A gathering about how return changes meaning.',
        'initial_context': 'intimate cultural event',
        'desired_feeling': 'reflective and warm',
        'seed': 'we return changed',
        'previous_ideas': [],
    })
    assert r.status_code == 200
    session_id = r.json()['session_id']

    r = client.post(f'/sessions/{session_id}/concepts/generate')
    assert r.status_code == 200
    assert len(r.json()['concept_rounds']) == 1

    r = client.post(f'/sessions/{session_id}/concepts/respond', json={
        'action': 'refine',
        'liked_concept_ids': ['concept_02'],
        'feedback': 'Push it slightly toward collective meaning.'
    })
    assert r.status_code == 200
    assert len(r.json()['concept_rounds']) == 2

    r = client.post(f'/sessions/{session_id}/concepts/concept_02/approve')
    assert r.status_code == 200
    assert r.json()['approved_concept_id'] == 'concept_02'

    r = client.post(f'/sessions/{session_id}/portfolio/build')
    assert r.status_code == 200
    assert r.json()['portfolio'] is not None
