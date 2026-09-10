from __future__ import annotations

import json
import time
from typing import Any
import requests

from drop_portfolio.config import Settings
from drop_portfolio.models import StageResult, StageUsage
from drop_portfolio.parsing import extract_json_object


class OpenRouterBackend:
    def __init__(self, settings: Settings):
        self.settings = settings

    def run_json_stage(
        self,
        *,
        stage_name: str,
        system_prompt: str,
        user_payload: dict[str, Any],
        schema: dict[str, Any],
        model: str,
    ) -> StageResult:
        url = self.settings.openrouter_base_url.rstrip('/') + '/chat/completions'
        headers = {
            'Authorization': f'Bearer {self.settings.openrouter_api_key}',
            'Content-Type': 'application/json',
        }
        if self.settings.site_url:
            headers['HTTP-Referer'] = self.settings.site_url
        if self.settings.site_name:
            headers['X-Title'] = self.settings.site_name
        payload = {
            'model': model,
            'messages': [
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': json.dumps(user_payload, ensure_ascii=False)},
            ],
            'response_format': {
                'type': 'json_schema',
                'json_schema': {
                    'name': stage_name,
                    'strict': True,
                    'schema': schema,
                },
            },
        }
        start = time.time()
        resp = requests.post(url, headers=headers, json=payload, timeout=self.settings.http_timeout)
        latency = time.time() - start
        resp.raise_for_status()
        data = resp.json()
        content = data['choices'][0]['message']['content']
        if isinstance(content, list):
            text = ''.join(chunk.get('text', '') for chunk in content if isinstance(chunk, dict))
        else:
            text = content or ''
        parsed = extract_json_object(text)
        usage = data.get('usage') or {}
        stage_usage = StageUsage(
            prompt_tokens=int(usage.get('prompt_tokens') or 0),
            completion_tokens=int(usage.get('completion_tokens') or 0),
            total_tokens=int(usage.get('total_tokens') or 0),
            cost_usd=float(usage.get('cost') or usage.get('cost_usd') or 0.0),
            latency_seconds=latency,
        )
        return StageResult(data=parsed, usage=stage_usage, model=model)
