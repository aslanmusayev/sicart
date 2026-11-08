// Manual end-to-end check of the session API + Realtime against the running dev server.
// Usage: node scripts/smoke-api.mjs [baseUrl]
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const BASE = process.argv[2] ?? "http://localhost:3100";
const CART = 12;
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const received = [];
await new Promise((resolve) => {
  supabase.channel(`cart:${CART}`).on("broadcast", { event: "snapshot" }, ({ payload }) => received.push({ v: payload.version, t: Date.now(), status: payload.status }))
    .subscribe((s) => s === "SUBSCRIBED" && resolve());
});

async function post(action, body = {}, pin = env.DEMO_CONTROL_PIN) {
  const t = Date.now();
  const res = await fetch(`${BASE}/api/session/${CART}/${action}`, { method: "POST", headers: { "content-type": "application/json", "x-demo-pin": pin }, body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok) return { t, status: res.status, error: json.error };
  return { t, status: res.status, s: json };
}
const waitFor = async (v) => { for (let i = 0; i < 40; i++) { const r = received.find((x) => x.v === v); if (r) return r; await new Promise((r) => setTimeout(r, 50)); } return null; };

const steps = [
  ["reset", {}],
  ["connect", { persona: "aysel" }],
  ["add", { productId: "spaghetti" }],
  ["add", { productId: "milk", qty: 2 }],
  ["remove", { productId: "milk" }],
  ["checkout", {}],
  ["pay", {}],
  ["reset", {}],
];
for (const [action, body] of steps) {
  const r = await post(action, body);
  if (r.error) { console.log(`${action.padEnd(9)} HTTP ${r.status} ${r.error}`); continue; }
  const rt = await waitFor(r.s.version);
  const s = r.s;
  const total = s.cart.reduce((a, l) => a + l.qty * l.unitPrice * (1 - l.discountPct / 100), 0).toFixed(2);
  console.log(`${action.padEnd(9)} HTTP ${r.status} v${s.version} ${s.status.padEnd(9)} items=${s.cart.length} total=${total} reco=${s.recommendation?.productId ?? "-"}(${s.recommendation?.discountPct ?? 0}%) pos=${s.position.x},${s.position.y} realtime=${rt ? rt.t - r.t + "ms" : "YOX"}`);
}
console.log("--- guards ---");
console.log("add wrong pin   ->", (await post("add", { productId: "milk" }, "0000")).status);
console.log("add when idle   ->", (await post("add", { productId: "milk" })).status, (await post("add", { productId: "milk" })).error);
console.log("unknown product ->", (await post("connect", { persona: "aysel" })).status, (await post("add", { productId: "caviar" })).error);
await post("reset");
process.exit(0);
