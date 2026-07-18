export const MOCK = process.env.MOCK === "1";
export const PIPELINE_REPO = process.env.PIPELINE_REPO ?? "SalikPOC/sf-pipeline";
export const [REPO_OWNER, REPO_NAME] = PIPELINE_REPO.split("/");

// Work-item tracker (optional — everything degrades gracefully when unset).
// JIRA_BASE_URL like "https://yourco.atlassian.net"; ADO_ORG_URL like
// "https://dev.azure.com/yourco/YourProject".
export const JIRA_BASE_URL = process.env.JIRA_BASE_URL?.replace(/\/$/, "") ?? "";
export const JIRA_EMAIL = process.env.JIRA_EMAIL ?? "";
export const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN ?? "";
export const ADO_ORG_URL = process.env.ADO_ORG_URL?.replace(/\/$/, "") ?? "";
export const ADO_PAT = process.env.ADO_PAT ?? "";
