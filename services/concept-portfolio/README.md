# DROP Concept Portfolio Project

A production-style Python project for the DROP workflow.

## What it does

1. **Generate concept candidates** from a brief / context / desired feeling / optional previous ideas.
2. Let you **respond to the concepts** with feedback:
   - approve one concept,
   - refine based on liked concepts + feedback,
   - regenerate if needed.
3. After approval, generate a **research portfolio** around the approved concept:
   - music,
   - films / series,
   - artworks,
   - scientific readings,
   - artistic / critical readings.

The project is built around an API-backed architecture using **OpenRouter**. The API key is loaded from environment variables.

---

## Project structure

```text
DROP project/
├─ src/drop_portfolio/
│  ├─ api.py                    # FastAPI app
│  ├─ cli.py                    # Optional CLI entry points
│  ├─ config.py                 # env/config loading
│  ├─ models.py                 # Pydantic data models
│  ├─ prompts.py                # Prompt builders
│  ├─ parsing.py                # Response extraction / JSON safety
│  ├─ logging_utils.py          # JSONL logging + usage summaries
│  ├─ backends/
│  │  ├─ base.py                # Backend protocol
│  │  ├─ openrouter.py          # Real OpenRouter backend
│  │  └─ mock.py                # Deterministic backend for tests/demo
│  └─ services/
│     ├─ concept_service.py     # Concept generation / refinement
│     ├─ portfolio_service.py   # Music / film / art / reading generation
│     └─ session_service.py     # Session orchestration + persistence
├─ tests/
│  ├─ test_session_flow.py
│  └─ test_api.py
├─ notebooks/
│  ├─ demo_project_usage.ipynb  # Test / usage notebook
│  └─ reference/
│     └─ DROP_Idea_Engine_V7_10_Optimized_Music_Art_Research.ipynb
├─ .env.example
├─ pyproject.toml
└─ requirements.txt
```

---

## Installation

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create `.env` from `.env.example`.

```env
OPENROUTER_API_KEY=your_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
DROP_RUNS_DIR=./drop_runs
DROP_CONCEPT_MODEL=anthropic/claude-sonnet-4.5
DROP_PORTFOLIO_MODEL=anthropic/claude-sonnet-4.5
DROP_VALIDATION_MODEL=openai/gpt-4.1-mini
```

> The defaults are intentionally simple. You can change the models from env without changing code.

---

## Running as an API service

```bash
uvicorn drop_portfolio.api:app --reload
```

### Typical API flow

#### 1) Create a session

```bash
curl -X POST http://127.0.0.1:8000/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "project_brief": "A gathering about things that become meaningful when we return to them.",
    "initial_context": "small intimate cultural gathering",
    "desired_feeling": "reflective, warm, quietly curious",
    "seed": "returning changes us",
    "previous_ideas": []
  }'
```

#### 2) Generate concepts

```bash
curl -X POST http://127.0.0.1:8000/sessions/<SESSION_ID>/concepts/generate
```

#### 3) Refine concepts with feedback

```bash
curl -X POST http://127.0.0.1:8000/sessions/<SESSION_ID>/concepts/respond \
  -H "Content-Type: application/json" \
  -d '{
    "action": "refine",
    "liked_concept_ids": ["concept_02"],
    "feedback": "I like concept 2, but make it less nostalgic and more social."
  }'
```

#### 4) Approve one concept

```bash
curl -X POST http://127.0.0.1:8000/sessions/<SESSION_ID>/concepts/concept_02/approve
```

#### 5) Build the portfolio

```bash
curl -X POST http://127.0.0.1:8000/sessions/<SESSION_ID>/portfolio/build
```

#### 6) Get the full session / result

```bash
curl http://127.0.0.1:8000/sessions/<SESSION_ID>
```

---

## Python usage

```python
from drop_portfolio.config import Settings
from drop_portfolio.backends.openrouter import OpenRouterBackend
from drop_portfolio.services.session_service import SessionService

settings = Settings.from_env()
backend = OpenRouterBackend(settings)
service = SessionService(settings, backend)

session = service.create_session(
    project_brief="A gathering about things that become meaningful when we return to them.",
    initial_context="small intimate cultural gathering",
    desired_feeling="reflective, warm",
    seed="returning changes us",
    previous_ideas=[]
)

session = service.generate_concepts(session.session_id)
# review session.concepts

session = service.respond_to_concepts(
    session.session_id,
    action="refine",
    liked_concept_ids=["concept_02"],
    feedback="Less nostalgic, more relational."
)

session = service.approve_concept(session.session_id, "concept_02")
session = service.build_portfolio(session.session_id)
```

---

## Logging and outputs

Each session gets its own folder under `DROP_RUNS_DIR`.

Typical files:

- `session_state.json`
- `events.jsonl`
- `model_calls.jsonl`
- `usage_summary.json`
- `final_report.md`
- `final_report.json`

---

## Testing

Run:

```bash
pytest -q
```

The tests use the deterministic **mock backend**, so they do not need a real API key.

The project also includes a tested usage notebook:

- `notebooks/demo_project_usage.ipynb`

---

## Notes

- The **idea-generation system is kept separate** from downstream portfolio enrichment.
- The **notebook reference file** is included untouched for traceability.
- The project architecture focuses on **clean file structure, session persistence, testability, and API usability**.
