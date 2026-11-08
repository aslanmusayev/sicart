// Seeded demo personas (PLAN.md: Aysel = regular shopper with history and offers, Murad = accessibility user)
// plus store-wide "Today's deals". supabase/seed.sql is generated from this file (scripts/gen-seed.ts),
// so the database and the static data cannot drift apart.

export type PersonaKey = "aysel" | "murad";

export interface PersonaOffer {
  productId: string;
  discountPct: number;
  reason: string;
}

export interface Persona {
  key: PersonaKey;
  name: string;
  avatar: string;
  a11yMode: boolean;
  /** One line shown under the name on the persona picker. */
  tagline: string;
  /** Purchase history: how many times bought, and how many days ago the last time. */
  history: { productId: string; count: number; daysAgo: number }[];
  weeklyList: { productId: string; qty: number }[];
  offers: PersonaOffer[];
}

export const PERSONAS: Persona[] = [
  {
    key: "aysel",
    name: "Aysel",
    avatar: "/avatars/aysel.webp",
    a11yMode: false,
    tagline: "Weekly shop, loves pasta night",
    history: [
      { productId: "milk", count: 21, daysAgo: 6 },
      { productId: "sourdough", count: 15, daysAgo: 6 },
      { productId: "spaghetti", count: 14, daysAgo: 13 },
      { productId: "tomatoes", count: 13, daysAgo: 6 },
      { productId: "eggs-free-range", count: 12, daysAgo: 6 },
      { productId: "bananas", count: 11, daysAgo: 6 },
      { productId: "greek-yogurt", count: 10, daysAgo: 6 },
      { productId: "tomato-basil-sauce", count: 9, daysAgo: 13 },
      { productId: "cucumbers", count: 9, daysAgo: 13 },
      { productId: "ayran", count: 8, daysAgo: 6 },
      { productId: "feta", count: 7, daysAgo: 20 },
      { productId: "grana-padano", count: 6, daysAgo: 13 },
      { productId: "black-tea", count: 5, daysAgo: 27 },
      { productId: "olive-oil", count: 3, daysAgo: 34 },
    ],
    weeklyList: [
      { productId: "milk", qty: 2 },
      { productId: "eggs-free-range", qty: 1 },
      { productId: "sourdough", qty: 1 },
      { productId: "bananas", qty: 1 },
      { productId: "greek-yogurt", qty: 2 },
      { productId: "tomatoes", qty: 1 },
      { productId: "black-tea", qty: 1 },
    ],
    offers: [
      { productId: "tomato-basil-sauce", discountPct: 20, reason: "You pick this up every other week" },
      { productId: "grana-padano", discountPct: 15, reason: "Your go-to pasta cheese" },
      { productId: "mountain-honey", discountPct: 10, reason: "Pairs with your Greek yogurt" },
    ],
  },
  {
    key: "murad",
    name: "Murad",
    avatar: "/avatars/murad.webp",
    a11yMode: true,
    tagline: "Shops by voice, high contrast",
    history: [
      { productId: "black-tea", count: 18, daysAgo: 5 },
      { productId: "lavash", count: 16, daysAgo: 5 },
      { productId: "ayran", count: 14, daysAgo: 5 },
      { productId: "apples", count: 9, daysAgo: 12 },
      { productId: "chicken-breast", count: 7, daysAgo: 12 },
      { productId: "basmati-rice", count: 4, daysAgo: 26 },
      { productId: "sour-cherry-jam", count: 4, daysAgo: 19 },
    ],
    weeklyList: [
      { productId: "lavash", qty: 1 },
      { productId: "ayran", qty: 2 },
      { productId: "apples", qty: 1 },
      { productId: "chicken-breast", qty: 1 },
    ],
    offers: [
      { productId: "black-tea", discountPct: 10, reason: "Your favourite tea" },
      { productId: "sour-cherry-jam", discountPct: 15, reason: "Goes with your tea" },
      { productId: "basmati-rice", discountPct: 10, reason: "Time to restock" },
    ],
  },
];

/** Store-wide deals for everyone (profile_id = null). Shown on the attract screen carousel. */
export const TODAYS_DEALS: PersonaOffer[] = [
  { productId: "pakhlava", discountPct: 25, reason: "Weekend treat" },
  { productId: "espresso-beans", discountPct: 20, reason: "Roasted this week" },
  { productId: "olive-oil", discountPct: 15, reason: "Harvest special" },
  { productId: "pomegranate-juice", discountPct: 10, reason: "Fresh from Goychay" },
  { productId: "hazelnuts", discountPct: 15, reason: "Gabala harvest" },
];

export function getPersona(key: PersonaKey): Persona {
  const persona = PERSONAS.find((p) => p.key === key);
  if (!persona) throw new Error(`Unknown persona: ${key}`);
  return persona;
}
