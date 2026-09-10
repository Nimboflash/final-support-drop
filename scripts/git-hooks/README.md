# Git hooks

Enable them once per clone:

```bash
git config core.hooksPath scripts/git-hooks
```

Hooks are not shared by git itself — `.git/hooks` is not versioned — so they
live here and are opted into by that one setting.

## `pre-push`

Refuses a push to `main`, because v1 is frozen (CLAUDE.md, "Branches"). The
freeze cannot be enforced on the server: GitHub branch protection needs Pro on a
private repository. Override deliberately with `git push --no-verify`.
