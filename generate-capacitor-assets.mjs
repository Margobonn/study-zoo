import sharp from 'sharp';

// Flat icon (used for older Android / iOS / fallback)
await sharp('assets/icon-source.svg', { density: 384 }).resize(1024, 1024).png().toFile('assets/icon.png');

// Adaptive icon layers (Android 8+)
await sharp('assets/icon-foreground.svg', { density: 384 }).resize(1024, 1024).png().toFile('assets/icon-foreground.png');
await sharp('assets/icon-background.svg', { density: 384 }).resize(1024, 1024).png().toFile('assets/icon-background.png');

// Splash screen: paw print centered on the brand gradient, 2732x2732
const splashSvg = `
<svg width="2732" height="2732" viewBox="0 0 2732 2732" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ff8a5c"/>
      <stop offset="100%" stop-color="#e56f42"/>
    </linearGradient>
  </defs>
  <rect width="2732" height="2732" fill="url(#bg)"/>
  <g fill="#fffaf5" transform="translate(1366 1366) scale(2.0) translate(-512 -512)">
    <ellipse cx="512" cy="650" rx="220" ry="180"/>
    <circle cx="300" cy="390" r="95"/>
    <circle cx="430" cy="295" r="100"/>
    <circle cx="594" cy="295" r="100"/>
    <circle cx="724" cy="390" r="95"/>
  </g>
</svg>`;
await sharp(Buffer.from(splashSvg), { density: 384 }).resize(2732, 2732).png().toFile('assets/splash.png');
await sharp(Buffer.from(splashSvg), { density: 384 }).resize(2732, 2732).png().toFile('assets/splash-dark.png');

console.log('done');
