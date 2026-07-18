# Copilot instructions — OrbitOps UI

Read [AGENTS.md](../AGENTS.md) first — it is the canonical AI brief for this
repo (architecture, key modules, product conventions, gotchas). The dated
decision log lives in [CLAUDE.md](../CLAUDE.md); append to it, never rewrite.

Non-negotiables in short form:

- This repo's Next.js version differs from your training data — read
  `node_modules/next/dist/docs/` before writing framework code.
- No Git jargon in citizen-facing text; every user-visible string lives in
  `src/lib/copy.ts`.
- All GitHub access is server-side (GitHub App Octokit); every mutating server
  action re-checks the role server-side (`requireRole`).
- Mock mode (`MOCK=1`, `fixtures/`) must keep working for every new page and
  state; verify with `npx tsc --noEmit`, `npm run lint`, and a mock-mode
  walkthrough.
- Config changes to the pipeline (gates, topology) open reviewed PRs against
  the sf-pipeline repo — never direct pushes.
