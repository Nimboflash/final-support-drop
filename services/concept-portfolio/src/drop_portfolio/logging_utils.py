from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any


class RunLogger:
    def __init__(self, run_dir: Path, session_id: str):
        self.run_dir = Path(run_dir)
        self.run_dir.mkdir(parents=True, exist_ok=True)
        self.session_id = session_id
        self.model_calls_path = self.run_dir / "model_calls.jsonl"
        self.events_path = self.run_dir / "events.jsonl"

    def log_event(self, event_type: str, payload: dict[str, Any]) -> None:
        row = {
            "ts": time.time(),
            "session_id": self.session_id,
            "event_type": event_type,
            "payload": payload,
        }
        with self.events_path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    def log_model_call(self, row: dict[str, Any]) -> None:
        row = {"ts": time.time(), "session_id": self.session_id, **row}
        with self.model_calls_path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    def summarize_usage(self) -> dict[str, Any]:
        totals = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0, "cost_usd": 0.0}
        records = []
        if self.model_calls_path.exists():
            for line in self.model_calls_path.read_text(encoding="utf-8").splitlines():
                if not line.strip():
                    continue
                rec = json.loads(line)
                records.append(rec)
                usage = rec.get("usage") or {}
                totals["prompt_tokens"] += int(usage.get("prompt_tokens") or 0)
                totals["completion_tokens"] += int(usage.get("completion_tokens") or 0)
                totals["total_tokens"] += int(usage.get("total_tokens") or 0)
                totals["cost_usd"] += float(usage.get("cost_usd") or 0.0)
        summary = {
            "session_id": self.session_id,
            "successful_calls": len(records),
            "totals": {**totals, "cost_usd": round(totals["cost_usd"], 6)},
        }
        (self.run_dir / "usage_summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
        return summary
