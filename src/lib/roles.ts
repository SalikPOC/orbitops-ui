import type { Role } from "./types";

const list = (v?: string) =>
  (v ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

/** PoC role mapping: username lists from env (personal accounts have no teams). */
export function roleFor(login: string): Role {
  const l = login.toLowerCase();
  if (list(process.env.ROLE_ADMINS).includes(l)) return "admin";
  if (list(process.env.ROLE_RELEASE_MANAGERS).includes(l)) return "release-manager";
  return "citizen";
}
