// Pairing graph for recommendations: product -> products that go well with it, weight 0..1.
// The scorer (lib/reco/score.ts) adds a purchase-history boost and an offer boost on top.

export interface Pairing {
  to: string;
  weight: number;
}

export const PAIRINGS: Record<string, Pairing[]> = {
  spaghetti: [
    { to: "tomato-basil-sauce", weight: 0.9 },
    { to: "grana-padano", weight: 0.7 },
    { to: "pecorino", weight: 0.6 },
    { to: "basil", weight: 0.5 },
  ],
  "spaghetti-basic": [
    { to: "tomato-basil-sauce", weight: 0.9 },
    { to: "grana-padano", weight: 0.7 },
    { to: "basil", weight: 0.5 },
  ],
  penne: [
    { to: "tomato-basil-sauce", weight: 0.8 },
    { to: "basil-pesto", weight: 0.7 },
    { to: "grana-padano", weight: 0.6 },
  ],
  pancetta: [
    { to: "pecorino", weight: 0.9 },
    { to: "spaghetti", weight: 0.8 },
    { to: "eggs-free-range", weight: 0.7 },
  ],
  guanciale: [
    { to: "pecorino-dop", weight: 0.9 },
    { to: "spaghetti", weight: 0.8 },
    { to: "eggs-free-range", weight: 0.7 },
  ],
  pecorino: [
    { to: "black-pepper", weight: 0.6 },
    { to: "spaghetti", weight: 0.7 },
  ],
  "pecorino-dop": [
    { to: "black-pepper", weight: 0.6 },
    { to: "spaghetti", weight: 0.7 },
  ],
  "tomato-basil-sauce": [
    { to: "spaghetti", weight: 0.8 },
    { to: "grana-padano", weight: 0.7 },
    { to: "basil", weight: 0.5 },
  ],
  tomatoes: [
    { to: "feta", weight: 0.8 },
    { to: "cucumbers", weight: 0.7 },
    { to: "olive-oil", weight: 0.6 },
    { to: "red-onions", weight: 0.5 },
  ],
  cucumbers: [
    { to: "tomatoes", weight: 0.7 },
    { to: "feta", weight: 0.6 },
    { to: "greek-yogurt", weight: 0.4 },
  ],
  feta: [
    { to: "kalamata-olives", weight: 0.8 },
    { to: "tomatoes", weight: 0.7 },
    { to: "dried-oregano", weight: 0.5 },
  ],
  "eggs-free-range": [
    { to: "butter", weight: 0.5 },
    { to: "sourdough", weight: 0.5 },
    { to: "milk", weight: 0.4 },
  ],
  "eggs-basic": [
    { to: "butter", weight: 0.5 },
    { to: "sourdough", weight: 0.5 },
  ],
  milk: [
    { to: "rolled-oats", weight: 0.6 },
    { to: "honey-granola", weight: 0.5 },
    { to: "croissants", weight: 0.4 },
  ],
  "basmati-rice": [
    { to: "saffron", weight: 0.8 },
    { to: "lamb-shoulder", weight: 0.6 },
    { to: "butter", weight: 0.6 },
    { to: "dried-apricots", weight: 0.5 },
  ],
  "lamb-shoulder": [
    { to: "basmati-rice", weight: 0.8 },
    { to: "saffron", weight: 0.6 },
    { to: "yellow-onions", weight: 0.6 },
  ],
  "chicken-breast": [
    { to: "lemons", weight: 0.6 },
    { to: "garlic", weight: 0.5 },
    { to: "long-grain-rice", weight: 0.5 },
  ],
  salmon: [
    { to: "lemons", weight: 0.8 },
    { to: "olive-oil", weight: 0.5 },
  ],
  sourdough: [
    { to: "butter", weight: 0.6 },
    { to: "sour-cherry-jam", weight: 0.5 },
  ],
  croissants: [
    { to: "orange-juice", weight: 0.6 },
    { to: "espresso-beans", weight: 0.5 },
  ],
  "black-tea": [
    { to: "pakhlava", weight: 0.7 },
    { to: "sour-cherry-jam", weight: 0.6 },
    { to: "lemons", weight: 0.6 },
  ],
  pakhlava: [{ to: "black-tea", weight: 0.8 }],
  "wheat-flour": [
    { to: "baking-powder", weight: 0.7 },
    { to: "eggs-basic", weight: 0.6 },
    { to: "sugar", weight: 0.6 },
  ],
  bananas: [
    { to: "greek-yogurt", weight: 0.5 },
    { to: "honey-granola", weight: 0.5 },
  ],
  "greek-yogurt": [
    { to: "mountain-honey", weight: 0.7 },
    { to: "honey-granola", weight: 0.6 },
  ],
  "espresso-beans": [
    { to: "milk", weight: 0.6 },
    { to: "butter-cookies", weight: 0.5 },
  ],
  "ground-coffee": [
    { to: "milk", weight: 0.6 },
    { to: "butter-cookies", weight: 0.5 },
  ],
  "pizza-margherita": [{ to: "cola", weight: 0.6 }],
  "sea-salt-chips": [{ to: "cola", weight: 0.6 }],
};
