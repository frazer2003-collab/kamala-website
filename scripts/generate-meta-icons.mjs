/**
 * Build favicon and apple-touch icons from public/guesthouse-logo.png.
 * Fits the full trimmed logo inside a square canvas (contain) with a
 * transparent background so the whole mark stays visible at its aspect ratio.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SOURCE = "public/guesthouse-logo.png";
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

async function generateMetaIcons() {
  const trimmed = await sharp(SOURCE).trim().ensureAlpha().toBuffer();
  const { width, height } = await sharp(trimmed).metadata();
  console.log(`Source trimmed to ${width}×${height}`);

  for (const [size, name] of [
    [32, "icon"],
    [180, "apple-icon"],
  ]) {
    const png = await sharp(trimmed)
      .resize(size, size, {
        fit: "contain",
        background: TRANSPARENT,
      })
      .ensureAlpha()
      .png()
      .toBuffer();

    for (const dir of ["app", "public"]) {
      fs.writeFileSync(path.join(dir, `${name}.png`), png);
    }

    console.log(`Wrote ${name}.png (${size}×${size}, contain)`);
  }
}

generateMetaIcons().catch((error) => {
  console.error(error);
  process.exit(1);
});
