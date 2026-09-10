from __future__ import annotations

import json
from typing import Any


def concept_generation_prompt() -> str:
    return (
        "You are the DROP concept generator. Generate 5 concept-level cards from the brief. "
        "Stay at the concept level. Each concept must include a title, one_line, human_truth, "
        "central_idea, guest_takeaway, territory, anchor_score (0-5), portfolio_score (0-5), and why_it_fits. "
        "Do not generate execution tactics. Output JSON only."
    )


def concept_refinement_prompt() -> str:
    return (
        "You are the DROP concept generator in refinement mode. Read the brief, previous concept cards, "
        "the liked concept ids, and the user's feedback. Generate a revised set of 5 concept-level cards. "
        "Preserve useful lineage but improve according to the feedback. Output JSON only."
    )


def portfolio_research_prompt() -> str:
    return (
        "You are the DROP downstream research generator. Based on the approved concept, generate a concept-linked portfolio. "
        "Return: 8 music recommendations, 5 films/series, 5 artworks, 3 scientific readings, 3 artistic/critical readings. "
        "Every item must explicitly explain why it is related to the approved concept. For artworks, explain observable form, "
        "why material/form matters, artist intent if available, curator/scholar view if available, historical/cultural context, "
        "and the DROP connection. Output JSON only."
    )


def concept_generation_schema() -> dict[str, Any]:
    return {
        "type": "object",
        "properties": {
            "round_index": {"type": "integer"},
            "notes": {"type": "string"},
            "concepts": {
                "type": "array",
                "minItems": 5,
                "items": {
                    "type": "object",
                    "properties": {
                        "concept_id": {"type": "string"},
                        "title": {"type": "string"},
                        "one_line": {"type": "string"},
                        "human_truth": {"type": "string"},
                        "central_idea": {"type": "string"},
                        "guest_takeaway": {"type": "string"},
                        "territory": {"type": "string"},
                        "anchor_score": {"type": "integer"},
                        "portfolio_score": {"type": "number"},
                        "why_it_fits": {"type": "string"},
                    },
                    "required": [
                        "concept_id", "title", "one_line", "human_truth", "central_idea",
                        "guest_takeaway", "territory", "anchor_score", "portfolio_score", "why_it_fits"
                    ],
                    "additionalProperties": False,
                },
            },
        },
        "required": ["round_index", "concepts", "notes"],
        "additionalProperties": False,
    }


def portfolio_schema() -> dict[str, Any]:
    base = {
        "type": "object",
        "properties": {
            "rank": {"type": "integer"},
            "title": {"type": "string"},
            "creator": {"type": "string"},
            "why_related": {"type": "string"},
            "source_notes": {"type": "string"},
            "links": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["rank", "title", "creator", "why_related", "source_notes", "links"],
        "additionalProperties": True,
    }
    return {
        "type": "object",
        "properties": {
            "concept_id": {"type": "string"},
            "concept_title": {"type": "string"},
            "music": {"type": "array", "minItems": 4, "items": base},
            "films_and_series": {"type": "array", "minItems": 3, "items": base},
            "artworks": {"type": "array", "minItems": 3, "items": base},
            "scientific_readings": {"type": "array", "minItems": 2, "items": base},
            "artistic_readings": {"type": "array", "minItems": 2, "items": base},
        },
        "required": ["concept_id", "concept_title", "music", "films_and_series", "artworks", "scientific_readings", "artistic_readings"],
        "additionalProperties": True,
    }
