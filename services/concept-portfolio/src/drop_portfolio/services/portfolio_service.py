from __future__ import annotations

from drop_portfolio.models import ConceptCard, ConceptRequest, StageResult
from drop_portfolio.prompts import portfolio_research_prompt, portfolio_schema


class PortfolioService:
    def __init__(self, backend, portfolio_model: str):
        self.backend = backend
        self.portfolio_model = portfolio_model

    def build_portfolio(self, request: ConceptRequest, approved_concept: ConceptCard) -> StageResult:
        payload = {
            'project_brief': request.project_brief,
            'initial_context': request.initial_context,
            'desired_feeling': request.desired_feeling,
            'seed': request.seed,
            'previous_ideas': request.previous_ideas,
            'approved_concept': approved_concept.model_dump(),
        }
        return self.backend.run_json_stage(
            stage_name='portfolio_research',
            system_prompt=portfolio_research_prompt(),
            user_payload=payload,
            schema=portfolio_schema(),
            model=self.portfolio_model,
        )
