// Booth stress test (PLAN.md Day 6): many taps at once must never lose an update.
// Usage: node scripts/stress.mjs [baseUrl] [parallel]
import { readFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const PARALLEL = Number(process.argv[3] ?? 30);
const CART = 12;
const PIN = readFileSync(".env.local", "utf8").match(/^DEMO_CONTROL_PIN=(.*)$/m)[1].trim();
const PRODUCTS = ["milk", "spaghetti", "tomatoes", "bananas", "sourdough", "feta", "pecorino", "lavash", "ayran", "black-tea"];

async function post(action, body = {}) {
  const t = performance.now();
  const res = await fetch(`${BASE}/api/session/${CART}/${action}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-demo-pin": PIN },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ms: performance.now() - t, json };
}
const pct = (arr, p) => [...arr].sort((a, b) => a - b)[Math.min(arr.length - 1, Math.floor((p / 100) * arr.length))];
const items = (s) => s.cart.reduce((n, l) => n + l.qty, 0);

console.log(`target ${BASE}, cart ${CART}`);
await post("connect", { persona: "aysel" });

// 1) everything at once
const burst = await Promise.all(Array.from({ length: PARALLEL }, (_, i) => post("add", { productId: PRODUCTS[i % PRODUCTS.length] })));
const ok = burst.filter((r) => r.status === 200);
const snap = await fetch(`${BASE}/api/session/${CART}`).then((r) => r.json());
const codes = burst.reduce((m, r) => ((m[r.status] = (m[r.status] ?? 0) + 1), m), {});
console.log(`\n[parallel x${PARALLEL}] status codes:`, codes);
console.log(`  latency p50 ${pct(burst.map((r) => r.ms), 50).toFixed(0)} ms, p95 ${pct(burst.map((r) => r.ms), 95).toFixed(0)} ms`);
console.log(`  cart holds ${items(snap)} items for ${ok.length} successful adds -> ${items(snap) === ok.length ? "NO LOST UPDATES" : "LOST UPDATES!"}`);

// 2) a fast operator: back-to-back taps
await post("connect", { persona: "aysel" });
const seq = [];
for (let i = 0; i < 20; i++) seq.push(await post("add", { productId: PRODUCTS[i % PRODUCTS.length] }));
const snap2 = await fetch(`${BASE}/api/session/${CART}`).then((r) => r.json());
console.log(`\n[sequential x20] all 200: ${seq.every((r) => r.status === 200)}, p50 ${pct(seq.map((r) => r.ms), 50).toFixed(0)} ms, p95 ${pct(seq.map((r) => r.ms), 95).toFixed(0)} ms, cart ${items(snap2)} items`);

await post("reset");
console.log("\ncart reset");
