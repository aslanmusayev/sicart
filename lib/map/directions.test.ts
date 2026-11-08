import { describe, expect, it } from "vitest";
import { ENTRANCE, getShelf } from "../data/storeMap";
import { directionsTo } from "./directions";

describe("directionsTo", () => {
  it("guides from the entrance into aisle 5 with the shelf side and level", () => {
    const steps = directionsTo(ENTRANCE, "penne"); // Pasta: left face of rack 5, level 2
    const text = steps.join(" ");
    expect(text).toMatch(/turn left into Aisle 5/); // heading east along the cross aisle, then north
    expect(steps.at(-1)).toMatch(/Penne Rigate is on your right, second shelf\.$/);
    expect(steps.every((s) => /^Walk \d+ meters?/.test(s))).toBe(true);
  });

  it("says the product is right here when the cart is already at the shelf", () => {
    expect(directionsTo(getShelf("pasta").access, "penne")).toEqual(["Penne Rigate is right here, second shelf."]);
  });

  it("uses the other side for the right-hand face of a rack", () => {
    // Rice & Grains is the right face of rack 5 (aisle 6): walking north in aisle 6 the shelf is on the left
    const last = directionsTo(ENTRANCE, "bulgur").at(-1)!;
    expect(last).toMatch(/Bulgur is on your left/);
  });

  it("keeps the number of steps small", () => {
    expect(directionsTo(ENTRANCE, "milk").length).toBeLessThanOrEqual(5);
  });
});
