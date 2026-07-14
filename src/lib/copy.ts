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

  startChange: {
    button: "Start a change",
    title: "Start a change",
    intro: "Tell us which work item this change belongs to, and we'll set everything up.",
    workItemLabel: "Work item ID",
    workItemHint: "From Jira (PROJ-123) or Azure DevOps (AB#456)",
    descriptionLabel: "What are you changing?",
    descriptionHint: "A short sentence — this becomes the change's title",
    stageLabel: "Where will you build it?",
    submit: "Create my change",
  },

  releasing: {
    inProgress: "Releasing…",
    waitingApproval: "Waiting for release manager approval",
  },

  changes: {
    title: "What's in this change",
    pull: "Pull my changes",
    empty:
      "Nothing here yet. Build in your org, then use “Pull my changes” to bring your work in.",
    showDetails: "Show technical details",
    removeSelected: (n: number) => (n ? `Remove ${n} selected from this change` : "Remove selected"),
    askForHelp: "Ask a developer for help",
  },

  roles: {
    citizen: "Builder",
    "release-manager": "Release manager",
    admin: "Admin",
  } as const,

  signIn: "Sign in with GitHub",
  signOut: "Sign out",
  mockBadge: "Demo data",
};
