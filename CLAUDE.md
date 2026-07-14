@AGENTS.md

# OrbitOps UI — project context

Citizen-developer release console for the SalikPOC/sf-pipeline Salesforce CI/CD
PoC (spec: REQUIREMENTS.md in that repo, epics E6/E8). Companion decision log
lives in sf-pipeline/CLAUDE.md.

## Architecture

- Next.js App Router + TS + Tailwind; localhost-only for the PoC (no webhooks —
  polling via AutoRefresh + `dynamic = "force-dynamic"` pages).
- GitHub access: server-side only, installation-scoped Octokit via GitHub App
  (`src/lib/github.ts`); creds in `.env.local`. `MOCK=1` serves
  `fixtures/fixtures.ts` and fakes a release-manager session.
- AuthN: Auth.js v5 GitHub OAuth (`src/auth.ts`); roles from username lists in
  env (`src/lib/roles.ts`) — personal account, no teams.
- Data layer: `src/lib/data.ts` — pipeline.yml from repo, deploy history from
  the `orbitops-meta` branch manifests, open promotions from PRs + check runs.

## Conventions

- ALL citizen-facing strings in `src/lib/copy.ts`; never use Git jargon
  (say "Promote", "change", "back out" — not merge/branch/commit/PR).
- Every mutating route must check the role server-side (requireRole pattern),
  never rely on hidden buttons.
- Mock mode must keep working for every new page/state (add fixtures).
- Types for pipeline shapes in `src/lib/types.ts` mirror the workflow outputs.

## Status

Phase 7 (foundation) done: shell, pipeline board, deployments, audit, stubs for
rollback/settings; mock mode verified in browser. Next: Phase 8 (promotion flow
+ live run view), Phase 9 (diffs/workspace), Phase 10 (rollback UI drives the
rollback.yml workflow), Phase 11 (gate settings + audit export).
