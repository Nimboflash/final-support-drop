from __future__ import annotations

import json
import uuid
from pathlib import Path

from drop_portfolio.config import Settings
from drop_portfolio.logging_utils import RunLogger
from drop_portfolio.models import (
    ConceptBatch,
    ConceptCard,
    ConceptRequest,
    ConceptResponseAction,
    ResearchPortfolio,
    SessionState,
    SessionStatus,
)
from drop_portfolio.services.concept_service import ConceptService
from drop_portfolio.services.portfolio_service import PortfolioService


class SessionService:
    def __init__(self, settings: Settings, backend):
        self.settings = settings
        self.backend = backend
        self.concept_service = ConceptService(backend, settings.concept_model, settings.validation_model)
        self.portfolio_service = PortfolioService(backend, settings.portfolio_model)
        self.settings.runs_dir.mkdir(parents=True, exist_ok=True)

    def _run_dir(self, session_id: str) -> Path:
        return self.settings.runs_dir / session_id

    def _logger(self, session_id: str) -> RunLogger:
        return RunLogger(self._run_dir(session_id), session_id)

    def _state_path(self, session_id: str) -> Path:
        return self._run_dir(session_id) / 'session_state.json'

    def _save(self, state: SessionState) -> SessionState:
        run_dir = self._run_dir(state.session_id)
        run_dir.mkdir(parents=True, exist_ok=True)
        self._state_path(state.session_id).write_text(
            state.model_dump_json(indent=2), encoding='utf-8'
        )
        return state

    def load_session(self, session_id: str) -> SessionState:
        p = self._state_path(session_id)
        if not p.exists():
            raise FileNotFoundError(f'Session not found: {session_id}')
        return SessionState.model_validate_json(p.read_text(encoding='utf-8'))

    def create_session(self, **kwargs) -> SessionState:
        request = ConceptRequest(**kwargs)
        session_id = uuid.uuid4().hex[:12]
        state = SessionState(
            session_id=session_id,
            status=SessionStatus.DRAFT,
            input=request,
            concept_rounds=[],
            run_dir=str(self._run_dir(session_id)),
        )
        self._logger(session_id).log_event('session_created', request.model_dump())
        return self._save(state)

    def generate_concepts(self, session_id: str) -> SessionState:
        state = self.load_session(session_id)
        result = self.concept_service.generate_initial_batch(state.input)
        batch = ConceptBatch.model_validate(result.data)
        state.concept_rounds.append(batch)
        state.status = SessionStatus.CONCEPTS_READY
        logger = self._logger(session_id)
        logger.log_model_call({
            'stage': 'concept_generation',
            'model': result.model,
            'payload': state.input.model_dump(),
            'response': result.data,
            'usage': result.usage.model_dump(),
        })
        logger.log_event('concepts_generated', {'round_index': batch.round_index})
        logger.summarize_usage()
        return self._save(state)

    def respond_to_concepts(self, session_id: str, action: str, liked_concept_ids: list[str] | None = None, feedback: str = '') -> SessionState:
        state = self.load_session(session_id)
        if not state.concept_rounds:
            raise RuntimeError('Generate concepts first.')
        liked_concept_ids = liked_concept_ids or []
        last = state.concept_rounds[-1]
        if action == ConceptResponseAction.REGENERATE.value:
            liked_concept_ids = []
            feedback = feedback or 'Regenerate a new set.'
        result = self.concept_service.refine_batch(state.input, last, liked_concept_ids, feedback)
        batch = ConceptBatch.model_validate(result.data)
        state.concept_rounds.append(batch)
        state.status = SessionStatus.CONCEPTS_READY
        logger = self._logger(session_id)
        logger.log_model_call({
            'stage': 'concept_refinement',
            'model': result.model,
            'payload': {
                'input': state.input.model_dump(),
                'liked_concept_ids': liked_concept_ids,
                'feedback': feedback,
                'previous_round': last.model_dump(),
            },
            'response': result.data,
            'usage': result.usage.model_dump(),
        })
        logger.log_event('concepts_refined', {'round_index': batch.round_index, 'action': action})
        logger.summarize_usage()
        return self._save(state)

    def approve_concept(self, session_id: str, concept_id: str) -> SessionState:
        state = self.load_session(session_id)
        concept = next((c for c in state.concepts if c.concept_id == concept_id), None)
        if concept is None:
            raise RuntimeError(f'Concept not found in latest batch: {concept_id}')
        state.approved_concept_id = concept_id
        state.approved_concept = concept
        state.status = SessionStatus.IDEA_APPROVED
        logger = self._logger(session_id)
        logger.log_event('concept_approved', {'concept_id': concept_id, 'title': concept.title})
        return self._save(state)

    def build_portfolio(self, session_id: str) -> SessionState:
        state = self.load_session(session_id)
        if state.approved_concept is None:
            raise RuntimeError('Approve a concept first.')
        result = self.portfolio_service.build_portfolio(state.input, state.approved_concept)
        portfolio = ResearchPortfolio.model_validate(result.data)
        state.portfolio = portfolio
        state.status = SessionStatus.PORTFOLIO_READY
        logger = self._logger(session_id)
        logger.log_model_call({
            'stage': 'portfolio_research',
            'model': result.model,
            'payload': {
                'input': state.input.model_dump(),
                'approved_concept': state.approved_concept.model_dump(),
            },
            'response': result.data,
            'usage': result.usage.model_dump(),
        })
        logger.log_event('portfolio_built', {'concept_id': state.approved_concept_id})
        summary = logger.summarize_usage()
        self._write_reports(state, summary)
        return self._save(state)

    def _write_reports(self, state: SessionState, usage_summary: dict) -> None:
        assert state.portfolio is not None and state.approved_concept is not None
        report_json = {
            'session_id': state.session_id,
            'approved_concept': state.approved_concept.model_dump(),
            'portfolio': state.portfolio.model_dump(),
            'usage_summary': usage_summary,
        }
        run_dir = self._run_dir(state.session_id)
        (run_dir / 'final_report.json').write_text(
            json.dumps(report_json, ensure_ascii=False, indent=2), encoding='utf-8'
        )
        lines = [
            '# DROP Final Report', '',
            f"## Approved Concept: {state.approved_concept.title}", '',
            f"**One line:** {state.approved_concept.one_line}", '',
            f"**Human truth:** {state.approved_concept.human_truth}", '',
            f"**Central idea:** {state.approved_concept.central_idea}", '',
            '## Music', ''
        ]
        for item in state.portfolio.music:
            lines += [f"- **{item.rank}. {item.creator} — {item.title}**: {item.why_related}"]
        lines += ['', '## Films and Series', '']
        for item in state.portfolio.films_and_series:
            lines += [f"- **{item.rank}. {item.title}** ({item.creator}): {item.why_related}"]
        lines += ['', '## Artworks', '']
        for item in state.portfolio.artworks:
            lines += [f"- **{item.rank}. {item.title}** ({item.creator}): {item.why_related}"]
        lines += ['', '## Scientific Readings', '']
        for item in state.portfolio.scientific_readings:
            lines += [f"- **{item.rank}. {item.title}** ({item.creator}): {item.why_related}"]
        lines += ['', '## Artistic Readings', '']
        for item in state.portfolio.artistic_readings:
            lines += [f"- **{item.rank}. {item.title}** ({item.creator}): {item.why_related}"]
        lines += ['', '## Usage Summary', '', f"- Total tokens: {usage_summary['totals']['total_tokens']}", f"- Total cost: ${usage_summary['totals']['cost_usd']:.6f}"]
        (run_dir / 'final_report.md').write_text('\n'.join(lines), encoding='utf-8')
