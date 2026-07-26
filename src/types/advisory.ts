export type AdvisorySeverity = "info" | "warning" | "critical";

export interface Advisory {
  id: string;
  title: string;
  description: string;
  severity: AdvisorySeverity;
  placeId?: string;
  placeName?: string;
  startsAt?: string;
  endsAt?: string;
  sourceUrl?: string;
  verified: boolean;
  isActive: boolean;
  isDemo?: boolean;
}
