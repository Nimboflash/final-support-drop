from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from dotenv import load_dotenv


@dataclass
class Settings:
    openrouter_api_key: str
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    runs_dir: Path = Path("./drop_runs")
    concept_model: str = "anthropic/claude-sonnet-4.5"
    portfolio_model: str = "anthropic/claude-sonnet-4.5"
    validation_model: str = "openai/gpt-4.1-mini"
    http_timeout: int = 180
    site_url: str | None = None
    site_name: str | None = "DROP Concept Portfolio"

    @classmethod
    def from_env(cls) -> "Settings":
        load_dotenv()
        api_key = os.getenv("OPENROUTER_API_KEY", "")
        if not api_key:
            raise RuntimeError("OPENROUTER_API_KEY was not found in the environment.")
        return cls(
            openrouter_api_key=api_key,
            openrouter_base_url=os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
            runs_dir=Path(os.getenv("DROP_RUNS_DIR", "./drop_runs")),
            concept_model=os.getenv("DROP_CONCEPT_MODEL", "anthropic/claude-sonnet-4.5"),
            portfolio_model=os.getenv("DROP_PORTFOLIO_MODEL", "anthropic/claude-sonnet-4.5"),
            validation_model=os.getenv("DROP_VALIDATION_MODEL", "openai/gpt-4.1-mini"),
            http_timeout=int(os.getenv("DROP_HTTP_TIMEOUT", "180")),
            site_url=os.getenv("DROP_SITE_URL") or None,
            site_name=os.getenv("DROP_SITE_NAME", "DROP Concept Portfolio"),
        )
