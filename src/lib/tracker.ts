import "server-only";
import { MOCK, JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, ADO_ORG_URL, ADO_PAT } from "./env";

/**
 * Read-only work-item tracker adapter (E2.4, UI side). Deep links need only a
 * base URL; live status needs credentials. Everything degrades gracefully:
 * no config → no link/status, tracker errors → no status, never a crash.
 */
export interface TrackerInfo {
  url?: string;
  /** Tracker status name, e.g. "In Progress" (Jira) or "Active" (ADO). */
  status?: string;
}

const isAdo = (id: string) => /^AB#\d+$/.test(id);

/** Deep link to the ticket, from base URLs alone (no credentials needed). */
export function workItemUrl(id: string): string | undefined {
  if (isAdo(id)) {
    return ADO_ORG_URL ? `${ADO_ORG_URL}/_workitems/edit/${id.slice(3)}` : undefined;
  }
  return JIRA_BASE_URL ? `${JIRA_BASE_URL}/browse/${id}` : undefined;
}

const MOCK_STATUS: Record<string, string> = {
  "POC-7": "In Progress",
  "POC-9": "To Do",
  "POC-1": "Done",
  "AB#88": "Active",
};

async function jiraStatus(id: string): Promise<string | undefined> {
  if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) return undefined;
  const res = await fetch(`${JIRA_BASE_URL}/rest/api/3/issue/${id}?fields=status`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString("base64")}`,
      Accept: "application/json",
    },
    next: { revalidate: 60 },
  });
  if (!res.ok) return undefined;
  const body = (await res.json()) as { fields?: { status?: { name?: string } } };
  return body.fields?.status?.name;
}

async function adoStatus(id: string): Promise<string | undefined> {
  if (!ADO_ORG_URL || !ADO_PAT) return undefined;
  const res = await fetch(
    `${ADO_ORG_URL}/_apis/wit/workitems/${id.slice(3)}?fields=System.State&api-version=7.0`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`:${ADO_PAT}`).toString("base64")}`,
        Accept: "application/json",
      },
      next: { revalidate: 60 },
    }
  );
  if (!res.ok) return undefined;
  const body = (await res.json()) as { fields?: { "System.State"?: string } };
  return body.fields?.["System.State"];
}

/** Tracker link + live status per work item. Best-effort; failures yield {}. */
export async function getTrackerInfo(ids: string[]): Promise<Record<string, TrackerInfo>> {
  const unique = [...new Set(ids)];
  const entries = await Promise.all(
    unique.map(async (id): Promise<[string, TrackerInfo]> => {
      if (MOCK) return [id, { url: `https://example.atlassian.net/browse/${id}`, status: MOCK_STATUS[id] }];
      let status: string | undefined;
      try {
        status = isAdo(id) ? await adoStatus(id) : await jiraStatus(id);
      } catch {
        status = undefined; // tracker down or misconfigured — links still work
      }
      return [id, { url: workItemUrl(id), status }];
    })
  );
  return Object.fromEntries(entries);
}
