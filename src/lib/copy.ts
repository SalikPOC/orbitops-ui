/**
 * Every citizen-facing string lives here so wording is reviewable in one place.
 * House rule: no Git jargon — say "Promote", "change", "back out"; never
 * "merge", "branch", "commit", "pull request", "push", "rebase".
 */
export const copy = {
  appName: "OrbitOps",
  tagline: "Release Salesforce changes with confidence",

  nav: {
    myChanges: "My changes",
    pipeline: "Pipeline",
    deployments: "Release history",
    rollback: "Back out a release",
    settings: "Settings",
    audit: "Audit & reporting",
  },

  myChanges: {
    title: "My changes",
    intro: "Every work item, where it is, and what happens next.",
    none: "No changes yet — start one and it will show up here.",
    columns: {
      building: "Being built",
      inFlight: "Checks & fixes",
      ready: "Ready to promote",
      released: "Released",
    },
    state: {
      building: "Being built",
      checks: "Checks running",
      attention: "Needs attention",
      conflict: "Needs a developer",
      ready: "Ready to promote",
      released: "Released",
    } as Record<string, string>,
    action: {
      building: "Open workspace",
      checks: "Watch checks",
      attention: "See what failed",
      conflict: "Open the change",
      ready: (env: string) => `Promote to ${env}`,
      released: "View release history",
    },
    envLegend: "Where it has been released",
  },

  /** The builder journey, always visible on a change so nobody guesses the next step. */
  journey: {
    steps: ["Build in your sandbox", "Pull changes", "Review & submit", "Checks", "Promote"],
    done: "Promoted",
  },

  /**
   * CI check names → citizen-friendly label + one-line explanation, plus
   * what a failure means and what to do about it (shown in the
   * "What needs attention" panel). Unmapped names fall through unchanged.
   */
  checkLabels: {
    "Resolve stage": {
      label: "Finding the target stage",
      hint: "Works out which environment this change promotes to",
      failed: "OrbitOps couldn't work out which stage this change should go to.",
      fix: "This is a setup problem, not something you did. Ask a developer for help.",
    },
    "What will deploy": {
      label: "What will deploy",
      hint: "Lists the exact components that will go out",
      failed: "OrbitOps couldn't build the list of what this change would release.",
      fix: "Try “Pull my changes” again. If it still fails, ask a developer for help.",
    },
    "Work items": {
      label: "Work item tag",
      hint: "Confirms this change is linked to your ticket",
      failed: "This change isn't linked to a valid work item, so it can't be traced back to a ticket.",
      fix: "Check that the work item ID in the change matches your ticket — like PROJ-123 (Jira) or AB#456 (Azure DevOps). If it looks right, ask a developer for help.",
    },
    "Code scan": {
      label: "Code scan",
      hint: "Security and quality rules on anything code-like",
      failed: "The automatic review found code-quality or security issues above what this stage allows.",
      fix: "Fixing scan findings usually needs a developer. Open the full report to see each issue, or ask a developer for help.",
    },
    "Validate against target org": {
      label: "Salesforce validation",
      hint: "Salesforce test-applied this change against the target org",
      failed: "Salesforce did a practice run of this change against the target org and it didn't apply cleanly. A common cause: something your change depends on (a field, object, or flow) isn't included.",
      fix: "If your change relies on something else you built, use “Pull my changes” again so it's included. Otherwise open the full report for Salesforce's exact messages, or ask a developer for help.",
    },
    "Coverage gate": {
      label: "Test coverage",
      hint: "Apex test coverage meets this stage's minimum",
      failed: "There isn't enough automated test coverage for the code in this change to meet this stage's minimum.",
      fix: "Writing tests is developer territory — ask a developer to add coverage for this change.",
    },
  } as Record<string, { label: string; hint: string; failed?: string; fix?: string }>,

  /** The plain-language failure panel under the check chips. */
  checkHelp: {
    title: "What needs attention",
    intro: (n: number) =>
      n === 1 ? "1 check didn't pass. Here's what it means and what to do:" : `${n} checks didn't pass. Here's what they mean and what to do:`,
    running: "Some checks are still running — nothing for you to do; this page updates itself.",
    whatToDo: "What to do",
    openReport: "Open the full report",
    askDev: "Ask a developer for help",
    fallbackFailed: "This check didn't pass.",
    fallbackFix: "Open the full report for details, or ask a developer for help.",
    devAsked: "A developer has been asked to help with this change.",
    retry: "Try the checks again",
    retrying: "Re-running…",
    retryHint:
      "If nothing was obviously wrong, the failure may have been temporary (a slow org or a timeout). Try the checks again before asking a developer.",
  },

  pipeline: {
    title: "Release pipeline",
    currentRelease: "Current release",
    noDeploysYet: "Nothing has been released to this stage yet.",
    openPromotions: "Incoming changes",
    incomingFrom: (from: string) => `from ${from}`,
    devColumn: "Dev sandboxes",
    devColumnHint: "Where builders work",
    waitingCount: (n: number) => (n === 0 ? "clear" : `${n} waiting`),
    gateScan: (sev: number) => `Code scan: serious issues block (severity ≤ ${sev})`,
    gateCoverage: (pct: number) => `Apex test coverage must be at least ${pct}%`,
    gateApproval: "A release manager must approve releases to this stage",
    noOpenPromotions: "No changes are waiting.",
    promote: (stage: string) => `Promote to ${stage}`,
    checksPassing: "All checks passing",
    promoted: (stage: string) =>
      `This change has been promoted — it's on its way to ${stage}. Watch progress on the pipeline board.`,
    checksFailing: "Some checks need attention",
    checksRunning: "Checks are running…",
    conflict: "This change overlaps with another change — a developer needs to take a look.",
  },

  deployments: {
    title: "Release history",
    released: "Released",
    backedOut: "Backed out",
    components: (n: number) => `${n} component${n === 1 ? "" : "s"}`,
    removed: (n: number) => `${n} removed`,
    by: "by",
    viewDetails: "Technical details",
    backOutLink: "Back out a release",
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
    failed: "The back out failed — open the progress log for details.",
    managerOnly: "Only release managers can execute a back out.",
    openRun: "View progress",
    workItemsFooter: "Work items in this stage's releases:",
  },

  settings: { title: "Pipeline settings" },

  topology: {
    title: "Pipeline stages",
    intro:
      "The path every change travels, left to right. Changes here open a review (a config change request) — nothing moves until it's approved.",
    addButton: "Add a stage",
    addTitle: "Add a stage",
    nameLabel: "Stage name",
    nameHint: "Lowercase, e.g. sit — shown on the board as SIT",
    branchLabel: "Branch name",
    branchHint: "Usually the same as the stage name",
    orgLabel: "Org key",
    orgHint: "Uppercase key for this stage's Salesforce org, e.g. SIT — its auth secrets use this prefix",
    positionLabel: "Where in the path?",
    positionFirst: "First stage (changes land here from dev sandboxes)",
    positionAfter: (env: string) => `After ${env}`,
    authLabel: "How CI signs in to the org",
    authSfdxUrl: "Stored login URL (sandboxes / scratch orgs)",
    authJwt: "Certificate (production / long-lived orgs)",
    testLabel: "Apex tests during deploys",
    testConditional: "Only when the change contains code",
    testLocal: "Always run local tests",
    testNone: "Never (not recommended past the first stage)",
    approvalLabel: "Require release-manager approval before releases",
    submit: "Request this stage",
    removeButton: "Remove",
    removeConfirm: (env: string) =>
      `Remove ${env} from the pipeline? The org, its history, and its releases are kept — only the stage mapping is removed. This opens a change request for review.`,
    confirmRemove: "Yes, request removal",
    cancel: "Cancel",
    manualStepsTitle: "To finish setting up (also listed on the change request):",
    viewRequest: "View change request",
  },
  audit: { title: "Audit & reporting" },

  startChange: {
    button: "Start a change",
    title: "Start a change",
    intro: "Tell us which work item this change belongs to, and we'll set everything up.",
    workItemLabel: "Work item ID",
    workItemHint: "From Jira (PROJ-123) or Azure DevOps (AB#456)",
    descriptionLabel: "What are you changing?",
    descriptionHint: "A short sentence — this becomes the change's title",
    stageLabel: "Which stage does it release to first?",
    stageHint: "Almost always the first stage — leave as is unless your release manager says otherwise.",
    advanced: "Advanced",
    submit: "Create my change",
    afterSubmit: "Next: build in your sandbox, then pull your changes in.",
  },

  releasing: {
    inProgress: "Releasing…",
    waitingApproval: "Waiting for release manager approval",
    for: "for",
  },

  promoteStatus: {
    promoting: "Promoting… this can take a moment.",
    dismiss: "Dismiss",
  },

  attention: {
    title: "Needs attention",
    allQuiet: "All quiet — nothing is waiting on anyone.",
  },

  approvals: {
    waiting: (age: string) => `release waiting for approval (${age})`,
    /** Strip Git plumbing from a run's display title ("Merge pull request #6 — X" → "Release to ENV — X"). */
    releaseTitle: (env: string, rawTitle: string) => {
      // "Merge pull request #6 from owner/branch" carries no human title — drop it entirely.
      if (/^Merge pull request #\d+ from \S+$/i.test(rawTitle)) return `Release to ${env}`;
      const cleaned = rawTitle.replace(/^Merge pull request #\d+\s*(?:—|-|:)?\s*/i, "").trim();
      return `Release to ${env} — ${cleaned || rawTitle}`;
    },
    whatWillDeploy: (n: number) => `What will deploy (${n} component${n === 1 ? "" : "s"})`,
    approve: "Approve & release",
    reject: "Reject",
    commentHint: "Optional note (audit log)",
    viewProgress: "View progress",
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
    pullReview:
      "Now tick only what belongs to this work item — shared orgs often contain other people's edits too.",
    pullNothing: "Finished, but nothing new was found in the org.",
    pullFailed: "The pull didn't finish — open the progress log to see why.",
    openRun: "View progress",
    keepHint: "Ticked = part of this change. Untick anything that isn't yours.",
    removeUnticked: (n: number) =>
      n === 0
        ? "Remove unticked items"
        : n === 1
          ? "Remove the 1 unticked item from this change"
          : `Remove the ${n} unticked items from this change`,
    allKept: "Everything is ticked — untick anything that isn't part of this change.",
    askForHelp: "Ask a developer for help",
    inProgress: "Being built",
    beingBuilt: "Changes being built",
    alreadyReleased: (wi: string, envs: string) =>
      `${wi} has already been released to ${envs}. Only pull changes here if you're building a follow-up fix — pulling the same work again has nothing new to promote.`,
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
      "OrbitOps stores no passwords or tokens for your org — signing in only verifies your access and records your username. Releases and pulls use a certificate your admin pre-authorized, revocable any time from the org's Connected Apps settings.",
    preAuthHint:
      "One-time setup per org (admin): Setup → Connected Apps OAuth Usage → OrbitOps CI → Install, then Manage → Permitted Users: “Admin approved users are pre-authorized” and add your profile.",
    connected: "Org connected! It's now available in the “Pull my changes” picker.",
    listTitle: "Connected orgs",
    none: "No orgs connected yet.",
    reconnect: "Reconnect",
    disconnect: "Disconnect",
    disconnectConfirm: (name: string) =>
      `Disconnect “${name}”? Builders won't be able to pull changes from it until someone connects it again.`,
    methodJwt: "certificate",
    methodLegacy: "legacy token — reconnect to upgrade",
  },

  submit: {
    title: "Ready to go?",
    ready: "Submit this change to start the checks and get it ready to promote.",
    needChanges: "Pull your changes in first — there's nothing to submit yet.",
    nothingDeployable:
      "This change contains nothing new to release — everything in it is already in the target stage. There's nothing to promote.",
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
