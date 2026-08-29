/**
 * Build favicon and apple-touch icons from public/guesthouse-logo.png.
 * Crops the left emblem square, scales, and flattens onto brand cream so
 * browser tabs never show black bars around the transparent logo art.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SOURCE = "public/guesthouse-logo.png";
const BACKGROUND = "#fff8f4";

async function generateMetaIcons() {
  const trimmed = await sharp(SOURCE).trim().toBuffer();
  const { width, height } = await sharp(trimmed).metadata();
  const cropSize = Math.min(width, height);

  const square = sharp(trimmed).extract({
    left: 0,
    top: 0,
    width: cropSize,
    height: cropSize,
  });

  for (const [size, name] of [
    [32, "icon"],
    [180, "apple-icon"],
  ]) {
    const png = await square
      .clone()
      .resize(size, size)
      .flatten({ background: BACKGROUND })
      .png()
      .toBuffer();

    for (const dir of ["app", "public"]) {
      fs.writeFileSync(path.join(dir, `${name}.png`), png);
    }

    console.log(`Wrote ${name}.png (${size}×${size})`);
  }
}

generateMetaIcons().catch((error) => {
  console.error(error);
  process.exit(1);
});
