import { getShelf } from "./storeMap";
import type { Allergen, Product, ShelfId } from "./types";

// ~84 products of the fictional "SiCart Market". All brands are invented. Prices in AZN.
// Category is derived from the shelf's zone so the two can never disagree.

interface Opts {
  level?: Product["level"];
  tags?: string[];
  allergens?: Allergen[];
  /** kcal, protein, carbs, fat per 100 g / 100 ml */
  n?: [number, number, number, number];
  alt?: string;
}

function p(
  id: string,
  name: string,
  brand: string,
  shelfId: ShelfId,
  price: number,
  unit: string,
  o: Opts = {},
): Product {
  const words = name.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  return {
    id,
    name,
    brand,
    category: getShelf(shelfId).zone,
    price,
    unit,
    image: `/products/${id}.webp`,
    shelfId,
    level: o.level ?? 2,
    tags: Array.from(new Set([...(o.tags ?? []), name.toLowerCase(), ...words])),
    allergens: o.allergens ?? [],
    nutrition: o.n ? { kcal: o.n[0], protein: o.n[1], carbs: o.n[2], fat: o.n[3] } : undefined,
    altGroup: o.alt,
  };
}

export const CATALOG: Product[] = [
  // Fruit & Vegetables
  p("tomatoes", "Vine Tomatoes", "Quba Farms", "produce", 3.2, "1 kg", { tags: ["tomato", "vegetable", "salad"], n: [18, 0.9, 3.9, 0.2] }),
  p("cucumbers", "Cucumbers", "Quba Farms", "produce", 2.4, "1 kg", { tags: ["cucumber", "vegetable", "salad"], n: [15, 0.7, 3.6, 0.1] }),
  p("red-onions", "Red Onions", "Quba Farms", "produce", 1.6, "1 kg", { tags: ["onion", "vegetable"], n: [40, 1.1, 9.3, 0.1] }),
  p("yellow-onions", "Yellow Onions", "Quba Farms", "produce", 1.1, "1 kg", { level: 1, tags: ["onion", "vegetable"], n: [40, 1.1, 9.3, 0.1] }),
  p("carrots", "Carrots", "Quba Farms", "produce", 1.3, "1 kg", { level: 1, tags: ["carrot", "vegetable"], n: [41, 0.9, 9.6, 0.2] }),
  p("garlic", "Garlic", "Quba Farms", "produce", 1.2, "250 g", { level: 3, tags: ["garlic"], n: [149, 6.4, 33, 0.5] }),
  p("lemons", "Lemons", "Lankaran Citrus", "produce", 3.5, "1 kg", { tags: ["lemon", "citrus", "fruit"], n: [29, 1.1, 9.3, 0.3] }),
  p("basil", "Fresh Basil", "Quba Farms", "produce", 1.3, "30 g", { level: 3, tags: ["basil", "herb"], n: [23, 3.2, 2.7, 0.6] }),
  p("bananas", "Bananas", "Tropico", "produce", 3.3, "1 kg", { tags: ["banana", "fruit"], n: [89, 1.1, 23, 0.3] }),
  p("apples", "Red Apples", "Quba Farms", "produce", 2.8, "1 kg", { tags: ["apple", "fruit"], n: [52, 0.3, 14, 0.2] }),

  // Bakery
  p("sourdough", "Sourdough Loaf", "Absheron Bakery", "bakery", 2.9, "500 g", { tags: ["bread"], allergens: ["gluten"], n: [260, 9, 51, 1.5] }),
  p("lavash", "Lavash Flatbread", "Absheron Bakery", "bakery", 1.0, "5 pcs", { tags: ["bread", "flatbread"], allergens: ["gluten"], n: [275, 9, 56, 1.2] }),
  p("croissants", "Butter Croissants", "Absheron Bakery", "bakery", 4.2, "4 pcs", { level: 3, tags: ["pastry", "breakfast"], allergens: ["gluten", "milk", "eggs"], n: [406, 8, 45, 21] }),

  // Meat & Fish
  p("pancetta", "Pancetta Cubes", "Bella", "meat", 5.9, "150 g", { tags: ["pancetta", "bacon", "cured pork", "guanciale"], alt: "cured-pork", n: [458, 15, 0.5, 44] }),
  p("guanciale", "Guanciale", "Roma Antica", "meat", 8.4, "150 g", { level: 3, tags: ["guanciale", "cured pork", "pancetta"], alt: "cured-pork", n: [655, 7, 0, 69] }),
  p("chicken-breast", "Chicken Breast", "Golden Hen", "meat", 9.8, "1 kg", { tags: ["chicken", "poultry"], n: [120, 23, 0, 2.6] }),
  p("lamb-shoulder", "Lamb Shoulder", "Shamakhi Farm", "meat", 18.5, "1 kg", { level: 1, tags: ["lamb", "meat"], n: [282, 16, 0, 24] }),
  p("salmon", "Salmon Fillet", "Caspian Catch", "meat", 14.9, "300 g", { level: 3, tags: ["salmon", "fish"], allergens: ["fish"], n: [208, 20, 0, 13] }),

  // Dairy & Eggs
  p("eggs-free-range", "Free-Range Eggs", "Quba Farms", "dairy", 3.1, "10 pcs", { level: 3, tags: ["eggs", "egg"], allergens: ["eggs"], alt: "eggs", n: [143, 12.6, 0.7, 9.5] }),
  p("eggs-basic", "Eggs", "SiCart Basics", "dairy", 2.4, "10 pcs", { tags: ["eggs", "egg"], allergens: ["eggs"], alt: "eggs", n: [143, 12.6, 0.7, 9.5] }),
  p("milk", "Whole Milk 3.2%", "Shamakhi Dairy", "dairy", 1.9, "1 L", { level: 3, tags: ["milk"], allergens: ["milk"], alt: "milk", n: [60, 3.2, 4.7, 3.2] }),
  p("milk-basic", "Milk 2.5%", "SiCart Basics", "dairy", 1.45, "1 L", { tags: ["milk"], allergens: ["milk"], alt: "milk", n: [52, 3, 4.7, 2.5] }),
  p("butter", "Butter 82%", "Shamakhi Dairy", "dairy", 3.6, "200 g", { tags: ["butter"], allergens: ["milk"], n: [748, 0.6, 0.8, 82] }),
  p("pecorino-dop", "Pecorino Romano DOP", "Roma Antica", "dairy", 7.9, "200 g", { level: 3, tags: ["pecorino", "cheese", "pecorino romano"], allergens: ["milk"], alt: "pecorino", n: [387, 32, 3.6, 27] }),
  p("pecorino", "Pecorino Romano", "Bella", "dairy", 5.8, "200 g", { tags: ["pecorino", "cheese", "pecorino romano"], allergens: ["milk"], alt: "pecorino", n: [387, 32, 3.6, 27] }),
  p("parmigiano", "Parmigiano Reggiano 24m", "Roma Antica", "dairy", 8.5, "200 g", { level: 3, tags: ["parmesan", "parmigiano", "cheese"], allergens: ["milk"], alt: "parmesan", n: [392, 33, 0, 29] }),
  p("grana-padano", "Grana Padano", "Bella", "dairy", 5.6, "200 g", { tags: ["parmesan", "grana padano", "cheese"], allergens: ["milk"], alt: "parmesan", n: [384, 33, 0, 28] }),
  p("feta", "Feta Cheese", "Olympus", "dairy", 4.3, "200 g", { tags: ["feta", "cheese"], allergens: ["milk"], n: [264, 14, 4, 21] }),
  p("greek-yogurt", "Greek Yogurt", "Shamakhi Dairy", "dairy", 2.7, "400 g", { level: 1, tags: ["yogurt", "yoghurt"], allergens: ["milk"], n: [97, 9, 3.6, 5] }),

  // Drinks
  p("orange-juice", "Orange Juice", "Nar", "chilled-drinks", 3.4, "1 L", { tags: ["juice", "orange"], n: [45, 0.7, 10, 0.2] }),
  p("pomegranate-juice", "Pomegranate Juice", "Nar", "chilled-drinks", 4.9, "1 L", { level: 3, tags: ["juice", "pomegranate"], n: [54, 0.2, 13, 0] }),
  p("ayran", "Ayran", "Shamakhi Dairy", "chilled-drinks", 1.1, "500 ml", { tags: ["yogurt drink", "ayran"], allergens: ["milk"], n: [35, 1.7, 2.4, 1.5] }),
  p("cola", "Cola", "Fizzo", "soft-drinks", 2.2, "1.5 L", { tags: ["soda", "soft drink"], n: [42, 0, 10.6, 0] }),
  p("tarragon-lemonade", "Tarragon Lemonade", "Fizzo", "soft-drinks", 1.8, "1 L", { level: 3, tags: ["soda", "lemonade", "tarkhun"], n: [40, 0, 10, 0] }),
  p("still-water", "Still Water", "Caspian Spring", "water", 0.7, "1.5 L", { tags: ["water"], alt: "water", n: [0, 0, 0, 0] }),
  p("water-basic", "Still Water", "SiCart Basics", "water", 0.5, "1.5 L", { level: 1, tags: ["water"], alt: "water", n: [0, 0, 0, 0] }),
  p("sparkling-water", "Sparkling Mineral Water", "Shahdag Springs", "water", 0.9, "0.5 L", { level: 3, tags: ["water", "mineral water", "sparkling"], n: [0, 0, 0, 0] }),

  // Frozen
  p("frozen-peas", "Green Peas", "Polar Fresh", "frozen", 2.3, "400 g", { tags: ["peas", "vegetable", "frozen"], n: [77, 5, 13, 0.4] }),
  p("vanilla-ice-cream", "Vanilla Ice Cream", "Polar Fresh", "frozen", 4.8, "500 ml", { tags: ["ice cream", "dessert"], allergens: ["milk"], n: [207, 3.5, 24, 11] }),
  p("pizza-margherita", "Margherita Pizza", "Bella", "frozen", 5.4, "350 g", { tags: ["pizza", "frozen"], allergens: ["gluten", "milk"], n: [250, 10, 32, 9] }),
  p("dushbara", "Beef Dushbara", "Mama's Kitchen", "frozen", 4.6, "500 g", { level: 1, tags: ["dumplings", "dushbara"], allergens: ["gluten", "eggs"], n: [220, 10, 28, 7] }),

  // Home & Care
  p("dish-soap", "Dish Soap Lemon", "CleanPro", "household", 2.6, "500 ml", { tags: ["dish soap", "cleaning"] }),
  p("laundry-gel", "Laundry Gel", "CleanPro", "household", 9.9, "1.5 L", { level: 1, tags: ["laundry", "detergent", "cleaning"] }),
  p("paper-towels", "Paper Towels", "Pure&Soft", "household", 3.2, "2 rolls", { level: 3, tags: ["paper towels", "kitchen roll"] }),
  p("toothpaste", "Mint Toothpaste", "Dentix", "personal-care", 3.4, "100 ml", { level: 3, tags: ["toothpaste"] }),
  p("shampoo", "Herbal Shampoo", "Pure&Soft", "personal-care", 6.2, "400 ml", { tags: ["shampoo", "hair"] }),

  // Snacks & Sweets
  p("sea-salt-chips", "Sea Salt Chips", "Crunchy", "snacks", 2.5, "150 g", { level: 3, tags: ["chips", "crisps", "snack"], n: [536, 7, 53, 34] }),
  p("hazelnuts", "Roasted Hazelnuts", "Gabala Nuts", "snacks", 5.9, "200 g", { tags: ["nuts", "hazelnut", "snack"], allergens: ["nuts"], n: [646, 15, 17, 61] }),
  p("sesame-crackers", "Sesame Crackers", "Crunchy", "snacks", 1.9, "200 g", { tags: ["crackers", "snack"], allergens: ["gluten", "sesame"], n: [440, 10, 68, 14] }),
  p("dried-apricots", "Dried Apricots", "Sun Valley", "snacks", 3.6, "200 g", { tags: ["dried fruit", "apricot"], n: [241, 3.4, 63, 0.5] }),
  p("dark-chocolate", "Dark Chocolate 70%", "Sweet Baku", "sweets", 3.2, "100 g", { level: 3, tags: ["chocolate", "sweets"], allergens: ["milk"], n: [598, 7.8, 46, 43] }),
  p("pakhlava", "Baku Pakhlava", "Sweet Baku", "sweets", 6.5, "6 pcs", { tags: ["pakhlava", "baklava", "dessert"], allergens: ["gluten", "nuts", "eggs"], n: [450, 7, 52, 24] }),
  p("butter-cookies", "Butter Cookies", "Sweet Baku", "sweets", 2.8, "300 g", { tags: ["cookies", "biscuits"], allergens: ["gluten", "milk", "eggs"], n: [500, 6, 64, 24] }),

  // Breakfast, Coffee & Tea
  p("rolled-oats", "Rolled Oats", "Golden Field", "breakfast", 2.2, "500 g", { tags: ["oats", "porridge", "cereal"], allergens: ["gluten"], n: [379, 13, 68, 6.5] }),
  p("honey-granola", "Honey Granola", "Golden Field", "breakfast", 4.6, "400 g", { level: 3, tags: ["granola", "cereal"], allergens: ["gluten", "nuts"], n: [471, 10, 64, 20] }),
  p("mountain-honey", "Mountain Honey", "Gabala Apiary", "spreads", 9.5, "400 g", { level: 3, tags: ["honey"], n: [304, 0.3, 82, 0] }),
  p("sour-cherry-jam", "Sour Cherry Jam", "Quba Farms", "spreads", 3.9, "350 g", { tags: ["jam", "cherry"], n: [250, 0.4, 62, 0.1] }),
  p("hazelnut-spread", "Hazelnut Cocoa Spread", "Sweet Baku", "spreads", 5.2, "350 g", { tags: ["chocolate spread", "hazelnut"], allergens: ["nuts", "milk"], n: [539, 6, 58, 31] }),
  p("black-tea", "Black Tea", "Lankaran Tea", "coffee-tea", 4.4, "250 g", { tags: ["tea", "black tea"], n: [1, 0, 0.3, 0] }),
  p("espresso-beans", "Espresso Beans", "Kofe House", "coffee-tea", 14.9, "500 g", { level: 3, tags: ["coffee", "espresso", "beans"], alt: "coffee", n: [2, 0.1, 0, 0] }),
  p("ground-coffee", "Ground Coffee", "SiCart Basics", "coffee-tea", 5.9, "250 g", { tags: ["coffee", "ground coffee"], alt: "coffee", n: [2, 0.1, 0, 0] }),

  // Pantry
  p("chickpeas", "Chickpeas", "Bella", "canned", 1.7, "400 g", { tags: ["chickpeas", "beans", "canned"], n: [139, 7, 22, 2.6] }),
  p("tuna", "Tuna in Olive Oil", "Caspian Catch", "canned", 3.9, "160 g", { level: 3, tags: ["tuna", "fish", "canned"], allergens: ["fish"], n: [190, 26, 0, 9] }),
  p("tomato-paste", "Tomato Paste", "Bella", "canned", 1.9, "300 g", { tags: ["tomato paste", "tomato"], n: [82, 4.3, 19, 0.5] }),
  p("kalamata-olives", "Kalamata Olives", "Olympus", "canned", 4.2, "200 g", { level: 3, tags: ["olives", "olive"], n: [239, 1.6, 6, 23] }),
  p("black-pepper", "Black Pepper Ground", "Spice Route", "spices", 1.8, "50 g", { level: 3, tags: ["pepper", "black pepper", "spice"], n: [251, 10, 64, 3.3] }),
  p("saffron", "Saffron Threads", "Spice Route", "spices", 6.9, "1 g", { level: 3, tags: ["saffron", "spice"] }),
  p("sea-salt", "Sea Salt", "Spice Route", "spices", 0.9, "500 g", { tags: ["salt"] }),
  p("dried-oregano", "Dried Oregano", "Spice Route", "spices", 1.4, "20 g", { tags: ["oregano", "herb", "spice"] }),
  p("wheat-flour", "Wheat Flour", "Golden Field", "baking", 1.4, "1 kg", { level: 1, tags: ["flour"], allergens: ["gluten"], n: [364, 10, 76, 1] }),
  p("sugar", "Sugar", "SiCart Basics", "baking", 1.6, "1 kg", { level: 1, tags: ["sugar"], n: [387, 0, 100, 0] }),
  p("baking-powder", "Baking Powder", "Golden Field", "baking", 0.6, "50 g", { level: 3, tags: ["baking powder"] }),

  // Pasta & Rice
  p("spaghetti", "Spaghetti No.5", "Bella", "pasta", 2.4, "500 g", { level: 3, tags: ["spaghetti", "pasta"], allergens: ["gluten"], alt: "spaghetti", n: [359, 13, 72, 1.5] }),
  p("spaghetti-basic", "Spaghetti", "SiCart Basics", "pasta", 1.5, "500 g", { tags: ["spaghetti", "pasta"], allergens: ["gluten"], alt: "spaghetti", n: [355, 12, 72, 1.5] }),
  p("penne", "Penne Rigate", "Bella", "pasta", 2.4, "500 g", { tags: ["penne", "pasta"], allergens: ["gluten"], n: [359, 13, 72, 1.5] }),
  p("basmati-rice", "Basmati Rice", "Golden Field", "rice-grains", 4.8, "1 kg", { level: 3, tags: ["rice", "basmati", "long grain rice"], alt: "rice", n: [350, 8, 78, 0.6] }),
  p("long-grain-rice", "Long Grain Rice", "SiCart Basics", "rice-grains", 2.9, "1 kg", { tags: ["rice", "long grain rice"], alt: "rice", n: [350, 7, 79, 0.6] }),
  p("bulgur", "Bulgur", "Golden Field", "rice-grains", 2.6, "1 kg", { tags: ["bulgur", "grains"], allergens: ["gluten"], n: [342, 12, 76, 1.3] }),

  // Sauces & Oils
  p("tomato-basil-sauce", "Tomato & Basil Sauce", "Bella", "sauces", 3.3, "400 g", { level: 3, tags: ["pasta sauce", "tomato sauce", "tomato", "basil"], alt: "pasta-sauce", n: [55, 1.7, 8, 1.8] }),
  p("tomato-sauce-basic", "Tomato Sauce", "SiCart Basics", "sauces", 1.9, "400 g", { tags: ["pasta sauce", "tomato sauce", "tomato"], alt: "pasta-sauce", n: [45, 1.5, 7.5, 1] }),
  p("basil-pesto", "Basil Pesto", "Bella", "sauces", 4.1, "190 g", { tags: ["pesto", "basil", "pasta sauce"], allergens: ["milk", "nuts"], n: [450, 5, 6, 45] }),
  p("olive-oil", "Extra Virgin Olive Oil", "Roma Antica", "oils", 11.9, "500 ml", { level: 3, tags: ["olive oil", "oil"], alt: "olive-oil", n: [884, 0, 0, 100] }),
  p("olive-oil-basic", "Olive Oil", "SiCart Basics", "oils", 7.4, "500 ml", { tags: ["olive oil", "oil"], alt: "olive-oil", n: [884, 0, 0, 100] }),
  p("sunflower-oil", "Sunflower Oil", "Golden Field", "oils", 3.3, "1 L", { level: 1, tags: ["sunflower oil", "oil", "cooking oil"], n: [884, 0, 0, 100] }),
];

const BY_ID = new Map(CATALOG.map((product) => [product.id, product]));

export function getProduct(id: string): Product {
  const product = BY_ID.get(id);
  if (!product) throw new Error(`Unknown product: ${id}`);
  return product;
}

export function findProduct(id: string): Product | undefined {
  return BY_ID.get(id);
}

/** Interchangeable products, cheapest first. */
export function alternativesOf(product: Product): Product[] {
  if (!product.altGroup) return [];
  return CATALOG.filter((p) => p.altGroup === product.altGroup && p.id !== product.id).sort(
    (a, b) => a.price - b.price,
  );
}
