// Curated recipes = the deterministic hero path ("I'm cooking carbonara for 4").
// Each ingredient is a search query for the matcher (lib/match/ingredient.ts), which picks the cheapest good
// option in the product's altGroup. Quantities are packs for 4 servings and scale with the requested servings.

export interface RecipeIngredient {
  /** What the matcher searches for (a product tag or name). */
  query: string;
  /** Packs needed for 4 servings. */
  packsFor4: number;
}

export interface Recipe {
  id: string;
  name: string;
  /** Words a shopper might say for this dish. */
  aliases: string[];
  ingredients: RecipeIngredient[];
}

export const RECIPES: Recipe[] = [
  {
    id: "carbonara",
    name: "Spaghetti Carbonara",
    aliases: ["carbonara", "spaghetti carbonara", "pasta carbonara"],
    ingredients: [
      { query: "spaghetti", packsFor4: 1 },
      { query: "cured pork", packsFor4: 1 },
      { query: "eggs", packsFor4: 1 },
      { query: "pecorino", packsFor4: 1 },
      { query: "black pepper", packsFor4: 1 },
    ],
  },
  {
    id: "greek-salad",
    name: "Greek Salad",
    aliases: ["greek salad", "horiatiki", "salad"],
    ingredients: [
      { query: "tomato", packsFor4: 1 },
      { query: "cucumber", packsFor4: 1 },
      { query: "red onions", packsFor4: 1 },
      { query: "feta", packsFor4: 1 },
      { query: "olives", packsFor4: 1 },
      { query: "olive oil", packsFor4: 1 },
      { query: "oregano", packsFor4: 1 },
    ],
  },
  {
    id: "plov",
    name: "Azerbaijani Plov",
    aliases: ["plov", "pilaf", "pilau", "shah plov", "lamb plov"],
    ingredients: [
      { query: "rice", packsFor4: 1 },
      { query: "lamb", packsFor4: 1 },
      { query: "yellow onions", packsFor4: 1 },
      { query: "carrot", packsFor4: 1 },
      { query: "saffron", packsFor4: 1 },
      { query: "butter", packsFor4: 1 },
      { query: "dried apricots", packsFor4: 1 },
    ],
  },
  {
    id: "pancakes",
    name: "Pancakes",
    aliases: ["pancakes", "pancake", "crepes"],
    ingredients: [
      { query: "flour", packsFor4: 1 },
      { query: "eggs", packsFor4: 1 },
      { query: "milk", packsFor4: 1 },
      { query: "sugar", packsFor4: 1 },
      { query: "butter", packsFor4: 1 },
      { query: "baking powder", packsFor4: 1 },
    ],
  },
];

/**
 * What shoppers (or the LLM) may say -> the product tag the matcher should search.
 * Keys and values are lower case.
 */
export const INGREDIENT_SYNONYMS: Record<string, string> = {
  bacon: "cured pork",
  guanciale: "cured pork",
  pancetta: "cured pork",
  "pork cheek": "cured pork",
  "pecorino romano": "pecorino",
  "romano cheese": "pecorino",
  parmigiano: "parmesan",
  "parmigiano reggiano": "parmesan",
  "grated cheese": "parmesan",
  egg: "eggs",
  "egg yolks": "eggs",
  "egg yolk": "eggs",
  pasta: "spaghetti",
  noodles: "spaghetti",
  pepper: "black pepper",
  "ground pepper": "black pepper",
  "freshly ground black pepper": "black pepper",
  tomatoes: "tomato",
  cucumbers: "cucumber",
  onion: "yellow onions",
  onions: "yellow onions",
  "red onion": "red onions",
  "kalamata olives": "olives",
  "extra virgin olive oil": "olive oil",
  "evoo": "olive oil",
  "basmati": "rice",
  "long grain rice": "rice",
  "lamb shoulder": "lamb",
  mutton: "lamb",
  carrots: "carrot",
  apricots: "dried apricots",
  "all-purpose flour": "flour",
  "plain flour": "flour",
  "wheat flour": "flour",
  "whole milk": "milk",
  "unsalted butter": "butter",
  yoghurt: "yogurt",
};

export function findRecipe(dish: string): Recipe | undefined {
  const d = dish.toLowerCase().trim();
  return RECIPES.find((r) => r.aliases.some((a) => d.includes(a)) || d.includes(r.id));
}
