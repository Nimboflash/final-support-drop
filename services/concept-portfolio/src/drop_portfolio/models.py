from __future__ import annotations

from enum import Enum
from typing import Any, List, Optional
from pydantic import BaseModel, Field


class SessionStatus(str, Enum):
    DRAFT = "DRAFT"
    CONCEPTS_READY = "CONCEPTS_READY"
    IDEA_APPROVED = "IDEA_APPROVED"
    PORTFOLIO_READY = "PORTFOLIO_READY"


class ConceptRequest(BaseModel):
    project_brief: str
    initial_context: str = ""
    desired_feeling: str = ""
    seed: str = ""
    previous_ideas: List[str] = Field(default_factory=list)


class ConceptCard(BaseModel):
    concept_id: str
    title: str
    one_line: str
    human_truth: str
    central_idea: str
    guest_takeaway: str
    territory: str
    anchor_score: int = 0
    portfolio_score: float = 0.0
    why_it_fits: str = ""


class ConceptBatch(BaseModel):
    round_index: int
    concepts: List[ConceptCard]
    notes: str = ""


class ConceptResponseAction(str, Enum):
    REFINE = "refine"
    REGENERATE = "regenerate"


class ConceptResponsePayload(BaseModel):
    action: ConceptResponseAction
    liked_concept_ids: List[str] = Field(default_factory=list)
    feedback: str = ""


class RecommendationBase(BaseModel):
    rank: int
    title: str
    creator: str
    why_related: str
    source_notes: str = ""
    links: List[str] = Field(default_factory=list)


class MusicRecommendation(RecommendationBase):
    type: str = "music"
    origin: str = ""
    vocal_type: str = ""
    sonic_fit: str = ""
    lyrical_fit: str = ""
    creator_context: str = ""


class ScreenRecommendation(RecommendationBase):
    type: str = "screen"
    format: str = "film_or_series"
    thematic_fit: str = ""


class ArtworkRecommendation(RecommendationBase):
    type: str = "artwork"
    medium: str = ""
    observable_form: str = ""
    material_or_form_relevance: str = ""
    artist_intent: str = ""
    curator_or_scholar_view: str = ""
    historical_or_cultural_context: str = ""
    drop_connection: str = ""


class ReadingRecommendation(RecommendationBase):
    type: str = "reading"
    category: str = "scientific_or_artistic"
    summary: str = ""
    conceptual_link: str = ""


class ResearchPortfolio(BaseModel):
    concept_id: str
    concept_title: str
    music: List[MusicRecommendation]
    films_and_series: List[ScreenRecommendation]
    artworks: List[ArtworkRecommendation]
    scientific_readings: List[ReadingRecommendation]
    artistic_readings: List[ReadingRecommendation]


class SessionState(BaseModel):
    session_id: str
    status: SessionStatus
    input: ConceptRequest
    concept_rounds: List[ConceptBatch] = Field(default_factory=list)
    approved_concept_id: Optional[str] = None
    approved_concept: Optional[ConceptCard] = None
    portfolio: Optional[ResearchPortfolio] = None
    run_dir: str

    @property
    def concepts(self) -> list[ConceptCard]:
        return self.concept_rounds[-1].concepts if self.concept_rounds else []


class StageUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    cost_usd: float = 0.0
    latency_seconds: float = 0.0


class StageResult(BaseModel):
    data: dict[str, Any]
    usage: StageUsage = Field(default_factory=StageUsage)
    model: str = ""
