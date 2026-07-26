import { z } from "zod";
import { placeCategorySchema } from "./places";

export const adminPlaceSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers and hyphens"),
  googlePlaceId: z.string().trim().max(300).optional().or(z.literal("")),
  name: z.string().trim().min(2).max(160),
  category: placeCategorySchema,
  subcategory: z.string().trim().max(60).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  priceLevel: z.coerce.number().int().min(0).max(4).optional(),
  verified: z.boolean().default(false),
  isActive: z.boolean().default(true),
  isOpenLate: z.boolean().default(false),
  isRaceDayRecommended: z.boolean().default(false),
  halalStatus: z.enum(["halal-certified", "muslim-friendly", "not-specified"]).optional(),
  vegetarianFriendly: z.boolean().optional(),
  wheelchairAccessible: z.boolean().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
});

export type AdminPlaceInput = z.infer<typeof adminPlaceSchema>;

export const adminDealSchema = z.object({
  id: z.string().uuid().optional(),
  placeId: z.string().uuid(),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  code: z.string().trim().max(60).optional().or(z.literal("")),
  validFrom: z.string().datetime({ offset: true }).optional(),
  validUntil: z.string().datetime({ offset: true }).optional(),
  redemptionInstructions: z.string().trim().max(1000).optional().or(z.literal("")),
  terms: z.string().trim().max(2000).optional().or(z.literal("")),
  sourceUrl: z.string().url().max(500).optional().or(z.literal("")),
  verified: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type AdminDealInput = z.infer<typeof adminDealSchema>;

export const adminAdvisorySchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().min(2).max(2000),
  severity: z.enum(["info", "warning", "critical"]),
  placeId: z.string().uuid().optional(),
  startsAt: z.string().datetime({ offset: true }).optional(),
  endsAt: z.string().datetime({ offset: true }).optional(),
  sourceUrl: z.string().url().max(500).optional().or(z.literal("")),
  verified: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type AdminAdvisoryInput = z.infer<typeof adminAdvisorySchema>;

const templateStepSchema = z.object({
  mode: z.enum(["walk", "drive", "transit", "train", "bus", "shuttle", "ride-hailing"]),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(500).default(""),
  originName: z.string().trim().min(1).max(160),
  destinationName: z.string().trim().min(1).max(160),
  durationMinutes: z.coerce.number().int().min(1).max(600),
  distanceMeters: z.coerce.number().int().min(1).optional(),
  estimatedCostMin: z.coerce.number().min(0).optional(),
  estimatedCostMax: z.coerce.number().min(0).optional(),
  currency: z.string().trim().max(3).default("MYR"),
  warning: z.string().trim().max(300).optional().or(z.literal("")),
});

export const adminRouteTemplateSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(160),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
  originPlaceId: z.string().uuid(),
  destinationPlaceId: z.string().uuid(),
  routeType: z.string().trim().max(40).default("mixed"),
  activeFrom: z.string().datetime({ offset: true }).optional(),
  activeUntil: z.string().datetime({ offset: true }).optional(),
  steps: z.array(templateStepSchema).min(1).max(10),
  estimatedCostMin: z.coerce.number().min(0).optional(),
  estimatedCostMax: z.coerce.number().min(0).optional(),
  reliabilityScore: z.coerce.number().int().min(0).max(100).default(60),
  raceDaySuitabilityScore: z.coerce.number().int().min(0).max(100).default(60),
  warning: z.string().trim().max(300).optional().or(z.literal("")),
  verified: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type AdminRouteTemplateInput = z.infer<typeof adminRouteTemplateSchema>;
