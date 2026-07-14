export const MOCK = process.env.MOCK === "1";
export const PIPELINE_REPO = process.env.PIPELINE_REPO ?? "SalikPOC/sf-pipeline";
export const [REPO_OWNER, REPO_NAME] = PIPELINE_REPO.split("/");
