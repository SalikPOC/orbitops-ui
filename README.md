# OrbitOps UI

Citizen-developer release console for the [sf-pipeline](https://github.com/SalikPOC/sf-pipeline)
Salesforce CI/CD PoC — a Copado/Gearset-familiar, DevOps-Center-like experience
with no Git jargon anywhere. Pro-code developers don't need this app at all —
they use plain Git/GitHub (see sf-pipeline's docs/RELEASE_CYCLE.md, which covers
both the UI and the Git/GitHub paths); both personas share one pipeline.

> AI assistants / coding agents: start at [AGENTS.md](AGENTS.md); the dated
> decision log is [CLAUDE.md](CLAUDE.md).

## What it does

- **My changes** — work-item-centric kanban (Being built → Checks & fixes →
  Ready to promote → Released) with per-stage release badges (✓ INT ✓ UAT ○ PROD),
  live Jira/ADO ticket status, and one next-action button per card. Builders'
  home page.
- **Pipeline board** — left-to-right flow (Dev sandboxes → stages → Production)
  with arrow connectors and waiting counts, per-stage gate chips, current
  release, incoming changes, live "Releasing…" / "Waiting for approval"
  indicators, and a "Needs attention" triage strip.
- **Journey stepper** — every change/promotion page pins the 5-step path
  (Build in your sandbox → Pull changes → Review & submit → Checks → Promote)
  so nobody guesses what a screen is for.
- **Start a change** — work-item-tagged workspace created from a form (Jira
  `PROJ-123` / Azure DevOps `AB#456` IDs, case-insensitive).
- **Start a change** — work-item-tagged workspace created from a form (Jira
  `PROJ-123` / Azure DevOps `AB#456` IDs, case-insensitive).
- **Pull my changes** — retrieves the builder's org edits into their change via
  the pipeline's `retrieve.yml`, with a live progress banner that polls the run
  and refreshes the list on completion. Org picker covers configured dev orgs +
  self-service connected orgs.
- **Visual flow comparison** — changed/added flows render as Flow-Builder-style
  card diagrams (type-colored icon tiles, connector spine, Start/End cards) with
  green/amber/red diff halos, an element sidebar, zoom/fit controls, and a
  fullscreen Expand mode. Auto-layout flows (which store no canvas coordinates)
  get a computed layered layout.
- **Promote** — friendly check labels with a "What needs attention" panel on
  failure (plain-language cause + what to do, "Try the checks again" re-run,
  open the report, ask a developer for help), deploy preview, keep-semantics
  component review (ticked = mine; remove the unticked), promote button with
  role + status guards, and result banners at the top of the page as well as by
  the button.
- **Back out a release** — per-environment timeline from deploy manifests;
  preview dispatches `rollback.yml` and renders the safety report (restore/remove
  lists, data-loss warnings, validation verdict); execute is release-manager-only
  with a mandatory reason and type-to-confirm, then live-polls the run.
- **Connect an org** — OAuth + PKCE against Salesforce's own login page; the
  refresh token is sealed server-side into a repo Actions secret and the org
  joins the pull picker. The UI never sees passwords.
- **Settings** — stage gates AND pipeline topology (add/remove stages) editable
  by release managers; changes open a reviewed config PR against `pipeline.yml`
  (never a direct push), with branch/GitHub-Environment automation and a
  finish-the-setup checklist.
- **Audit & reporting** — DORA-lite tiles (releases, back-outs, weekly activity,
  back-out rate), stage/type filters, CSV export.

## Run it (mock mode — zero setup)

```bash
npm install
npm run dev        # MOCK=1 → fixture data, auto signed-in as a release manager
```

http://localhost:3000 — every page and interactive state works from fixtures,
including the flow diff and rollback preview flows.

## Run it against the real pipeline

1. Create the GitHub App and install it on `sf-pipeline`: **docs/GITHUB_APP.md**
   (note it needs **Secrets: Read and write** for Connect-an-org).
2. `cp .env.example .env.local`, fill in credentials, set `MOCK=0`.
   `SF_OAUTH_CLIENT_ID` (the OrbitOps CI connected app's consumer key) enables
   Connect-an-org.
3. `npm run dev` and sign in with GitHub.

Localhost-only by design for the PoC: all GitHub traffic is outbound
(REST polling + workflow dispatch), webhooks disabled, no tunnel needed.

## Design rules

- Citizen-facing copy lives in `src/lib/copy.ts` — no Git jargon anywhere
  ("Promote", "change", "back out"; never merge/branch/commit/PR).
- All GitHub access is server-side via an installation-scoped Octokit
  (`src/lib/github.ts`); the browser never sees tokens. Long-running workflow
  runs are polled through server actions for the same reason.
- Every mutating server action checks the role server-side (`requireRole`) —
  hidden buttons are UX, not security.
- Roles map from username lists (`ROLE_RELEASE_MANAGERS`, `ROLE_ADMINS`) —
  swap for team slugs when moving to an org.
- Mock mode must keep working for every new page and state (`fixtures/`).

## Key modules

```
src/lib/data.ts          GitHub reads: pipeline.yml, manifests (orbitops-meta),
                         PRs + checks, flow file versions, run status
src/lib/actions.ts       server actions: promote, pull, discard, start change,
                         submit, rollback preview/execute, gate PRs, run polling
src/lib/flow-diff.ts     Flow XML parse + element-wise diff + auto-layout
src/components/FlowDiffViewer.tsx   the Flow-Builder-style diff canvas
src/lib/salesforce-oauth.ts / github-admin.ts   Connect-an-org (PKCE, sealed secrets)
src/lib/copy.ts          every citizen-facing string
```

## Roadmap (post-PoC)

Concepts Copado/Gearset users will expect that are intentionally out of PoC scope:

- **Back-promotion** — syncing a hotfix released to Production back down to
  UAT/Integration so lower stages don't drift behind.
- **Environment drift / refresh indicators** — surfacing "this sandbox is out
  of sync with its stage branch" on the pipeline board.
- **Live tracker write-back** — the deploy pipeline already stubs
  `postDeploymentStatus`; wiring Jira/ADO credentials turns deploy events into
  ticket comments/links. (Read-side status + deep links are already in the UI
  via `JIRA_BASE_URL`/`JIRA_EMAIL`/`JIRA_API_TOKEN` and `ADO_ORG_URL`/`ADO_PAT`.)
