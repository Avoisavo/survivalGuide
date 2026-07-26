import { expect, test } from "@playwright/test";

/**
 * Demo-mode end-to-end flow: open the map, filter hotels, pick a hotel,
 * request a route to the circuit and see route alternatives.
 *
 * The side panel also exists inside the hidden mobile bottom sheet, so all
 * panel locators are scoped to the desktop complementary region.
 */
test("visitor selects a hotel and requests a route to the circuit", async ({ page }) => {
  await page.goto("/");

  // The map product loads immediately — no hero page.
  await expect(page.getByRole("application")).toBeVisible();

  // Filter to hotels.
  await page.getByRole("button", { name: "Hotels" }).click();
  await expect(page).toHaveURL(/category=hotel/);

  const panel = page.getByRole("complementary", { name: "Route planner and results" });

  // A demo hotel appears in the results list.
  const hotelCard = panel.getByTestId("place-card-demo-airport-hotel");
  await expect(hotelCard).toBeVisible();

  // Request a route to the circuit from the hotel.
  await hotelCard.getByRole("button", { name: /route to circuit/i }).click();

  // The origin is set and route alternatives appear.
  await expect(panel.getByText("Demo Airport Hotel").first()).toBeVisible();
  const routeCards = panel.getByTestId("route-card");
  await expect(routeCards.first()).toBeVisible({ timeout: 20_000 });

  // Route cards expose duration, an explanation, and external nav links.
  await expect(panel.getByText(/Why this route\?/).first()).toBeVisible();
  await expect(panel.getByRole("link", { name: /open in google maps/i })).toBeVisible();
  await expect(panel.getByRole("link", { name: /open in waze/i })).toBeVisible();
});

test("shared URL restores category filter state", async ({ page }) => {
  await page.goto("/?category=food");
  await expect(page.getByRole("button", { name: "Food" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
