# Modifications to the vendored service

This directory is `drop_concept_portfolio_project.zip` as delivered, vendored into the repository
on the `v2` branch. The upstream README asks for traceability, so every change made after
extraction is listed here. Each one is also marked `DROP MODIFICATION` at its site in the source.

Nothing else was touched: no prompt, no model, no service logic, no test.

## 1. The service could not start without a paid credential

`config.py` — `Settings.from_env()` raised `RuntimeError` whenever `OPENROUTER_API_KEY` was
absent, and `api.py` constructed `OpenRouterBackend` unconditionally. Between them, the API could
not be started at all without a key — not even on the deterministic `MockBackend` that the
project's own tests are written against.

Two changes:

- `Settings` gains a `backend` field, read from `DROP_BACKEND` (`openrouter` by default,
  `mock` accepted). The API key is now required only by the backend that actually uses it.
- `api.py::_service()` selects the backend from that setting.

The real path is unchanged and still the default: with no `DROP_BACKEND` set, behaviour is
exactly as delivered.

## 2. There was no readiness probe

`api.py` gains `GET /health`, returning `{"status": "ok", "backend": "<mock|openrouter>"}`.
Anything supervising the process needs one endpoint that answers without creating a session or
spending a token. It names the backend deliberately, so a mock run can never be mistaken for a
real one.

## What was NOT changed, and why it matters

- `requires-python = ">=3.10"` in `pyproject.toml` is left as delivered, though the service has
  been verified to run on 3.9.6 — every module carries `from __future__ import annotations`, so
  the PEP 604 unions in `config.py` are never evaluated at runtime. The declaration is the
  author's intent and is not ours to weaken.
- `notebooks/reference/` is untouched, as the upstream README requires.
- `demo_runs/` is kept as a committed sample of real output.
