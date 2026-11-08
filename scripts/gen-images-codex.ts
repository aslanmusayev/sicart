// Generates one packshot per catalog product with the Codex CLI image tool (needs a ChatGPT Plus login),
// converts it to a 512 px webp in public/products/<id>.webp and refreshes lib/data/images.ts.
// Resumable: products that already have an image are skipped.
//
// Run: npm run images:codex                 (all missing)
//      npm run images:codex -- tomatoes milk (only these ids)
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { CATALOG } from "../lib/data/catalog";
import type { Product } from "../lib/data/types";

const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "products");
const WORK_DIR = join(ROOT, ".image-work"); // gitignored scratch folder for Codex
const CONCURRENCY = Number(process.env.IMAGE_CONCURRENCY ?? 2);
const TIMEOUT_MS = 8 * 60_000;

function prompt(p: Product, file: string): string {
  return [
    `Use your image generation tool to create ONE product image, then save it as a PNG named "${file}" in the current working directory. Do nothing else.`,
    ``,
    `Image: a studio product packshot of "${p.name}" by the invented brand "${p.brand}", pack size ${p.unit}.`,
    `Show it in realistic retail packaging with a simple clean label showing the brand "${p.brand}" and the product name`,
    `(if it is fresh fruit, vegetables or herbs, show the fresh produce itself, loose or in a simple branded tray).`,
    `3/4 view, centered, the product fills about 70% of the frame, soft even studio lighting from the upper left,`,
    `a soft contact shadow under the product, fully transparent background. Photorealistic, premium, consistent`,
    `e-commerce catalogue style, square 1024x1024. No other text, no props, no hands, no people.`,
    ``,
    `When done, reply with only the file path.`,
  ].join("\n");
}

function runCodex(text: string): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn("codex", ["exec", "--skip-git-repo-check", "-s", "workspace-write", "-C", WORK_DIR, "-"], {
      shell: true,
      stdio: ["pipe", "ignore", "ignore"],
    });
    const timer = setTimeout(() => child.kill(), TIMEOUT_MS);
    child.on("exit", (code) => {
      clearTimeout(timer);
      resolve(code ?? 1);
    });
    child.stdin.end(text);
  });
}

function writeManifest(): number {
  const ids = readdirSync(OUT_DIR)
    .filter((f) => f.endsWith(".webp"))
    .map((f) => f.replace(/\.webp$/, ""))
    .filter((id) => CATALOG.some((p) => p.id === id))
    .sort();
  writeFileSync(
    join(ROOT, "lib", "data", "images.ts"),
    [
      "// Products that have a real packshot in public/products/<id>.webp.",
      "// Written by scripts/gen-images-codex.ts. Until an image exists, ProductArt draws a styled tile instead,",
      "// so the app never requests a missing file.",
      `export const PRODUCT_IMAGES: ReadonlySet<string> = new Set<string>(${JSON.stringify(ids)});`,
      "",
    ].join("\n"),
  );
  return ids.length;
}

async function generate(p: Product): Promise<boolean> {
  const file = `${p.id}.png`;
  const src = join(WORK_DIR, file);
  for (let attempt = 1; attempt <= 2; attempt++) {
    rmSync(src, { force: true });
    const code = await runCodex(prompt(p, file));
    if (code === 0 && existsSync(src)) {
      await sharp(src)
        .trim({ threshold: 1 })
        .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 84, alphaQuality: 90 })
        .toFile(join(OUT_DIR, `${p.id}.webp`));
      const total = writeManifest();
      console.log(`ok ${p.id} (${total}/${CATALOG.length})`);
      return true;
    }
    console.warn(`retry ${p.id} (attempt ${attempt}, exit ${code})`);
  }
  console.error(`FAILED ${p.id}`);
  return false;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(WORK_DIR, { recursive: true });
  const only = process.argv.slice(2);
  const todo = CATALOG.filter((p) => (only.length ? only.includes(p.id) : !existsSync(join(OUT_DIR, `${p.id}.webp`))));
  console.log(`${todo.length} images to generate, ${CONCURRENCY} at a time`);
  const queue = [...todo];
  const failed: string[] = [];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let p = queue.shift(); p; p = queue.shift()) if (!(await generate(p))) failed.push(p.id);
    }),
  );
  writeManifest();
  console.log(failed.length ? `done, failed: ${failed.join(", ")}` : "done, all images generated");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
