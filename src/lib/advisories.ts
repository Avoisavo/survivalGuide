import type { Advisory, AdvisorySeverity } from "@/types/advisory";

const SEVERITY_ORDER: Record<AdvisorySeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

export function isAdvisoryCurrentlyActive(
  advisory: Advisory,
  now: Date = new Date(),
): boolean {
  if (!advisory.isActive) return false;
  if (advisory.startsAt && new Date(advisory.startsAt) > now) return false;
  if (advisory.endsAt && new Date(advisory.endsAt) < now) return false;
  return true;
}

/** Active advisories, most severe first. */
export function filterActiveAdvisories(
  advisories: Advisory[],
  now: Date = new Date(),
): Advisory[] {
  return advisories
    .filter((a) => isAdvisoryCurrentlyActive(a, now))
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
