import { z } from "zod";
import { MAX_BOUNDS_SPAN_DEGREES, PLACES_PAGE_LIMIT } from "@/config/site";

export const placeCategorySchema = z.enum([
  "hotel",
  "food",
  "transit",
  "deal",
  "essential",
  "circuit",
]);

const latSchema = z.coerce.number().min(-90).max(90);
const lngSchema = z.coerce.number().min(-180).max(180);

export const placesQuerySchema = z
  .object({
    category: placeCategorySchema.optional(),
    north: latSchema.optional(),
    south: latSchema.optional(),
    east: lngSchema.optional(),
    west: lngSchema.optional(),
    verified: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === "true")),
    q: z.string().trim().max(120).optional(),
    limit: z.coerce.number().int().min(1).max(PLACES_PAGE_LIMIT).default(PLACES_PAGE_LIMIT),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .superRefine((query, ctx) => {
    const boundsFields = [query.north, query.south, query.east, query.west];
    const provided = boundsFields.filter((v) => v !== undefined).length;
    if (provided > 0 && provided < 4) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "All four bounds (north, south, east, west) must be provided together",
      });
      return;
    }
    if (provided === 4) {
      const latSpan = Math.abs(query.north! - query.south!);
      const lngSpan = Math.abs(query.east! - query.west!);
      if (latSpan > MAX_BOUNDS_SPAN_DEGREES || lngSpan > MAX_BOUNDS_SPAN_DEGREES) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Bounds too large; maximum span is ${MAX_BOUNDS_SPAN_DEGREES} degrees. Zoom in and search again.`,
        });
      }
    }
  });

export type PlacesQuery = z.infer<typeof placesQuerySchema>;

export const nearbyQuerySchema = z.object({
  lat: latSchema,
  lng: lngSchema,
  radius: z.coerce.number().int().min(100).max(5000).default(1000),
  category: placeCategorySchema.optional(),
  limit: z.coerce.number().int().min(1).max(30).default(30),
});

export type NearbyQuery = z.infer<typeof nearbyQuerySchema>;
