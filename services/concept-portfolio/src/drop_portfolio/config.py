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
    # DROP MODIFICATION (see MODIFICATIONS.md): which backend the service runs
    # on. "mock" needs no API key, which is what lets the system come up, be
    # demonstrated and be tested without a paid credential.
    backend: str = "openrouter"

    @classmethod
    def from_env(cls) -> "Settings":
        load_dotenv()
        backend = os.getenv("DROP_BACKEND", "openrouter").strip().lower()
        api_key = os.getenv("OPENROUTER_API_KEY", "")
        # DROP MODIFICATION: the key is required only by the backend that uses
        # it. Demanding it unconditionally meant the service could not start at
        # all without a paid credential — not even on the deterministic mock its
        # own tests are written against.
        if not api_key and backend != "mock":
            raise RuntimeError(
                "OPENROUTER_API_KEY was not found in the environment. "
                "Set it, or set DROP_BACKEND=mock to run on the deterministic backend."
            )
        return cls(
            backend=backend,
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
