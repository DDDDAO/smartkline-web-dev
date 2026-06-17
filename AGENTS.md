<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Code Size and Refactoring

Keep TypeScript and TSX files around 500 lines or less. When a file approaches
that size, split it by responsibility instead of adding more logic to it.

Preferred split boundaries:

- UI components: move subcomponents, presentation-only overlays, modal bodies,
  and formatting helpers into adjacent files.
- Hooks: move imperative lifecycle effects and derived state into focused
  `use-*` modules when the component shell becomes hard to scan.
- API/client modules: split by resource or operation area, with a small barrel
  file preserving existing import paths.
- Shared logic: extract constants, types, normalizers, adapters, and pure
  utilities into explicit modules rather than leaving them below a component.

After refactors, verify the line budget with:

```bash
python3 - <<'PY'
from pathlib import Path
for p in sorted(Path('src').rglob('*')):
    if p.is_file() and p.suffix in {'.ts', '.tsx'}:
        try:
            n = sum(1 for _ in p.open())
        except UnicodeDecodeError:
            continue
        if n > 500:
            print(f'{n:5d} {p}')
PY
```

Do not break public import compatibility during file-size refactors. If callers
already import from a top-level module path, keep that path as a barrel or thin
composition layer.

## Pull Request Descriptions

When opening or updating a pull request, write a reviewable description that
summarizes the main modification content. Do not use a vague or generic PR
body. The description must reflect the actual commits and the user-requested
scope.

Include concise sections:

- Summary: the primary product or technical changes delivered.
- Key changes: the reviewable implementation points grouped by feature or fix
  area.
- Verification: the exact checks run and their results.
- Notes/Risks: relevant behavior changes, tradeoffs, or follow-up context when
  applicable.
