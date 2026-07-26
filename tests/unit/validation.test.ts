import { describe, expect, it } from "vitest";
import { nearbyQuerySchema, placesQuerySchema } from "@/lib/validation/places";
import { routeMatrixRequestSchema, routeRequestSchema } from "@/lib/validation/routes";

describe("placesQuerySchema", () => {
  it("accepts a plain category query", () => {
    const result = placesQuerySchema.safeParse({ category: "hotel" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe("hotel");
      expect(result.data.limit).toBeGreaterThan(0);
    }
  });

  it("rejects unknown categories", () => {
    expect(placesQuerySchema.safeParse({ category: "casino" }).success).toBe(false);
  });

  it("requires all four bounds together", () => {
    expect(placesQuerySchema.safeParse({ north: "3.0", south: "2.6" }).success).toBe(false);
  });

  it("rejects oversized bounds", () => {
    const result = placesQuerySchema.safeParse({
      north: "10",
      south: "0",
      east: "110",
      west: "100",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid bounds and coerces numbers", () => {
    const result = placesQuerySchema.safeParse({
      north: "3.0",
      south: "2.6",
      east: "101.9",
      west: "101.5",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.north).toBe(3.0);
  });
});

describe("nearbyQuerySchema", () => {
  it("clamps radius to the allowed range", () => {
    expect(nearbyQuerySchema.safeParse({ lat: "2.7", lng: "101.7", radius: "99999" }).success).toBe(false);
    const ok = nearbyQuerySchema.safeParse({ lat: "2.7", lng: "101.7", radius: "1000" });
    expect(ok.success).toBe(true);
  });

  it("requires lat and lng", () => {
    expect(nearbyQuerySchema.safeParse({ radius: "500" }).success).toBe(false);
  });
});

describe("routeRequestSchema", () => {
  it("accepts placeId-only endpoints", () => {
    const result = routeRequestSchema.safeParse({
      origin: { placeId: "abc" },
      destination: { lat: 2.76, lng: 101.73 },
      travelMode: "recommended",
    });
    expect(result.success).toBe(true);
  });

  it("rejects endpoints with neither placeId nor coordinates", () => {
    const result = routeRequestSchema.safeParse({
      origin: { name: "nowhere" },
      destination: { lat: 2.76, lng: 101.73 },
      travelMode: "drive",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid travel modes", () => {
    const result = routeRequestSchema.safeParse({
      origin: { lat: 1, lng: 1 },
      destination: { lat: 2, lng: 2 },
      travelMode: "teleport",
    });
    expect(result.success).toBe(false);
  });
});

describe("routeMatrixRequestSchema", () => {
  it("caps origins at four (hotel comparison max)", () => {
    const origin = { lat: 2.7, lng: 101.7 };
    const result = routeMatrixRequestSchema.safeParse({
      origins: [origin, origin, origin, origin, origin],
      destinations: [origin],
      travelMode: "drive",
    });
    expect(result.success).toBe(false);
  });

  it("accepts up to 4x3", () => {
    const point = { lat: 2.7, lng: 101.7 };
    const result = routeMatrixRequestSchema.safeParse({
      origins: [point, point, point, point],
      destinations: [point, point, point],
      travelMode: "transit",
    });
    expect(result.success).toBe(true);
  });
});
