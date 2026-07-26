import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RouteCard } from "@/components/routes/route-card";
import type { RouteOption } from "@/types/route";

const route: RouteOption = {
  id: "test-route",
  kind: "race-day",
  title: "Race-day route",
  travelMode: "mixed",
  legs: [
    {
      id: "l1",
      mode: "walk",
      title: "Walk to Demo Transit Hub",
      description: "Short indoor walk",
      originName: "Demo Airport Hotel",
      destinationName: "Demo Transit Hub",
      durationMinutes: 6,
      distanceMeters: 480,
      source: "google",
    },
    {
      id: "l2",
      mode: "shuttle",
      title: "Board race-day shuttle",
      description: "Event shuttle to the circuit apron",
      originName: "Demo Transit Hub",
      destinationName: "Circuit apron",
      durationMinutes: 32,
      estimatedCostMin: 0,
      estimatedCostMax: 10,
      currency: "MYR",
      source: "curated",
    },
  ],
  totalDurationMinutes: 38,
  totalDistanceMeters: 21000,
  totalWalkingMeters: 480,
  totalWalkingMinutes: 6,
  transfers: 0,
  estimatedCostMin: 0,
  estimatedCostMax: 10,
  currency: "MYR",
  arrivalTime: "2026-08-02T01:38:00.000Z",
  reliabilityScore: 80,
  raceDaySuitabilityScore: 90,
  score: {
    travelTime: 100,
    reliability: 80,
    cost: 100,
    walking: 100,
    transfers: 100,
    raceDaySuitability: 90,
    finalScore: 93.5,
  },
  explanation: "Recommended because it avoids the most congested approach road.",
  warnings: ["This route contains a manually curated event-shuttle leg."],
  containsCuratedLeg: true,
};

describe("RouteCard", () => {
  it("shows duration, kind label, walking, transfers, cost and warning", () => {
    render(<RouteCard route={route} isSelected={false} onSelect={() => {}} />);
    expect(screen.getByText("Best for race day")).toBeInTheDocument();
    expect(screen.getByText("38 min")).toBeInTheDocument();
    expect(screen.getByText(/6 min walk/)).toBeInTheDocument();
    expect(screen.getByText(/No transfers/)).toBeInTheDocument();
    expect(screen.getByText(/est\. MYR 0–10/)).toBeInTheDocument();
    expect(
      screen.getByText(/manually curated event-shuttle leg/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Why this route\?/)).toBeInTheDocument();
  });

  it("expands to show the step timeline", async () => {
    const user = userEvent.setup();
    render(<RouteCard route={route} isSelected={false} onSelect={() => {}} />);
    expect(screen.queryByText("Board race-day shuttle")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /show steps/i }));
    expect(screen.getByText("Board race-day shuttle")).toBeInTheDocument();
    expect(screen.getByText("Walk to Demo Transit Hub")).toBeInTheDocument();
  });

  it("invokes onSelect with the route", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<RouteCard route={route} isSelected={false} onSelect={onSelect} />);
    await user.click(screen.getByRole("button", { name: /select route/i }));
    expect(onSelect).toHaveBeenCalledWith(route);
  });
});
