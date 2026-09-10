from __future__ import annotations

from typing import Optional

from drop_portfolio.models import ConceptBatch, ConceptRequest, StageResult
from drop_portfolio.prompts import concept_generation_prompt, concept_generation_schema, concept_refinement_prompt


class ConceptService:
    def __init__(self, backend, concept_model: str, validation_model: str | None = None):
        self.backend = backend
        self.concept_model = concept_model
        self.validation_model = validation_model or concept_model

    def generate_initial_batch(self, request: ConceptRequest) -> StageResult:
        payload = request.model_dump()
        payload['round_index'] = 1
        return self.backend.run_json_stage(
            stage_name='concept_generation',
            system_prompt=concept_generation_prompt(),
            user_payload=payload,
            schema=concept_generation_schema(),
            model=self.concept_model,
        )

    def refine_batch(self, request: ConceptRequest, previous_batch: ConceptBatch, liked_ids: list[str], feedback: str) -> StageResult:
        payload = request.model_dump()
        payload.update({
            'round_index': previous_batch.round_index + 1,
            'previous_concepts': previous_batch.model_dump(),
            'liked_concept_ids': liked_ids,
            'feedback': feedback,
        })
        return self.backend.run_json_stage(
            stage_name='concept_refinement',
            system_prompt=concept_refinement_prompt(),
            user_payload=payload,
            schema=concept_generation_schema(),
            model=self.concept_model,
        )
