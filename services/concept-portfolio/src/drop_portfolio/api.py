from __future__ import annotations

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from drop_portfolio.config import Settings
from drop_portfolio.backends.openrouter import OpenRouterBackend
from drop_portfolio.models import ConceptRequest, ConceptResponsePayload, SessionState
from drop_portfolio.services.session_service import SessionService


def _service() -> SessionService:
    settings = Settings.from_env()
    backend = OpenRouterBackend(settings)
    return SessionService(settings, backend)


app = FastAPI(title='DROP Concept Portfolio API')


@app.post('/sessions', response_model=SessionState)
def create_session(payload: ConceptRequest):
    return _service().create_session(**payload.model_dump())


@app.post('/sessions/{session_id}/concepts/generate', response_model=SessionState)
def generate_concepts(session_id: str):
    try:
        return _service().generate_concepts(session_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post('/sessions/{session_id}/concepts/respond', response_model=SessionState)
def respond_to_concepts(session_id: str, payload: ConceptResponsePayload):
    try:
        return _service().respond_to_concepts(
            session_id,
            action=payload.action.value,
            liked_concept_ids=payload.liked_concept_ids,
            feedback=payload.feedback,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post('/sessions/{session_id}/concepts/{concept_id}/approve', response_model=SessionState)
def approve_concept(session_id: str, concept_id: str):
    try:
        return _service().approve_concept(session_id, concept_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post('/sessions/{session_id}/portfolio/build', response_model=SessionState)
def build_portfolio(session_id: str):
    try:
        return _service().build_portfolio(session_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get('/sessions/{session_id}', response_model=SessionState)
def get_session(session_id: str):
    try:
        return _service().load_session(session_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))
