import {
  Beef,
  Carrot,
  Coffee,
  Cookie,
  Croissant,
  CupSoda,
  Egg,
  Fish,
  Leaf,
  Milk,
  Package,
  Snowflake,
  Soup,
  SprayCan,
  Wheat,
} from "lucide-react";
import { PRODUCT_IMAGES } from "@/lib/data/images";
import type { Product, ZoneId } from "@/lib/data/types";

// One consistent look for every product until real packshots exist (PLAN.md R8: placeholders until ready).
const ZONE_ART: Record<ZoneId, { from: string; to: string; ink: string }> = {
  produce: { from: "#ecfdf3", to: "#c9f7dc", ink: "#027a48" },
  bakery: { from: "#fff7e6", to: "#fde3b0", ink: "#a15c07" },
  meat: { from: "#fff1f1", to: "#fdd2d2", ink: "#b42318" },
  dairy: { from: "#eef6ff", to: "#cfe4fd", ink: "#175cd3" },
  beverages: { from: "#ecfbfd", to: "#c4f0f7", ink: "#0e7090" },
  frozen: { from: "#f0f3ff", to: "#d5dcfe", ink: "#3538cd" },
  household: { from: "#f6f2ff", to: "#e2d7fe", ink: "#6927da" },
  snacks: { from: "#fff4ed", to: "#fed9c0", ink: "#c4320a" },
  breakfast: { from: "#fbf6ef", to: "#efdfc8", ink: "#7a4a12" },
  pantry: { from: "#fefbe8", to: "#fbeea3", ink: "#8a6a03" },
  pasta: { from: "#fffaeb", to: "#fde7a8", ink: "#93620a" },
  sauces: { from: "#fff1f0", to: "#fecdca", ink: "#b42318" },
};

/** Static component (no component created during render): picks the icon for a product. */
function ZoneIcon({ product, size }: { product: Product; size: number }) {
  const props = { size, strokeWidth: 1.6 };
  if (product.tags.includes("fish")) return <Fish {...props} />;
  if (product.tags.includes("eggs")) return <Egg {...props} />;
  if (product.shelfId === "spices") return <Leaf {...props} />;
  switch (product.category) {
    case "produce":
      return <Carrot {...props} />;
    case "bakery":
      return <Croissant {...props} />;
    case "meat":
      return <Beef {...props} />;
    case "dairy":
      return <Milk {...props} />;
    case "beverages":
      return <CupSoda {...props} />;
    case "frozen":
      return <Snowflake {...props} />;
    case "household":
      return <SprayCan {...props} />;
    case "snacks":
      return <Cookie {...props} />;
    case "breakfast":
      return <Coffee {...props} />;
    case "pantry":
      return <Package {...props} />;
    case "pasta":
      return <Wheat {...props} />;
    case "sauces":
      return <Soup {...props} />;
  }
}

interface Props {
  product: Product;
  /** Edge length in px. */
  size?: number;
  className?: string;
}

export function ProductArt({ product, size = 64, className = "" }: Props) {
  const radius = Math.round(size * 0.24);
  if (PRODUCT_IMAGES.has(product.id)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- small local webp, no optimisation needed
      <img
        src={product.image}
        alt=""
        width={size}
        height={size}
        className={`shrink-0 bg-white object-contain ${className}`}
        style={{ width: size, height: size, borderRadius: radius }}
        draggable={false}
      />
    );
  }
  const art = ZONE_ART[product.category];
  return (
    <span
      aria-hidden
      className={`relative grid shrink-0 place-items-center overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: `linear-gradient(145deg, ${art.from}, ${art.to})`,
        color: art.ink,
      }}
    >
      <ZoneIcon product={product} size={Math.round(size * 0.46)} />
      <span
        className="absolute inset-x-0 bottom-0 h-1/3"
        style={{ background: "linear-gradient(to top, rgb(255 255 255 / 0.35), transparent)" }}
      />
    </span>
  );
}
