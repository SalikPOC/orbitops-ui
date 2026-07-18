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

Copado/Gearset-familiarity pass (Jul 2026): work-item-centric **My changes**
kanban (`src/lib/workitems.ts` aggregation + `/my-changes`, builder home via
role-based `/` redirect) · pipeline board redrawn as left-to-right flow (Dev
sandboxes node → stage columns with arrow connectors + waiting counts) ·
5-step **JourneySteps** stepper on change/promotion pages · pull flow now
keep-semantics (ticked = mine; "remove unticked") · read-only tracker adapter
(`src/lib/tracker.ts`: Jira/ADO deep links + live status via env creds,
graceful fallback, mock fixtures) · friendly CI check labels (`copy.checkLabels`)
· `fmtStage` for env display names (UAT not Uat) · nav: Release history /
Audit & reporting; per-stage back-out links in history · **CheckHelp** panel on
promotions: per-failing-check plain-language cards (what it means + what to do,
from `copy.checkLabels.failed/fix`) with "Open the full report" and a
generalized ask-a-developer action (`requestDeveloperHelp(prNumber, reason)`).

Topology editor (Jul 2026): Settings → "Pipeline stages" adds/removes stages
from the UI via config PRs — `src/lib/pipeline-config.ts` (parse/serialize
pipeline.yml, canonical key order, validated by sf-pipeline's CI validator) +
`addStage`/`removeStage` in actions.ts (best-effort branch + GitHub Environment
automation, manual steps returned as checklist) + `TopologyEditor.tsx`.
Companion workflow de-hardcoding in sf-pipeline (see its CLAUDE.md 2026-07-17).
`promote()` first-stage check now derives from pipeline.yml. Gotcha:
`turbopack.root` pinned in next.config.ts — a stray ~/package-lock.json made
Turbopack infer the wrong workspace root and 404 every route.

Promotion-page feedback (Jul 2026): promote result now shows at the TOP too via
a shared context (`PromotionStatus.tsx`: provider + `PromotionTopBanner`;
PromoteButton writes, banner reads) — pending/success/failure, dismissible.
Failed checks are re-runnable from the UI: `rerunPromotionChecks(prNumber)` in
actions.ts (finds the head-SHA workflow runs, `reRunWorkflowFailedJobs`, falls
back to full `reRunWorkflow`; needs App `actions:write`, which it has for
dispatch) surfaced as "Try the checks again" atop the CheckHelp panel.

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
