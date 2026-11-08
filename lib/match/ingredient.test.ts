import { describe, expect, it } from "vitest";
import { matchIngredient, normalize, planRecipe } from "./ingredient";

const id = (q: string) => matchIngredient(q)?.product.id;

describe("normalize", () => {
  it("drops filler words, units and applies synonyms", () => {
    expect(normalize("200 g freshly grated Pecorino Romano")).toBe("pecorino");
    expect(normalize("freshly ground black pepper")).toBe("black pepper");
    expect(normalize("Guanciale")).toBe("cured pork");
    expect(normalize("4 large eggs")).toBe("eggs");
  });
});

describe("matchIngredient", () => {
  it("maps common ingredients to the right shelf product", () => {
    expect(id("tomato")).toBe("tomatoes"); // not tomato paste or sauce
    expect(id("feta cheese")).toBe("feta");
    expect(id("parmesan cheese")).toBe("grana-padano");
    expect(id("kalamata olives")).toBe("kalamata-olives");
    expect(id("garlic cloves")).toBe("garlic");
    expect(id("onions")).toBe("yellow-onions");
    expect(id("red onion")).toBe("red-onions");
  });

  it("picks the cheapest good option and reports the saving", () => {
    const pecorino = matchIngredient("pecorino")!;
    expect(pecorino.product.id).toBe("pecorino");
    expect(pecorino.premium?.id).toBe("pecorino-dop");
    expect(pecorino.saved).toBe(2.1);
    expect(id("olive oil")).toBe("olive-oil-basic");
  });

  it("returns null for things the store does not sell", () => {
    expect(matchIngredient("caviar")).toBeNull();
    expect(matchIngredient("")).toBeNull();
  });
});

describe("planRecipe", () => {
  it("builds carbonara for 4 from 5 deterministic items", () => {
    const plan = planRecipe("I'm cooking carbonara for 4", 4);
    expect(plan.recipe?.id).toBe("carbonara");
    expect(plan.items.map((i) => i.product.id)).toEqual(["spaghetti-basic", "pancetta", "eggs-basic", "pecorino", "black-pepper"]);
    expect(plan.items.every((i) => i.qty === 1)).toBe(true);
    expect(plan.unmatched).toEqual([]);
    expect(plan.items.find((i) => i.product.id === "pecorino")?.saved).toBe(2.1);
    // pancetta is not a "cheaper guanciale": no saving is claimed for a different ingredient
    expect(plan.items.find((i) => i.product.id === "pancetta")?.premium).toBeNull();
    const best = [...plan.items].sort((a, b) => b.saved - a.saved)[0];
    expect(best.product.id).toBe("pecorino"); // the stage line
  });

  it("scales packs with servings", () => {
    const plan = planRecipe("carbonara", 8);
    expect(plan.items.find((i) => i.product.id === "spaghetti-basic")?.qty).toBe(2);
  });

  it("uses the model's ingredient list for unknown dishes and reports what it could not find", () => {
    const plan = planRecipe("shakshuka", 2, ["tomatoes", "eggs", "red onion", "smoked paprika"]);
    expect(plan.recipe).toBeNull();
    expect(plan.items.map((i) => i.product.id)).toEqual(["tomatoes", "eggs-basic", "red-onions"]);
    expect(plan.unmatched).toEqual(["smoked paprika"]);
  });

  it("knows the other curated dishes", () => {
    expect(planRecipe("plov").items.map((i) => i.product.id)).toContain("saffron");
    expect(planRecipe("greek salad").items.map((i) => i.product.id)).toContain("tomatoes");
    expect(planRecipe("pancakes").items.map((i) => i.product.id)).toContain("wheat-flour");
  });
});
