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
    current: "Current",
    backOutTo: "Back out to here",
    previewing: "Checking what this would change…",
    previewTitle: (from: number, to: number) => `Backing out release #${from} → returning to #${to}`,
    restoreList: (n: number) => `${n} component${n === 1 ? "" : "s"} will be restored to their earlier versions`,
    deleteList: (n: number) =>
      `${n} component${n === 1 ? "" : "s"} were added since — tick the box below to also remove them`,
    includeDestructive: "Also remove components added since that release (read the warnings first)",
    warnings: "Safety warnings",
    validationOk: "Salesforce checked this plan against the org — it will apply cleanly.",
    validationFailed: "Salesforce found problems with this plan — it cannot be applied as-is:",
    workItemsOut: "Work backed out",
    executeTitle: "Confirm the back out",
    reasonLabel: "Why are you backing this out?",
    reasonHint: "Recorded in the activity log",
    confirmLabel: (env: string) => `Type ${env} to confirm`,
    executeButton: "Back out this release",
    executing: "Backing out…",
    waitingGate: "Waiting for release manager approval…",
    done: (env: string) => `Done — ${env} has been backed out. The timeline below is updated.`,
    failed: "The back out failed — open the run for details.",
    managerOnly: "Only release managers can execute a back out.",
    openRun: "Open the run",
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
    for: "for",
  },

  attention: {
    title: "Needs attention",
    allQuiet: "All quiet — nothing is waiting on anyone.",
  },

  approvals: {
    waiting: (age: string) => `release waiting for approval (${age})`,
    whatWillDeploy: (n: number) => `What will deploy (${n} component${n === 1 ? "" : "s"})`,
    approve: "Approve & release",
    reject: "Reject",
    commentHint: "Optional note (audit log)",
    managerOnly: "A release manager can approve this from here.",
    appNotReviewer:
      "To approve from here, the app needs its Deployments permission set to 'Read and write' (one-time GitHub setting).",
  },

  changes: {
    title: "What's in this change",
    pull: "Pull my changes",
    empty:
      "Nothing here yet. Build in your org, then use “Pull my changes” to bring your work in.",
    showDetails: "Show technical details",
    visualComparison: "Visual comparison",
    pulling: "Pulling your changes from the org — usually a minute or two…",
    pullDone: "Done — your changes are in the list below.",
    pullNothing: "Finished, but nothing new was found in the org.",
    pullFailed: "The pull didn't finish — open the run to see why.",
    openRun: "Open the run",
    removeSelected: (n: number) => (n ? `Remove ${n} selected from this change` : "Remove selected"),
    askForHelp: "Ask a developer for help",
    inProgress: "Being built",
    beingBuilt: "Changes being built",
    fromOrg: "Pull from which org",
    updates: (n: number) => (n === 0 ? "Nothing pulled in yet" : `${n} update${n === 1 ? "" : "s"} pulled in`),
  },

  connectOrg: {
    title: "Connect an org",
    button: "Connect an org",
    intro:
      "Link a sandbox, scratch org, or dev org so you can pull your changes from it. You'll sign in on Salesforce's own login page — we never see your password.",
    nameLabel: "What should we call it?",
    nameHint: "Shown in the “Pull my changes” org picker",
    typeLabel: "What kind of org is it?",
    typeSandbox: "Sandbox or scratch org",
    typeProduction: "Production or Developer Edition",
    domainLabel: "My Domain (usually not needed)",
    domainHint:
      "Leave blank to sign in at the standard Salesforce login. Only fill this in if the connection fails — some orgs (like scratch orgs) require logging in at their own domain, e.g. mycompany--dev.sandbox.my.salesforce.com",
    submit: "Continue to Salesforce login",
    security:
      "Salesforce gives OrbitOps a revocable access token, stored encrypted — you can disconnect any time from your org's Connected Apps settings.",
    connected: "Org connected! It's now available in the “Pull my changes” picker.",
    listTitle: "Connected orgs",
    none: "No orgs connected yet.",
  },

  submit: {
    title: "Ready to go?",
    ready: "Submit this change to start the checks and get it ready to promote.",
    needChanges: "Pull your changes in first — there's nothing to submit yet.",
    button: "Submit for promotion",
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
