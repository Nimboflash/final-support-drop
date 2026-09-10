from __future__ import annotations

from typing import Any, Protocol

from drop_portfolio.models import StageResult


class LLMBackend(Protocol):
    def run_json_stage(
        self,
        *,
        stage_name: str,
        system_prompt: str,
        user_payload: dict[str, Any],
        schema: dict[str, Any],
        model: str,
    ) -> StageResult:
        ...
