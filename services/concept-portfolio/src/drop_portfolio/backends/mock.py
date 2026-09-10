from __future__ import annotations

from typing import Any

from drop_portfolio.models import StageResult, StageUsage


class MockBackend:
    def __init__(self):
        self.counter = 0

    def run_json_stage(
        self,
        *,
        stage_name: str,
        system_prompt: str,
        user_payload: dict[str, Any],
        schema: dict[str, Any],
        model: str,
    ) -> StageResult:
        self.counter += 1
        if stage_name.startswith('concept'):
            round_index = int(user_payload.get('round_index') or 1)
            feedback = user_payload.get('feedback', '')
            suffix = ' refined' if feedback else ''
            data = {
                'round_index': round_index,
                'notes': 'Mock concept generation.',
                'concepts': [
                    {
                        'concept_id': f'concept_{i:02d}',
                        'title': [
                            'What returns differently',
                            'The second meaning',
                            'What changes in us',
                            'A familiar thing reopened',
                            'Not the same return',
                        ][i-1] + suffix,
                        'one_line': 'A concept about returning with changed perception.',
                        'human_truth': 'People often return to the same thing with a changed self.',
                        'central_idea': 'Meaning changes because we change.',
                        'guest_takeaway': 'Returning can reveal who we are now.',
                        'territory': ['MEMORY', 'TEMPORAL', 'CULTURAL', 'SOCIAL', 'ATTENTION'][i-1],
                        'anchor_score': 5 if i < 4 else 4,
                        'portfolio_score': round(4.8 - i*0.2 + (0.05 if feedback and i == 2 else 0), 2),
                        'why_it_fits': 'It directly extends the brief about renewed meaning in return.'
                    }
                    for i in range(1, 6)
                ]
            }
        elif stage_name == 'portfolio_research':
            concept_title = user_payload['approved_concept']['title']
            data = {
                'concept_id': user_payload['approved_concept']['concept_id'],
                'concept_title': concept_title,
                'music': [
                    {
                        'rank': i,
                        'title': f'Music Track {i}',
                        'creator': f'Artist {i}',
                        'why_related': f'Track {i} matches the concept through reflective return and layered meaning.',
                        'source_notes': 'Mock source note.',
                        'links': [f'https://example.com/music/{i}'],
                        'origin': 'IRANIAN' if i % 2 else 'INTERNATIONAL',
                        'vocal_type': 'VOCAL' if i % 2 else 'INSTRUMENTAL',
                        'sonic_fit': 'Quietly reflective, layered, with a feeling of return.',
                        'lyrical_fit': 'The lyrics echo return and changed selfhood.',
                        'creator_context': 'The artist describes revisiting memory and present feeling.',
                    }
                    for i in range(1, 9)
                ],
                'films_and_series': [
                    {
                        'rank': i,
                        'title': f'Film or Series {i}',
                        'creator': f'Director {i}',
                        'why_related': 'This work explores return, memory, and changing meaning.',
                        'source_notes': 'Mock source note.',
                        'links': [f'https://example.com/screen/{i}'],
                        'format': 'film' if i < 4 else 'series',
                        'thematic_fit': 'Return changes through time and relationships.'
                    }
                    for i in range(1, 6)
                ],
                'artworks': [
                    {
                        'rank': i,
                        'title': f'Artwork {i}',
                        'creator': f'Artist {i}',
                        'why_related': 'The artwork shows how form and memory interact through re-reading.',
                        'source_notes': 'Mock source note.',
                        'links': [f'https://example.com/art/{i}'],
                        'medium': 'installation' if i % 2 else 'photography',
                        'observable_form': 'Layered composition with repeated visual motifs.',
                        'material_or_form_relevance': 'Its material structure rewards return and second reading.',
                        'artist_intent': 'The artist explores time, memory, and re-encounter.',
                        'curator_or_scholar_view': 'Scholars read it as a work about repetition and changed perspective.',
                        'historical_or_cultural_context': 'It sits in a contemporary context of memory and identity.',
                        'drop_connection': 'It mirrors the concept that return acquires a new layer of meaning.'
                    }
                    for i in range(1, 6)
                ],
                'scientific_readings': [
                    {
                        'rank': i,
                        'title': f'Scientific Reading {i}',
                        'creator': f'Author {i}',
                        'why_related': 'This reading supports the psychology of memory and renewed interpretation.',
                        'source_notes': 'Mock source note.',
                        'links': [f'https://example.com/science/{i}'],
                        'category': 'scientific',
                        'summary': 'A short explanation of memory, perception, or re-appraisal.',
                        'conceptual_link': 'It explains how perception changes when we revisit the same thing.'
                    }
                    for i in range(1, 4)
                ],
                'artistic_readings': [
                    {
                        'rank': i,
                        'title': f'Artistic Reading {i}',
                        'creator': f'Critic {i}',
                        'why_related': 'This essay supports the concept through cultural and aesthetic interpretation.',
                        'source_notes': 'Mock source note.',
                        'links': [f'https://example.com/artistic/{i}'],
                        'category': 'artistic',
                        'summary': 'A short essay-level description about re-encounter and interpretation.',
                        'conceptual_link': 'It frames return as a way of producing new meaning.'
                    }
                    for i in range(1, 4)
                ],
            }
        else:
            data = {}
        usage = StageUsage(prompt_tokens=500, completion_tokens=800, total_tokens=1300, cost_usd=0.01)
        return StageResult(data=data, usage=usage, model=model)
