# OrbitOps UI

Citizen-developer release console for the [sf-pipeline](https://github.com/SalikPOC/sf-pipeline)
Salesforce CI/CD PoC — a DevOps-Center-like experience with pipeline visibility,
promotions, deployment history, and UI-driven rollback.

## Run it (mock mode — zero setup)

```bash
npm install
npm run dev        # .env.local ships with MOCK=1 → fixture data, auto signed-in
```

http://localhost:3000 — Pipeline board, Deployment history, Activity log all
work from realistic fixture data.

## Run it against the real pipeline

1. Create the GitHub App and install it on `sf-pipeline`: **docs/GITHUB_APP.md**
2. `cp .env.example .env.local`, fill in credentials, set `MOCK=0`
3. `npm run dev` and sign in with GitHub

Localhost-only by design for the PoC: all GitHub traffic is outbound
(REST polling + workflow dispatch), webhooks disabled, no tunnel needed.

## Design rules

- Citizen-facing copy lives in `src/lib/copy.ts` — no Git jargon anywhere.
- All GitHub access is server-side via an installation-scoped Octokit
  (`src/lib/github.ts`); the browser never sees tokens.
- Roles map from username lists (`ROLE_RELEASE_MANAGERS`, `ROLE_ADMINS`) —
  swap for team slugs when moving to an org.
