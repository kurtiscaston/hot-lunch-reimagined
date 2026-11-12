/** School year turns over on July 1 UTC. November 2026 is 2026–2027. */
export function schoolYearLabel(now: Date): string {
  const year = now.getUTCFullYear();
  const start = now.getUTCMonth() >= 6 ? year : year - 1;
  return `${start}–${start + 1}`;
}
