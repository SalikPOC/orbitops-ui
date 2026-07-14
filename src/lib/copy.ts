/**
 * Every citizen-facing string lives here so wording is reviewable in one place.
 * House rule: no Git jargon — say "Promote", "change", "back out"; never
 * "merge", "branch", "commit", "pull request", "push", "rebase".
 */
export const copy = {
  appName: "OrbitOps",
  tagline: "Release Salesforce changes with confidence",

  nav: {
    pipeline: "Pipeline",
    deployments: "Deployments",
    rollback: "Back out a release",
    settings: "Settings",
    audit: "Activity log",
  },

  pipeline: {
    title: "Release pipeline",
    currentRelease: "Current release",
    noDeploysYet: "Nothing has been released to this stage yet.",
    openPromotions: "Changes waiting to be promoted",
    noOpenPromotions: "No changes are waiting.",
    promote: (stage: string) => `Promote to ${stage}`,
    checksPassing: "All checks passing",
    checksFailing: "Some checks need attention",
    checksRunning: "Checks are running…",
    conflict: "This change overlaps with another change — a developer needs to take a look.",
  },

  deployments: {
    title: "Deployment history",
    released: "Released",
    backedOut: "Backed out",
    components: (n: number) => `${n} component${n === 1 ? "" : "s"}`,
    by: "by",
    viewDetails: "View details",
  },

  rollback: {
    title: "Back out a release",
    intro:
      "Pick the release you want to return to. You'll see exactly what will change, and nothing happens until you confirm.",
    metadataOnly:
      "Backing out restores configuration only — data that was already changed is not restored.",
    comingSoon: "Backing out from here is coming in a later step of this proof of concept.",
  },

  settings: { title: "Stage gate settings" },
  audit: { title: "Activity log" },

  roles: {
    citizen: "Builder",
    "release-manager": "Release manager",
    admin: "Admin",
  } as const,

  signIn: "Sign in with GitHub",
  signOut: "Sign out",
  mockBadge: "Demo data",
};
