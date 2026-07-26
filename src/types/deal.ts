export interface Deal {
  id: string;
  placeId: string;
  placeName?: string;
  placeSlug?: string;
  title: string;
  description?: string;
  code?: string;
  validFrom?: string;
  validUntil?: string;
  redemptionInstructions?: string;
  terms?: string;
  sourceUrl?: string;
  verified: boolean;
  lastCheckedAt?: string;
  isActive: boolean;
  isDemo?: boolean;
}
