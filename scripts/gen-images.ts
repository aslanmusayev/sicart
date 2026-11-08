// Generates one packshot per catalog product in a single consistent style, then saves a 512 px webp
// to public/products/<id>.webp. Skips products that already have an image, so it can be re-run.
//
// Run: npm run images            (all missing)
//      npm run images -- tomatoes pecorino   (only these ids)
//
// Needs GEMINI_API_KEY in .env.local on a project with BILLING ENABLED: the free tier has no quota for image models.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { CATALOG } from "../lib/data/catalog";
import type { Product } from "../lib/data/types";

const MODEL = process.env.IMAGE_MODEL ?? "gemini-3.1-flash-image";
const CONCURRENCY = 3;
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "products");

const env = readFileSync(join(ROOT, ".env.local"), "utf8");
const KEY = env.match(/^GEMINI_API_KEY=(.*)$/m)?.[1]?.trim();
if (!KEY) throw new Error("GEMINI_API_KEY is missing in .env.local");

export function imagePrompt(p: Product): string {
  return [
    `Studio product packshot of "${p.name}" by the invented brand "${p.brand}", pack size ${p.unit}.`,
    `Show the product in realistic retail packaging (or loose and fresh if it is fruit or vegetables),`,
    `with a simple clean label showing the brand "${p.brand}".`,
    `3/4 view, centered, the product fills about 70% of the frame. Soft even studio lighting from the upper left,`,
    `a soft contact shadow under the product, pure white #FFFFFF seamless background.`,
    `Photorealistic, premium, consistent e-commerce catalogue style, square image.`,
    `No other text, no props, no hands, no people.`,
  ].join(" ");
}

async function generate(p: Product): Promise<void> {
  const out = join(OUT_DIR, `${p.id}.webp`);
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": KEY!, "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: imagePrompt(p) }] }],
          generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "1:1" } },
        }),
      },
    );
    const json = await res.json();
    if (json.error) {
      console.warn(`  ${p.id}: attempt ${attempt} failed: ${json.error.code} ${json.error.message.split("\n")[0]}`);
      if (json.error.code === 429 && /limit: 0/.test(json.error.message)) {
        throw new Error("No image quota on this key (free tier). Enable billing for the Gemini project.");
      }
      await new Promise((r) => setTimeout(r, 4000 * attempt));
      continue;
    }
    const part = json.candidates?.[0]?.content?.parts?.find((x: { inlineData?: unknown }) => x.inlineData);
    if (!part) {
      console.warn(`  ${p.id}: attempt ${attempt} returned no image`);
      continue;
    }
    const buf = Buffer.from(part.inlineData.data, "base64");
    await sharp(buf).resize(512, 512, { fit: "contain", background: "#ffffff" }).webp({ quality: 82 }).toFile(out);
    console.log(`  ok ${p.id}`);
    return;
  }
  console.error(`  FAILED ${p.id}`);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const only = process.argv.slice(2);
  const todo = CATALOG.filter((p) => (only.length ? only.includes(p.id) : !existsSync(join(OUT_DIR, `${p.id}.webp`))));
  writeFileSync(join(ROOT, "scripts", "image-prompts.txt"), CATALOG.map((p) => `${p.id}\t${imagePrompt(p)}`).join("\n") + "\n");
  console.log(`${todo.length} images to generate with ${MODEL}`);
  const queue = [...todo];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let p = queue.shift(); p; p = queue.shift()) await generate(p);
    }),
  );
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
