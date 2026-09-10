from __future__ import annotations

import argparse
import json

from drop_portfolio.backends.openrouter import OpenRouterBackend
from drop_portfolio.config import Settings
from drop_portfolio.services.session_service import SessionService


def main() -> None:
    parser = argparse.ArgumentParser(description='DROP Concept Portfolio CLI')
    sub = parser.add_subparsers(dest='command', required=True)

    create_p = sub.add_parser('create')
    create_p.add_argument('--brief', required=True)
    create_p.add_argument('--context', default='')
    create_p.add_argument('--feeling', default='')
    create_p.add_argument('--seed', default='')
    create_p.add_argument('--previous-ideas', nargs='*', default=[])

    gen_p = sub.add_parser('generate')
    gen_p.add_argument('session_id')

    ref_p = sub.add_parser('respond')
    ref_p.add_argument('session_id')
    ref_p.add_argument('--action', choices=['refine', 'regenerate'], required=True)
    ref_p.add_argument('--liked', nargs='*', default=[])
    ref_p.add_argument('--feedback', default='')

    ap_p = sub.add_parser('approve')
    ap_p.add_argument('session_id')
    ap_p.add_argument('concept_id')

    build_p = sub.add_parser('build-portfolio')
    build_p.add_argument('session_id')

    show_p = sub.add_parser('show')
    show_p.add_argument('session_id')

    args = parser.parse_args()
    settings = Settings.from_env()
    service = SessionService(settings, OpenRouterBackend(settings))

    if args.command == 'create':
        state = service.create_session(
            project_brief=args.brief,
            initial_context=args.context,
            desired_feeling=args.feeling,
            seed=args.seed,
            previous_ideas=args.previous_ideas,
        )
    elif args.command == 'generate':
        state = service.generate_concepts(args.session_id)
    elif args.command == 'respond':
        state = service.respond_to_concepts(args.session_id, args.action, args.liked, args.feedback)
    elif args.command == 'approve':
        state = service.approve_concept(args.session_id, args.concept_id)
    elif args.command == 'build-portfolio':
        state = service.build_portfolio(args.session_id)
    elif args.command == 'show':
        state = service.load_session(args.session_id)
    else:
        raise SystemExit(2)

    print(json.dumps(state.model_dump(), ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
