import { z } from "zod";

export const dealsQuerySchema = z.object({
  placeId: z.string().uuid().optional(),
  verified: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type DealsQuery = z.infer<typeof dealsQuerySchema>;

export const advisoriesQuerySchema = z.object({
  placeId: z.string().uuid().optional(),
  severity: z.enum(["info", "warning", "critical"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type AdvisoriesQuery = z.infer<typeof advisoriesQuerySchema>;
