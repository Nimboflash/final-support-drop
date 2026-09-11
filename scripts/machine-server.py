"""Run the vendored concept-portfolio API without modifying one byte of it.

The service at `services/concept-portfolio/` is the owner's, VERBATIM. It is
not ours to edit — not to add a health route, not to make a credential
optional, not for anything (ADR-0021 D2).

Two things follow from that, and this file is where both are solved:

1. `api._service()` builds `OpenRouterBackend` unconditionally, and
   `Settings.from_env()` raises when `OPENROUTER_API_KEY` is absent. So the
   service as written cannot be demonstrated or driven without a paid
   credential.

   This overrides `_service` from OUTSIDE the module, which is exactly what the
   service's OWN test suite does — `tests/test_api.py` does
   `monkeypatch.setattr(api_mod, '_service', lambda: service)` and constructs
   `Settings(...)` directly rather than through `from_env()`. Nothing is
   patched that its authors do not already patch themselves.

2. Readiness. The app has no health route, and adding one was a modification.
   It does not need one: `Settings.from_env()` is reached ONLY from
   `_service()`, so FastAPI's own `/openapi.json` answers without touching
   configuration, without creating a session and without spending a token.

`DROP_BACKEND=mock` selects the deterministic backend. Anything else leaves the
service exactly as its authors wrote it, real credential and all.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

SERVICE_SRC = Path(__file__).resolve().parent.parent / "services" / "concept-portfolio" / "src"
sys.path.insert(0, str(SERVICE_SRC))

import uvicorn  # noqa: E402

import drop_portfolio.api as api_mod  # noqa: E402
from drop_portfolio.backends.mock import MockBackend  # noqa: E402
from drop_portfolio.config import Settings  # noqa: E402
from drop_portfolio.services.session_service import SessionService  # noqa: E402


def _mock_service() -> SessionService:
    """A SessionService on the deterministic backend.

    `Settings(...)` directly rather than `Settings.from_env()`: the constructor
    is a plain dataclass and takes no credential path, which is how the
    service's own tests avoid needing a key.
    """
    settings = Settings(
        openrouter_api_key="unused-by-the-mock-backend",
        runs_dir=Path(os.getenv("DROP_RUNS_DIR", "./drop_runs")),
    )
    return SessionService(settings, MockBackend())


def main() -> None:
    backend = os.getenv("DROP_BACKEND", "openrouter").strip().lower()
    if backend == "mock":
        # Rebound on the module, so every route resolves it at call time.
        api_mod._service = _mock_service  # noqa: SLF001

    host = os.getenv("DROP_MACHINE_HOST", "127.0.0.1")
    port = int(os.getenv("DROP_MACHINE_PORT", "8000"))
    print(f"concept-portfolio on http://{host}:{port} (backend={backend})", flush=True)
    uvicorn.run(api_mod.app, host=host, port=port, log_level="info")


if __name__ == "__main__":
    main()
