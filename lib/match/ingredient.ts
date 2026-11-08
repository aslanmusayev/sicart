// Ingredient / spoken query -> catalog product (PLAN.md R3: the LLM only names ingredients, the server picks SKUs).
// Steps: normalise words, apply synonyms, score products (primary tag > any tag > all words > most words),
// then pick the CHEAPEST product among the best matches ("cheapest good option").
import { CATALOG } from "../data/catalog";
import { INGREDIENT_SYNONYMS, RECIPES, findRecipe, type Recipe } from "../data/recipes";
import type { Product } from "../data/types";
import { round2 } from "../session/totals";

const FILLER = new Set(
  "a an the some of for to and or with fresh freshly grated ground chopped sliced diced minced large small medium big little organic good nice cheap cheapest best pack packs bottle bottles jar jars can cans tin block piece pieces kg g gr gram grams ml l litre litres liter liters cup cups tbsp tsp tablespoon tablespoons teaspoon teaspoons pinch handful clove cloves please".split(
    " ",
  ),
);

/** "cheeses" -> "cheese", "tomatoes" -> "tomato", "olives" -> "olive". */
function stem(word: string): string {
  if (word.length > 4 && word.endsWith("oes")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

export function normalize(query: string): string {
  const cleaned = query
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((w) => w && !FILLER.has(w))
    .join(" ")
    .trim();
  if (INGREDIENT_SYNONYMS[cleaned]) return INGREDIENT_SYNONYMS[cleaned];
  // longest synonym phrase contained in the query wins ("freshly ground black pepper" -> "black pepper")
  const hit = Object.keys(INGREDIENT_SYNONYMS)
    .filter((k) => ` ${cleaned} `.includes(` ${k} `))
    .sort((a, b) => b.length - a.length)[0];
  return hit ? INGREDIENT_SYNONYMS[hit] : cleaned;
}

function score(product: Product, q: string): number {
  if (product.tags[0] === q) return 4;
  if (product.tags.includes(q) || product.name.toLowerCase() === q) return 3;
  const words = q.split(" ").map(stem);
  const vocab = new Set(product.tags.flatMap((t) => t.split(" ")).map(stem));
  const hits = words.filter((w) => vocab.has(w)).length;
  if (hits === words.length) return 2;
  if (words.length > 1 && hits / words.length >= 0.5) return 1;
  return 0;
}

export interface Match {
  product: Product;
  /** The priciest interchangeable product, when we picked a cheaper one. */
  premium: Product | null;
  /** premium.price - product.price */
  saved: number;
}

export function matchIngredient(query: string): Match | null {
  const q = normalize(query);
  if (!q) return null;
  let best = 0;
  let candidates: Product[] = [];
  for (const product of CATALOG) {
    const s = score(product, q);
    if (s > best) {
      best = s;
      candidates = [product];
    } else if (s === best && s > 0) {
      candidates.push(product);
    }
  }
  if (!best) return null;
  const pick = [...candidates].sort((a, b) => a.price - b.price)[0];
  // Only count a saving against the SAME kind of product (Bella vs DOP pecorino), not against a different
  // ingredient that happens to share the group (pancetta vs guanciale).
  const group = pick.altGroup ? CATALOG.filter((p) => p.altGroup === pick.altGroup && p.tags[0] === pick.tags[0]) : [pick];
  const premium = group.reduce((max, p) => (p.price > max.price ? p : max), pick);
  return { product: pick, premium: premium.id === pick.id ? null : premium, saved: round2(premium.price - pick.price) };
}

export interface RecipeItem extends Match {
  qty: number;
  ingredient: string;
}

export interface RecipePlan {
  recipe: Recipe | null;
  servings: number;
  items: RecipeItem[];
  unmatched: string[];
}

/** Curated recipes are deterministic (the stage hero); any other dish uses the ingredient names the model gives. */
export function planRecipe(dish: string, servings = 4, ingredients: string[] = []): RecipePlan {
  const recipe = findRecipe(dish) ?? null;
  const people = Math.min(Math.max(Math.round(servings) || 4, 1), 20);
  const wanted = recipe
    ? recipe.ingredients.map((i) => ({ name: i.query, packs: Math.max(1, Math.ceil((i.packsFor4 * people) / 4)) }))
    : ingredients.map((name) => ({ name, packs: Math.max(1, Math.ceil(people / 4)) }));

  const items: RecipeItem[] = [];
  const unmatched: string[] = [];
  for (const w of wanted) {
    const match = matchIngredient(w.name);
    if (!match) {
      unmatched.push(w.name);
      continue;
    }
    const existing = items.find((i) => i.product.id === match.product.id);
    if (existing) existing.qty = Math.max(existing.qty, w.packs);
    else items.push({ ...match, qty: w.packs, ingredient: w.name });
  }
  return { recipe, servings: people, items, unmatched };
}

export const KNOWN_DISHES = RECIPES.map((r) => r.name);
