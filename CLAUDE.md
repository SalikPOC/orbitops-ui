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

All phases (7–12) complete plus post-plan additions. Feature set: pipeline board
with live release indicators · start-a-change (work-item form, IDs normalized to
uppercase) · pull-my-changes with run-polling progress banner · plain-language
file list with per-component discard · **visual flow diff** (Flow-Builder card
style, diff halos, zoom/fit/fullscreen — `src/lib/flow-diff.ts` +
`FlowDiffViewer`) · promote with role/status guards · rollback UI (preview
report from orbitops-meta/rollback-previews, type-to-confirm execute) ·
Connect-an-org (OAuth+PKCE, sealed repo secrets — needs GitHub App
Secrets:write) · gate editor via config PRs · audit filters/CSV/DORA-lite tiles.

## Hard-won gotchas

- React 19 resets uncontrolled forms after every form action — controlled
  inputs wherever a failed validation must preserve what the user typed
  (StartChangeForm).
- Tailwind utility classes on SVG shapes are unreliable across build modes
  (unstyled `<rect>` renders black) — FlowDiffViewer uses explicit fill/stroke
  attributes only.
- Auto-layout flows store `locationX/Y = 0` for every element — flow-diff.ts
  detects this and computes a layered BFS layout (+ synthetic End card).
- Workflow dispatch returns no run id — actions poll `findRecentRun` (created
  ≥ dispatch time) to find the run, then clients poll `getRunState` via server
  actions (tokens stay server-side).
- `js-yaml` in this Next version: use named import (`import { load } ...`).
- GitHub Apps cannot be required reviewers on personal-account repos — in-app
  deployment approvals use the signed-in user's user-to-server token
  (persisted in the Auth.js JWT), acting as the human reviewer.
