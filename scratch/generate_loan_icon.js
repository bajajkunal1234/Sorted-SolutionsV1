const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const resDir = path.join(__dirname, '../android/app/src/main/res');
const publicDir = path.join(__dirname, '../public');

const sizes = {
  mdpi: { legacy: 48, foreground: 108 },
  hdpi: { legacy: 72, foreground: 162 },
  xhdpi: { legacy: 96, foreground: 216 },
  xxhdpi: { legacy: 144, foreground: 324 },
  xxxhdpi: { legacy: 192, foreground: 432 }
};

const splashSizes = {
  mdpi: { port: [320, 480], land: [480, 320], logo: 180 },
  hdpi: { port: [480, 800], land: [800, 480], logo: 280 },
  xhdpi: { port: [720, 1280], land: [1280, 720], logo: 400 },
  xxhdpi: { port: [960, 1600], land: [1600, 960], logo: 550 },
  xxxhdpi: { port: [1280, 1920], land: [1920, 1280], logo: 750 }
};

// SVG for the full legacy (square/rounded rectangle) icon
const getLegacyIconSvg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e1b4b" />
    </linearGradient>
    <linearGradient id="coinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
  </defs>
  <!-- Background -->
  <rect width="512" height="512" rx="100" fill="url(#bgGrad)" />
  <!-- Outer Ring -->
  <rect x="24" y="24" width="464" height="464" rx="80" fill="none" stroke="#6366f1" stroke-width="8" opacity="0.3" />
  
  <!-- Loan Symbol / Icon -->
  <g transform="translate(0, -20)">
    <!-- Gold Coin -->
    <circle cx="256" cy="220" r="100" fill="url(#coinGrad)" />
    <circle cx="256" cy="220" r="85" fill="none" stroke="#fef08a" stroke-width="4" stroke-dasharray="8 6" />
    <!-- Rupee Symbol -->
    <text x="256" y="255" font-family="sans-serif" font-weight="900" font-size="110" fill="#ffffff" text-anchor="middle">₹</text>
  </g>
  
  <!-- Text 'LOANS' -->
  <text x="256" y="420" font-family="sans-serif" font-weight="900" font-size="65" fill="#818cf8" letter-spacing="4" text-anchor="middle">LOANS</text>
</svg>
`;

// SVG for the round launcher icon
const getRoundIconSvg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e1b4b" />
    </linearGradient>
    <linearGradient id="coinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
  </defs>
  <!-- Background Circle -->
  <circle cx="256" cy="256" r="256" fill="url(#bgGrad)" />
  <!-- Outer Ring -->
  <circle cx="256" cy="256" r="236" fill="none" stroke="#6366f1" stroke-width="8" opacity="0.3" />
  
  <!-- Loan Symbol / Icon -->
  <g transform="translate(0, -20)">
    <!-- Gold Coin -->
    <circle cx="256" cy="220" r="100" fill="url(#coinGrad)" />
    <circle cx="256" cy="220" r="85" fill="none" stroke="#fef08a" stroke-width="4" stroke-dasharray="8 6" />
    <!-- Rupee Symbol -->
    <text x="256" y="255" font-family="sans-serif" font-weight="900" font-size="110" fill="#ffffff" text-anchor="middle">₹</text>
  </g>
  
  <!-- Text 'LOANS' -->
  <text x="256" y="420" font-family="sans-serif" font-weight="900" font-size="65" fill="#818cf8" letter-spacing="4" text-anchor="middle">LOANS</text>
</svg>
`;

// SVG for the foreground adaptive launcher icon (transparent background)
const getForegroundIconSvg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="coinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
  </defs>
  
  <!-- Loan Symbol / Icon (Scaled down to fit safe zone of adaptive launcher) -->
  <g transform="translate(0, 15)">
    <!-- Gold Coin -->
    <circle cx="256" cy="200" r="100" fill="url(#coinGrad)" />
    <circle cx="256" cy="200" r="85" fill="none" stroke="#fef08a" stroke-width="4" stroke-dasharray="8 6" />
    <!-- Rupee Symbol -->
    <text x="256" y="235" font-family="sans-serif" font-weight="900" font-size="110" fill="#ffffff" text-anchor="middle">₹</text>
  </g>
  
  <!-- Text 'LOANS' -->
  <text x="256" y="380" font-family="sans-serif" font-weight="900" font-size="65" fill="#818cf8" letter-spacing="4" text-anchor="middle">LOANS</text>
</svg>
`;

async function generateAppAssets() {
  console.log('Generating custom New Era Loan tracker app assets...');

  // 1. Generate local Web/PWA App Icons
  const masterLegacyBuffer = await sharp(Buffer.from(getLegacyIconSvg(512))).png().toBuffer();
  
  // Save to public favicon and generic icons
  await fs.promises.writeFile(path.join(publicDir, 'favicon.png'), masterLegacyBuffer);
  await fs.promises.writeFile(path.join(publicDir, 'icon.jpg'), masterLegacyBuffer);
  if (fs.existsSync(path.join(publicDir, 'icons'))) {
    await sharp(masterLegacyBuffer).resize(192, 192).toFile(path.join(publicDir, 'icons/icon-192x192.png'));
    await sharp(masterLegacyBuffer).resize(512, 512).toFile(path.join(publicDir, 'icons/icon-512x512.png'));
  }
  console.log('Generated Web/PWA launcher icons.');

  // 2. Generate Android Launcher Icons
  for (const [density, s] of Object.entries(sizes)) {
    const dir = path.join(resDir, `mipmap-${density}`);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Legacy square launcher icon
    await sharp(Buffer.from(getLegacyIconSvg(512)))
      .resize(s.legacy, s.legacy)
      .png()
      .toFile(path.join(dir, 'ic_launcher.png'));

    // Round launcher icon
    await sharp(Buffer.from(getRoundIconSvg(512)))
      .resize(s.legacy, s.legacy)
      .png()
      .toFile(path.join(dir, 'ic_launcher_round.png'));

    // Adaptive foreground icon
    await sharp(Buffer.from(getForegroundIconSvg(512)))
      .resize(s.foreground, s.foreground)
      .png()
      .toFile(path.join(dir, 'ic_launcher_foreground.png'));

    console.log(`Generated launcher icons for mipmap-${density}`);
  }

  // 3. Generate Splash Screens
  console.log('Generating splash screen assets...');
  const drawDir = path.join(resDir, 'drawable');
  if (!fs.existsSync(drawDir)) {
    fs.mkdirSync(drawDir, { recursive: true });
  }

  // Create a 512x512 generic splash logo
  await sharp(Buffer.from(getLegacyIconSvg(512)))
    .resize(300, 300)
    .toFile(path.join(drawDir, 'splash.png'));
  console.log('Generated drawable/splash.png');

  for (const [density, s] of Object.entries(splashSizes)) {
    const portDir = path.join(resDir, `drawable-port-${density}`);
    const landDir = path.join(resDir, `drawable-land-${density}`);

    if (!fs.existsSync(portDir)) fs.mkdirSync(portDir, { recursive: true });
    if (!fs.existsSync(landDir)) fs.mkdirSync(landDir, { recursive: true });

    const logoResized = await sharp(masterLegacyBuffer)
      .resize(s.logo, s.logo)
      .toBuffer();

    // Portrait splash (Dark blue background)
    await sharp({
      create: {
        width: s.port[0],
        height: s.port[1],
        channels: 4,
        background: '#0f172a'
      }
    })
      .composite([{ input: logoResized, gravity: 'center' }])
      .png()
      .toFile(path.join(portDir, 'splash.png'));

    // Landscape splash (Dark blue background)
    await sharp({
      create: {
        width: s.land[0],
        height: s.land[1],
        channels: 4,
        background: '#0f172a'
      }
    })
      .composite([{ input: logoResized, gravity: 'center' }])
      .png()
      .toFile(path.join(landDir, 'splash.png'));

    console.log(`Generated splash screens for drawable-${density}`);
  }

  console.log('All launcher icons and splash assets successfully updated!');
}

generateAppAssets().catch(console.error);
