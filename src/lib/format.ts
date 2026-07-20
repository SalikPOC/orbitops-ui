/**
 * Deterministic timestamp formatting. `toLocaleString()` with no arguments
 * uses the runtime's locale, which differs between the SSR server and the
 * browser — a guaranteed hydration mismatch in client components. Pinning the
 * locale (and 24h format) makes server and client render identical text.
 */
const fmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function fmtDateTime(iso: string): string {
  return fmt.format(new Date(iso)); // e.g. "15 Jul 2026, 20:42"
}

/**
 * Display name for a stage/environment id. Copado/Gearset users expect
 * "UAT", not "Uat" — known environment acronyms render uppercase, anything
 * else gets plain capitalization ("integration" → "Integration").
 */
const STAGE_ACRONYMS = new Set(["uat", "int", "prod", "qa", "sit", "dev", "poc"]);

export function fmtStage(env: string): string {
  return env
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => (STAGE_ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}
