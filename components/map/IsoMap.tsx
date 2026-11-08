"use client";
// 2.5D isometric store map (PLAN.md: glowing animated route, cart avatar, pulsing target shelf).
// Plain SVG, no filters (weak-tablet friendly, plan R7): glow = a wide translucent stroke under the line.
import { motion } from "motion/react";
import { useMemo, useRef } from "react";
import { CHECKOUT, COUNTERS, ENTRANCE, GRID, SHELVES } from "@/lib/data/storeMap";
import type { Cell, Rect, Shelf, ShelfId, ZoneId } from "@/lib/data/types";
import { cellCenter, iso, unproject, VIEW, type Point } from "@/lib/map/iso";
import type { Route } from "@/lib/map/route";
import { spring } from "@/lib/ui/motion";

const HEIGHT: Record<Shelf["kind"] | "counter", number> = { rack: 22, wall: 16, fridge: 26, freezer: 12, counter: 14 };

/** Zone accent, used on the visible side of each shelf (same hues as ProductArt). */
const ZONE_INK: Record<ZoneId, string> = {
  produce: "#12b76a",
  bakery: "#f79009",
  meat: "#f04438",
  dairy: "#2e90fa",
  beverages: "#06aed4",
  frozen: "#6172f3",
  household: "#875bf7",
  snacks: "#ef6820",
  breakfast: "#b9772e",
  pantry: "#eaaa08",
  pasta: "#dc9b04",
  sauces: "#d92d20",
};

const pts = (...p: Point[]) => p.map((q) => `${q.sx.toFixed(1)},${q.sy.toFixed(1)}`).join(" ");

function faces(r: Rect, h: number) {
  const B0 = iso(r.x + r.w, r.y);
  const C0 = iso(r.x + r.w, r.y + r.h);
  const D0 = iso(r.x, r.y + r.h);
  const [A1, B1, C1, D1] = [iso(r.x, r.y, h), iso(r.x + r.w, r.y, h), iso(r.x + r.w, r.y + r.h, h), iso(r.x, r.y + r.h, h)];
  return {
    top: pts(A1, B1, C1, D1),
    right: pts(B0, C0, C1, B1), // +x side
    front: pts(D0, C0, C1, D1), // +y side
    topCenter: iso(r.x + r.w / 2, r.y + r.h / 2, h),
  };
}

interface Block {
  key: string;
  rect: Rect;
  height: number;
  shelves: Shelf[];
}

const BLOCKS: Block[] = (() => {
  const byRect = new Map<string, Block>();
  for (const s of SHELVES) {
    const key = `${s.rect.x},${s.rect.y}`;
    const block = byRect.get(key) ?? { key, rect: s.rect, height: HEIGHT[s.kind], shelves: [] };
    block.shelves.push(s);
    byRect.set(key, block);
  }
  const counters = COUNTERS.map((rect, i) => ({ key: `counter-${i}`, rect, height: HEIGHT.counter, shelves: [] as Shelf[] }));
  // painter's order: blocks further back (smaller x+y of their front corner) first
  return [...byRect.values(), ...counters].sort(
    (a, b) => a.rect.x + a.rect.w + a.rect.y + a.rect.h - (b.rect.x + b.rect.w + b.rect.y + b.rect.h),
  );
})();

const FLOOR = pts(iso(1, 1), iso(GRID.width - 1, 1), iso(GRID.width - 1, GRID.height - 1), iso(1, GRID.height - 1));

/** Aisle numbers on the floor, in the cross aisle below the racks. */
const AISLES = Array.from({ length: 9 }, (_, i) => ({ n: i + 1, at: iso(i === 8 ? 35.5 : 4 * (i + 1) - 1, 21.5) }));

interface Props {
  position: Cell;
  route?: Route | null;
  /** Shelf the shopper should go to next: pulses green. */
  targetShelfId?: ShelfId | null;
  /** Demo Control: tap the floor to move the cart. */
  onCellClick?: (cell: Cell) => void;
  className?: string;
}

export function IsoMap({ position, route, targetShelfId, onCellClick, className = "" }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const here = cellCenter(position.x, position.y);

  const routeD = useMemo(() => {
    if (!route || route.path.length < 2) return null;
    return route.path
      .map((c, i) => {
        const p = cellCenter(c.x, c.y);
        return `${i ? "L" : "M"}${p.sx.toFixed(1)} ${p.sy.toFixed(1)}`;
      })
      .join(" ");
  }, [route]);

  const target = targetShelfId ? SHELVES.find((s) => s.id === targetShelfId) : undefined;

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!onCellClick || !svgRef.current) return;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    onCellClick(unproject(p.x, p.y));
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.width} ${VIEW.height}`}
      className={`h-full w-full ${onCellClick ? "cursor-crosshair" : ""} ${className}`}
      onClick={handleClick}
      role="img"
      aria-label="Store map"
    >
      {/* floor */}
      <polygon points={FLOOR} fill="#e9ece6" stroke="#dde1da" strokeWidth={1.5} />
      {AISLES.map((a) => (
        <g key={a.n} transform={`translate(${a.at.sx} ${a.at.sy})`}>
          <ellipse rx={9} ry={5} fill="#ffffff" opacity={0.85} />
          <text textAnchor="middle" dy={3} fontSize={8} fontWeight={600} fill="#87929a">
            {a.n}
          </text>
        </g>
      ))}
      <FloorTag at={cellCenter(ENTRANCE.x, ENTRANCE.y)} label="Entrance" />
      <FloorTag at={cellCenter(CHECKOUT.x, CHECKOUT.y + 2)} label="Checkout" />

      {/* shelves */}
      {BLOCKS.map((b) => {
        const f = faces(b.rect, b.height);
        const isTarget = !!target && b.shelves.some((s) => s.id === target.id);
        const rightZone = (b.shelves.find((s) => s.facing === "W") ?? b.shelves[0])?.zone;
        return (
          <g key={b.key}>
            <polygon points={f.front} fill="#d9ded6" />
            <polygon points={f.right} fill={rightZone ? ZONE_INK[rightZone] : "#cdd3ca"} fillOpacity={rightZone ? 0.28 : 1} />
            <polygon points={f.right} fill="none" stroke="#c9cfc6" strokeWidth={0.6} />
            <polygon points={f.top} fill="#ffffff" stroke="#e2e6df" strokeWidth={0.8} />
            {isTarget && (
              <motion.polygon
                points={f.top}
                fill="#12b76a"
                initial={{ opacity: 0.35 }}
                animate={{ opacity: [0.35, 0.9, 0.35] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
          </g>
        );
      })}

      {/* route: glow + line that draws itself + a flowing highlight */}
      {routeD && (
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={routeD} stroke="#12b76a" strokeOpacity={0.22} strokeWidth={11} />
          <motion.path
            key={routeD}
            d={routeD}
            stroke="#12b76a"
            strokeWidth={3.5}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          />
          <path d={routeD} stroke="#ffffff" strokeWidth={1.6} strokeDasharray="1 10" className="route-flow" />
        </g>
      )}

      {/* numbered stops */}
      {route?.stops.map((s, i) => {
        const p = cellCenter(s.cell.x, s.cell.y);
        return (
          <g key={`${s.shelfId}-${i}`} transform={`translate(${p.sx} ${p.sy - 12})`}>
            <motion.g
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ ...spring.snappy, delay: 0.3 + i * 0.08 }}
            >
              <line x1={0} y1={4} x2={0} y2={12} stroke="#12b76a" strokeWidth={1.5} />
              <circle r={10} fill={i === 0 ? "#12b76a" : "#ffffff"} stroke="#12b76a" strokeWidth={2} />
              <text textAnchor="middle" dy={4} fontSize={11} fontWeight={700} fill={i === 0 ? "#ffffff" : "#027a48"}>
                {i + 1}
              </text>
            </motion.g>
          </g>
        );
      })}

      {/* target shelf label */}
      {target && <ShelfTag key={target.id} shelf={target} />}

      {/* cart avatar */}
      <motion.g initial={false} animate={{ x: here.sx, y: here.sy, scale: 1.45 }} transition={spring.glide}>
        <ellipse rx={11} ry={5.5} fill="#0b1215" opacity={0.12} />
        <motion.circle
          r={12}
          fill="#12b76a"
          initial={{ opacity: 0.35, scale: 1 }}
          animate={{ opacity: [0.35, 0], scale: [1, 2.2] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
        />
        <g transform="translate(0 -9)">
          <circle r={9} fill="#0b1215" />
          <circle r={9} fill="none" stroke="#ffffff" strokeWidth={2} />
          {/* tiny cart glyph */}
          <path d="M-4.5 -3 h1.6 l1.4 5 h5 l1.2 -3.6 h-6.8" fill="none" stroke="#ffffff" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={-1.2} cy={3.6} r={0.9} fill="#ffffff" />
          <circle cx={3} cy={3.6} r={0.9} fill="#ffffff" />
        </g>
      </motion.g>
    </svg>
  );
}

function FloorTag({ at, label }: { at: Point; label: string }) {
  return (
    <g transform={`translate(${at.sx} ${at.sy})`}>
      <rect x={-26} y={-7} width={52} height={14} rx={7} fill="#ffffff" opacity={0.92} />
      <text textAnchor="middle" dy={3.5} fontSize={8} fontWeight={600} fill="#4f5b63">
        {label}
      </text>
    </g>
  );
}

function ShelfTag({ shelf }: { shelf: Shelf }) {
  const top = faces(shelf.rect, HEIGHT[shelf.kind]).topCenter;
  const label = shelf.aisle ? `${shelf.label} · Aisle ${shelf.aisle}` : shelf.label;
  const w = label.length * 7.2 + 24;
  return (
    <g transform={`translate(${top.sx} ${top.sy - 24})`}>
      <motion.g initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft}>
        <rect x={-w / 2} y={-13} width={w} height={26} rx={13} fill="#0b1215" />
        <path d="M-6 12.5 L0 19 L6 12.5 Z" fill="#0b1215" />
        <text textAnchor="middle" dy={4.5} fontSize={13} fontWeight={600} fill="#ffffff">
          {label}
        </text>
      </motion.g>
    </g>
  );
}
