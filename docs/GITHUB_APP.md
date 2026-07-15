# GitHub App setup (one-time, ~5 minutes)

The UI talks to GitHub as a **GitHub App installation** (fine-grained, auditable)
and signs users in with the same app's OAuth. Localhost only for the PoC —
no public URL, no webhooks.

## 1. Create the app

github.com → Settings → Developer settings → GitHub Apps → **New GitHub App**

| Field | Value |
|---|---|
| Name | `orbitops-poc-<yourname>` (must be globally unique) |
| Homepage URL | `http://localhost:3000` |
| Callback URL | `http://localhost:3000/api/auth/callback/github` |
| "Request user authorization (OAuth) during installation" | ✅ checked |
| Webhook → Active | ❌ **unchecked** (the UI polls; no tunnel needed) |

**Permissions** (Repository, least privilege per REQUIREMENTS.md E8.2):

| Permission | Access |
|---|---|
| Contents | Read and write |
| Pull requests | Read and write |
| Checks | Read-only |
| Actions | Read and write |
| Deployments | Read-only |
| Environments | Read-only |
| Secrets | Read and write (Connect-an-org seals `DEV_*_SF_AUTH_URL` repo secrets) |
| Metadata | Read-only (mandatory) |

**Where can this app be installed:** Only on this account.

## 2. Collect credentials

On the app's settings page after creation:

- **App ID** → `GITHUB_APP_ID`
- **Client ID** → `AUTH_GITHUB_ID`
- Generate a **client secret** → `AUTH_GITHUB_SECRET`
- Generate a **private key** (downloads a `.pem`) → `GITHUB_APP_PRIVATE_KEY`
  (paste full contents; keep newlines or encode them as `\n`)

## 3. Install it on the pipeline repo

App settings → Install App → your account → **Only select repositories** →
`sf-pipeline`. After installing, the browser URL is
`https://github.com/settings/installations/<number>` → that number is
`GITHUB_APP_INSTALLATION_ID`.

## 4. Configure the UI

```bash
cp .env.example .env.local   # then fill in the values, set MOCK=0
openssl rand -base64 32      # → AUTH_SECRET
npm run dev                  # http://localhost:3000
```

Sign-in uses your GitHub account; roles come from `ROLE_RELEASE_MANAGERS` /
`ROLE_ADMINS` (comma-separated usernames — personal accounts have no teams).

> Keep `.env.local` out of git (already ignored). The private key grants write
> access to the repo — treat it like a password.
