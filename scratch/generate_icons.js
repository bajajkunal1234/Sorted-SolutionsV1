const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, '../public/New Logo.jpg');
const resDir = path.join(__dirname, '../android/app/src/main/res');

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

async function processImage() {
  if (!fs.existsSync(logoPath)) {
    console.error(`Logo file not found at ${logoPath}`);
    process.exit(1);
  }

  // 1. Load the original logo and make it transparent (removing white background)
  const originalLogoBuffer = await sharp(logoPath)
    .ensureAlpha()
    .toFormat('png')
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = originalLogoBuffer;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i+1];
    const b = data[i+2];
    // Threshold to convert white/near-white to transparent
    if (r > 200 && g > 200 && b > 200) {
      data[i+3] = 0; // Set alpha to 0 (transparent)
    }
  }

  const transparentLogo = sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4
    }
  });

  const transparentLogoBuffer = await transparentLogo.png().toBuffer();

  // 2. Load the logo and invert it for the dark splash screen (white stamp on transparent background)
  const invertedLogoBuffer = await sharp(transparentLogoBuffer)
    .negate({ alpha: false }) // Invert colors, keep alpha channel intact
    .toBuffer();

  // 3. Generate launcher icons (Legacy, Round, and Adaptive Foreground)
  for (const [density, s] of Object.entries(sizes)) {
    const dir = path.join(resDir, `mipmap-${density}`);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Legacy square launcher icon: Transparent logo centered on white background
    await sharp(transparentLogoBuffer)
      .resize(s.legacy, s.legacy, { fit: 'contain', background: '#FFFFFF' })
      .toFile(path.join(dir, 'ic_launcher.png'));

    // Round launcher icon: Transparent logo centered on white circle
    const radius = s.legacy / 2;
    const circleSvg = Buffer.from(
      `<svg width="${s.legacy}" height="${s.legacy}">
        <circle cx="${radius}" cy="${radius}" r="${radius}" fill="#FFFFFF"/>
       </svg>`
    );
    const logoResized = await sharp(transparentLogoBuffer)
      .resize(Math.round(s.legacy * 0.75), Math.round(s.legacy * 0.75), { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .toBuffer();

    await sharp(circleSvg)
      .composite([{ input: logoResized, gravity: 'center' }])
      .png()
      .toFile(path.join(dir, 'ic_launcher_round.png'));

    // Adaptive foreground icon: ONLY the transparent logo centered on a transparent background
    const logoForegroundResized = await sharp(transparentLogoBuffer)
      .resize(Math.round(s.foreground * 0.65), Math.round(s.foreground * 0.65), { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .toBuffer();

    await sharp({
      create: {
        width: s.foreground,
        height: s.foreground,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      }
    })
      .composite([{ input: logoForegroundResized, gravity: 'center' }])
      .png()
      .toFile(path.join(dir, 'ic_launcher_foreground.png'));

    console.log(`Generated launcher icons for mipmap-${density}`);
  }

  // 4. Generate splash screens (Black background, centered inverted white logo)
  const drawDir = path.join(resDir, 'drawable');
  if (!fs.existsSync(drawDir)) {
    fs.mkdirSync(drawDir, { recursive: true });
  }

  const mainSplashLogo = await sharp(invertedLogoBuffer)
    .resize(300, 300, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: '#000000'
    }
  })
    .composite([{ input: mainSplashLogo, gravity: 'center' }])
    .png()
    .toFile(path.join(drawDir, 'splash.png'));
  console.log('Generated generic drawable/splash.png');

  for (const [density, s] of Object.entries(splashSizes)) {
    const portDir = path.join(resDir, `drawable-port-${density}`);
    const landDir = path.join(resDir, `drawable-land-${density}`);

    if (!fs.existsSync(portDir)) fs.mkdirSync(portDir, { recursive: true });
    if (!fs.existsSync(landDir)) fs.mkdirSync(landDir, { recursive: true });

    const splashLogo = await sharp(invertedLogoBuffer)
      .resize(s.logo, s.logo, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    // Portrait splash screen (Black background)
    await sharp({
      create: {
        width: s.port[0],
        height: s.port[1],
        channels: 4,
        background: '#000000'
      }
    })
      .composite([{ input: splashLogo, gravity: 'center' }])
      .png()
      .toFile(path.join(portDir, 'splash.png'));

    // Landscape splash screen (Black background)
    await sharp({
      create: {
        width: s.land[0],
        height: s.land[1],
        channels: 4,
        background: '#000000'
      }
    })
      .composite([{ input: splashLogo, gravity: 'center' }])
      .png()
      .toFile(path.join(landDir, 'splash.png'));

    console.log(`Generated splash screens for drawable-${density}`);
  }
}

processImage().catch(console.error);
