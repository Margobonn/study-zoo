import sharp from 'sharp';
import { mkdirSync } from 'fs';

mkdirSync('public/icons', { recursive: true });

const src = 'assets/icon-source.svg';
const sizes = [
  ['public/icons/icon-192.png', 192],
  ['public/icons/icon-512.png', 512],
  ['public/icons/maskable-512.png', 512],
  ['public/apple-touch-icon.png', 180],
  ['public/favicon.png', 32],
];

for (const [out, size] of sizes) {
  await sharp(src, { density: 384 }).resize(size, size).png().toFile(out);
  console.log('wrote', out, size + 'x' + size);
}
