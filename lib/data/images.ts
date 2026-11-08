// Products that have a real packshot in public/products/<id>.webp.
// Written by scripts/gen-images-codex.ts. Until an image exists, ProductArt draws a styled tile instead,
// so the app never requests a missing file.
export const PRODUCT_IMAGES: ReadonlySet<string> = new Set<string>(["apples","bananas","basil","carrots","chicken-breast","croissants","cucumbers","garlic","guanciale","lavash","lemons","pancetta","pecorino","red-onions","sourdough","tomatoes","yellow-onions"]);
