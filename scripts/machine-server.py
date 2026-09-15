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

Which backend runs is decided by whether a credential is PRESENT, not by a
default that has to be remembered. `pnpm machine:up` used to force
`DROP_BACKEND=mock`, so pasting a real OpenRouter key into the panel changed
nothing: the run still came back with the deterministic backend's three fixed
concepts and OpenRouter was never called. A key that is configured and silently
unused is worse than no key at all, because the output looks like it worked.

So: a key in the environment means the real backend, no key means the mock one,
and `DROP_BACKEND` set explicitly overrides both — because an operator naming a
backend outranks an inference. The banner says which one is running, every time.
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


def _load_service_env() -> None:
    """Put `services/concept-portfolio/.env` into the environment.

    The service calls `load_dotenv()` with no path, which searches from the
    PROCESS's working directory — and this launcher runs from the repository
    root, where there is no `.env` and where one would not be gitignored
    anyway (`.gitignore` covers exactly the service's own path). So the file
    the panel writes would never be found.

    Read here instead, and never with `override`: a variable already exported
    into the environment is a deliberate act by whoever started this, and it
    outranks a file.
    """
    env_path = Path(__file__).resolve().parent.parent / "services" / "concept-portfolio" / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        trimmed = line.strip()
        if not trimmed or trimmed.startswith("#") or "=" not in trimmed:
            continue
        name, _, value = trimmed.partition("=")
        os.environ.setdefault(name.strip(), value.strip())


def _chosen_backend() -> str:
    """`DROP_BACKEND` if set, else real when a credential exists, else mock.

    Inferred rather than defaulted, because both defaults are wrong somewhere:
    defaulting to mock silently ignores a key the user just pasted, and
    defaulting to real makes the service unstartable for anyone without one
    (`Settings.from_env()` raises on a missing key).
    """
    explicit = os.getenv("DROP_BACKEND", "").strip().lower()
    if explicit:
        return explicit
    return "openrouter" if os.getenv("OPENROUTER_API_KEY") else "mock"


def main() -> None:
    _load_service_env()
    backend = _chosen_backend()
    if backend == "mock":
        # Rebound on the module, so every route resolves it at call time.
        api_mod._service = _mock_service  # noqa: SLF001

    host = os.getenv("DROP_MACHINE_HOST", "127.0.0.1")
    port = int(os.getenv("DROP_MACHINE_PORT", "8000"))
    # Whether a credential is present, never what it is.
    credential = "set" if os.getenv("OPENROUTER_API_KEY") else "absent"
    print(
        f"concept-portfolio on http://{host}:{port} (backend={backend}, credential={credential})",
        flush=True,
    )
    if backend == "mock" and credential == "set":
        # The one combination that looks like it is working and is not.
        print(
            "  note: DROP_BACKEND=mock is set, so the configured key will NOT be used.",
            flush=True,
        )
    if backend != "mock" and credential == "absent":
        print(
            "  note: no OPENROUTER_API_KEY. Paste one in the panel (تنظیمات) and restart this,"
            " or set DROP_BACKEND=mock to run without spending.",
            flush=True,
        )
    uvicorn.run(api_mod.app, host=host, port=port, log_level="info")


if __name__ == "__main__":
    main()
