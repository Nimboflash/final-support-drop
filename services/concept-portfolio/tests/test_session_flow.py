from pathlib import Path

from drop_portfolio.backends.mock import MockBackend
from drop_portfolio.config import Settings
from drop_portfolio.services.session_service import SessionService


def test_session_flow(tmp_path: Path):
    settings = Settings(openrouter_api_key='test-key', runs_dir=tmp_path)
    service = SessionService(settings, MockBackend())

    session = service.create_session(
        project_brief='A gathering about how return changes meaning.',
        initial_context='intimate cultural event',
        desired_feeling='reflective and warm',
        seed='we return changed',
        previous_ideas=[],
    )
    assert session.status.value == 'DRAFT'

    session = service.generate_concepts(session.session_id)
    assert session.status.value == 'CONCEPTS_READY'
    assert len(session.concepts) == 5

    session = service.respond_to_concepts(
        session.session_id,
        action='refine',
        liked_concept_ids=['concept_02'],
        feedback='Less nostalgic, more social.'
    )
    assert len(session.concepts) == 5
    assert len(session.concept_rounds) == 2

    session = service.approve_concept(session.session_id, 'concept_02')
    assert session.status.value == 'IDEA_APPROVED'
    assert session.approved_concept is not None

    session = service.build_portfolio(session.session_id)
    assert session.status.value == 'PORTFOLIO_READY'
    assert session.portfolio is not None
    assert len(session.portfolio.music) >= 4
    assert len(session.portfolio.artworks) >= 3

    report_json = tmp_path / session.session_id / 'final_report.json'
    report_md = tmp_path / session.session_id / 'final_report.md'
    assert report_json.exists()
    assert report_md.exists()
