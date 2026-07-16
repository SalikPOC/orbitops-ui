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
