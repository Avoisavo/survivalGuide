import { z } from "zod";

const endpointSchema = z
  .object({
    placeId: z.string().trim().min(1).max(300).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    name: z.string().trim().max(200).optional(),
  })
  .refine(
    (e) => e.placeId !== undefined || (e.lat !== undefined && e.lng !== undefined),
    { message: "Endpoint requires either placeId or both lat and lng" },
  );

export const routeRequestSchema = z.object({
  origin: endpointSchema,
  destination: endpointSchema,
  departureTime: z.string().datetime({ offset: true }).optional(),
  travelMode: z.enum(["recommended", "drive", "transit", "walk", "ride-hailing", "mixed"]),
  preferences: z
    .object({
      lessWalking: z.boolean().optional(),
      fewerTransfers: z.boolean().optional(),
      avoidTolls: z.boolean().optional(),
    })
    .optional(),
});

export type RouteRequestInput = z.infer<typeof routeRequestSchema>;

export const routeMatrixRequestSchema = z.object({
  origins: z.array(endpointSchema).min(1).max(4),
  destinations: z.array(endpointSchema).min(1).max(3),
  travelMode: z.enum(["drive", "transit", "walk", "ride-hailing"]),
  departureTime: z.string().datetime({ offset: true }).optional(),
});

export type RouteMatrixRequestInput = z.infer<typeof routeMatrixRequestSchema>;
