<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# OrbitOps UI — AI assistant brief

Condensed, always-current map of this repo for AI coding tools (Copilot,
Cursor, Claude, GPT, …). The dated decision log is [CLAUDE.md](CLAUDE.md) —
append, never rewrite. Human docs: [README.md](README.md),
[docs/GITHUB_APP.md](docs/GITHUB_APP.md).

## What this repo is

The web console for the OrbitOps Salesforce CI/CD platform (pipeline repo:
`SalikPOC/sf-pipeline`). It serves **citizen developers** — Salesforce admins
with no Git knowledge. Pro-code developers use plain GitHub instead
(sf-pipeline's docs/DEVELOPER_GUIDE.md); every UI action is a wrapper over
Git/GitHub operations, so both paths interoperate on one pipeline.

## Architecture

- Next.js App Router + TypeScript + Tailwind. Localhost-only for the PoC —
  no webhooks; pages poll via `AutoRefresh` + `dynamic = "force-dynamic"`.
- **All GitHub access is server-side** via an installation-scoped GitHub App
  Octokit (`src/lib/github.ts`); tokens never reach the browser. Long-running
  workflow runs are polled through server actions.
- Auth: Auth.js v5 GitHub OAuth (`src/auth.ts`); roles from username lists in
  env (`src/lib/roles.ts`): citizen ("Builder") < release-manager < admin.
  Deployment approvals use the signed-in user's own token (GitHub Apps can't
  be required reviewers on personal-account repos).
- **Mock mode**: `MOCK=1` serves `fixtures/fixtures.ts` and fakes a
  release-manager session. Every new page/state MUST keep working in mock mode
  (add fixtures). Mock actions return canned successes.
- Data comes from the pipeline repo: `.orbitops/pipeline.yml` (from main),
  deploy manifests on the `orbitops-meta` branch, open PRs + check runs.

## Key modules

```
src/lib/copy.ts            EVERY citizen-facing string (house rule below)
src/lib/data.ts            GitHub reads: pipeline config, manifests, PRs, checks, runs
src/lib/actions.ts         server actions: promote, pull, discard, submit, rollback,
                           gates + topology config PRs, re-run checks, dev-help
src/lib/workitems.ts       work-item aggregation → the My changes kanban
src/lib/tracker.ts         Jira/ADO deep links + live status (env-gated, graceful fallback)
src/lib/pipeline-config.ts pipeline.yml parse/serialize for topology PRs
src/lib/attention.ts       "Needs attention" strip logic
src/lib/format.ts          fmtDateTime (locale-pinned) · fmtStage ("UAT" not "Uat")
src/lib/flow-diff.ts       Flow XML diff + auto-layout → FlowDiffViewer
src/components/            JourneySteps (5-step stepper) · CheckHelp (failure
                           explainers + retry) · PromotionStatus (top banner
                           context) · ChangesPanel (keep-semantics pull review) ·
                           TopologyEditor · ApprovalCard · RollbackPanel · …
fixtures/                  mock-mode data — mirrors real workflow output shapes
```

## Product conventions (these ARE the product — do not regress them)

- **No Git jargon anywhere citizen-facing.** Say "Promote", "change",
  "back out" — never merge/branch/commit/PR/push. All strings live in
  `src/lib/copy.ts` so wording is reviewable in one place.
- **No ambiguity**: every failing check gets a plain-language explanation +
  "what to do" (`copy.checkLabels`, CheckHelp); the 5-step journey stepper
  (Build → Pull → Review & submit → Checks → Promote) appears on every
  change/promotion page; action feedback must be visible without scrolling
  (PromotionStatus top banner mirrors the promote result).
- **Pull review is keep-semantics**: ticked = part of my change; one button
  removes the unticked. Never revert to "select to remove".
- **Every mutating server action checks the role server-side** (`requireRole`)
  — hidden buttons are UX, not security.
- **Config changes open PRs, never direct pushes** (gate + topology editors;
  keep `pipeline-config.ts` serialization canonical so CI validation passes).
- Check runs from reusable workflows arrive named `checks / <job>`;
  `toCheckChips` strips the prefix — `copy.checkLabels` keys use bare job names.

## Verification

- `npx tsc --noEmit` and `npm run lint` must pass.
- Run mock mode (`MOCK=1 npm run dev`) and walk the affected screens; every
  interactive state must work from fixtures.
- Real mode needs the GitHub App env (`.env.example`) + OAuth sign-in.

## Known gotchas (details in CLAUDE.md)

- React 19 resets uncontrolled forms after every action — use controlled
  inputs wherever failed validation must preserve typed values.
- Tailwind classes on SVG shapes are unreliable — FlowDiffViewer uses explicit
  fill/stroke attributes only.
- `turbopack.root` is pinned in next.config.ts (a stray ~/package-lock.json
  otherwise 404s every route). If routes 404 or the React Client Manifest
  errors: stop the dev server, `rm -rf .next`, restart.
- Workflow dispatch returns no run id — actions poll `findRecentRun`.
- "Re-run failed jobs" (and the UI's "Try the checks again") re-executes the
  same workflow snapshot — picking up workflow-definition changes needs a
  fresh PR event (close/reopen or a new push).
- `js-yaml` here: use named imports (`import { load } from "js-yaml"`).
