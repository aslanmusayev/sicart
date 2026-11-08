// Gemini Live function declarations (PLAN.md "Voice tools"). Results are compact JSON for the model;
// the screens update through the session snapshot, not through the tool result.

export const TOOL_NAMES = [
  "plan_recipe",
  "find_product",
  "add_to_list",
  "remove_from_list",
  "get_list",
  "find_cheaper",
  "plan_budget",
  "product_info",
  "start_checkout",
] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

const str = (description: string) => ({ type: "STRING", description });
const num = (description: string) => ({ type: "NUMBER", description });

export const FUNCTION_DECLARATIONS = [
  {
    name: "plan_recipe",
    description:
      "The shopper wants to cook a dish. Adds every ingredient to their shopping list (the store picks the cheapest good product) and plans the route. Call this for any 'I'm cooking X', 'I want to make X', 'ingredients for X'.",
    parameters: {
      type: "OBJECT",
      properties: {
        dish: str("The dish, e.g. 'carbonara'"),
        servings: num("How many people, default 4"),
        ingredients: {
          type: "ARRAY",
          items: { type: "STRING" },
          description:
            "Only for dishes that are not carbonara, Greek salad, plov or pancakes: the plain ingredient names, e.g. ['tomatoes','eggs']",
        },
      },
      required: ["dish"],
    },
  },
  {
    name: "find_product",
    description: "Find where a product is in the store. Highlights its shelf and draws the route there on the cart screen.",
    parameters: { type: "OBJECT", properties: { query: str("What the shopper is looking for, e.g. 'olive oil'") }, required: ["query"] },
  },
  {
    name: "add_to_list",
    description: "Add products to the shopping list.",
    parameters: {
      type: "OBJECT",
      properties: {
        items: {
          type: "ARRAY",
          items: { type: "OBJECT", properties: { name: str("Product name"), qty: num("How many packs, default 1") }, required: ["name"] },
        },
      },
      required: ["items"],
    },
  },
  {
    name: "remove_from_list",
    description: "Remove products from the shopping list.",
    parameters: {
      type: "OBJECT",
      properties: { items: { type: "ARRAY", items: { type: "STRING" }, description: "Product names" } },
      required: ["items"],
    },
  },
  {
    name: "get_list",
    description: "Read the shopping list, what is already in the cart and what is left.",
    parameters: { type: "OBJECT", properties: {} },
  },
  {
    name: "find_cheaper",
    description: "Find a cheaper alternative for a product. If the product is on the list, swaps it for the cheaper one.",
    parameters: { type: "OBJECT", properties: { query: str("The product, e.g. 'parmesan'") }, required: ["query"] },
  },
  {
    name: "plan_budget",
    description: "Check whether a dish or the current list fits a budget in manat, and suggest cheaper swaps.",
    parameters: {
      type: "OBJECT",
      properties: { budget: num("Budget in AZN"), dish: str("Optional dish"), servings: num("Optional number of people") },
      required: ["budget"],
    },
  },
  {
    name: "product_info",
    description: "Price, pack size, allergens, nutrition and location of a product.",
    parameters: { type: "OBJECT", properties: { query: str("The product") }, required: ["query"] },
  },
  {
    name: "start_checkout",
    description: "The shopper is done and wants to pay. Opens the payment screen on the cart.",
    parameters: { type: "OBJECT", properties: {} },
  },
];
