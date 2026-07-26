import { describe, expect, it } from "vitest";
import { assignRouteKinds, composeRoute } from "@/lib/routing/compose";
import type { RouteLeg } from "@/types/route";

function walkLeg(minutes: number, meters?: number): RouteLeg {
  return {
    id: `walk-${minutes}`,
    mode: "walk",
    title: "Walk",
    description: "Walking",
    originName: "A",
    destinationName: "B",
    durationMinutes: minutes,
    distanceMeters: meters,
    source: "google",
  };
}

function trainLeg(minutes: number): RouteLeg {
  return {
    id: `train-${minutes}`,
    mode: "train",
    title: "Board train",
    description: "Rail",
    originName: "B",
    destinationName: "C",
    durationMinutes: minutes,
    estimatedCostMin: 5,
    estimatedCostMax: 15,
    currency: "MYR",
    source: "google",
  };
}

function shuttleLeg(minutes: number): RouteLeg {
  return {
    id: `shuttle-${minutes}`,
    mode: "shuttle",
    title: "Board race-day shuttle",
    description: "Event shuttle",
    originName: "C",
    destinationName: "D",
    durationMinutes: minutes,
    estimatedCostMin: 0,
    estimatedCostMax: 10,
    currency: "MYR",
    source: "curated",
    warning: "Queues peak before the race start.",
  };
}

describe("composeRoute", () => {
  it("throws with zero legs", () => {
    expect(() =>
      composeRoute([], { id: "x", kind: "fastest", title: "t", travelMode: "mixed" }),
    ).toThrow();
  });

  it("sums duration, walking, and cost across mixed google + curated legs", () => {
    const route = composeRoute(
      [walkLeg(6, 480), trainLeg(28), shuttleLeg(32), walkLeg(8, 640)],
      { id: "mixed-1", kind: "race-day", title: "Race-day route", travelMode: "mixed" },
    );
    expect(route.totalDurationMinutes).toBe(74);
    expect(route.totalWalkingMeters).toBe(1120);
    expect(route.totalWalkingMinutes).toBe(14);
    expect(route.estimatedCostMin).toBe(5);
    expect(route.estimatedCostMax).toBe(25);
    expect(route.currency).toBe("MYR");
  });

  it("counts transfers as vehicle boardings minus one", () => {
    const route = composeRoute(
      [walkLeg(5), trainLeg(20), shuttleLeg(30), walkLeg(5)],
      { id: "t", kind: "race-day", title: "t", travelMode: "mixed" },
    );
    expect(route.transfers).toBe(1);
  });

  it("computes arrival time from the departure anchor", () => {
    const departure = "2026-08-02T00:00:00.000Z";
    const route = composeRoute([walkLeg(10), trainLeg(20)], {
      id: "t",
      kind: "fastest",
      title: "t",
      travelMode: "transit",
      departureTime: departure,
    });
    expect(route.arrivalTime).toBe("2026-08-02T00:30:00.000Z");
    expect(route.legs[0].departureTime).toBe(departure);
    expect(route.legs[1].departureTime).toBe("2026-08-02T00:10:00.000Z");
  });

  it("flags curated legs and surfaces their warnings", () => {
    const route = composeRoute([trainLeg(20), shuttleLeg(30)], {
      id: "t",
      kind: "race-day",
      title: "t",
      travelMode: "mixed",
    });
    expect(route.containsCuratedLeg).toBe(true);
    expect(route.warnings).toContain("Queues peak before the race start.");
    expect(route.warnings).toContain(
      "This route contains a manually curated event-shuttle leg.",
    );
  });

  it("omits cost when no leg has cost data", () => {
    const route = composeRoute([walkLeg(10)], {
      id: "t",
      kind: "fastest",
      title: "t",
      travelMode: "walk",
    });
    expect(route.estimatedCostMin).toBeUndefined();
    expect(route.estimatedCostMax).toBeUndefined();
  });
});

describe("assignRouteKinds", () => {
  it("labels the fastest route and keeps race-day labels", () => {
    const fast = composeRoute([trainLeg(20)], {
      id: "fast",
      kind: "fastest",
      title: "t",
      travelMode: "transit",
    });
    const raceDay = composeRoute([shuttleLeg(40)], {
      id: "race",
      kind: "race-day",
      title: "t",
      travelMode: "mixed",
    });
    const result = assignRouteKinds([raceDay, fast]);
    expect(result.find((r) => r.id === "race")?.kind).toBe("race-day");
    expect(result.find((r) => r.id === "fast")?.kind).toBe("fastest");
  });
});
