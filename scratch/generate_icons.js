const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, '../android/app/src/main/assets/public/logo-light.jpg');
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

async function generate() {
  if (!fs.existsSync(logoPath)) {
    console.error(`Logo file not found at ${logoPath}`);
    process.exit(1);
  }

  // 1. Generate launcher icons (Legacy, Round, and Adaptive Foreground)
  for (const [density, s] of Object.entries(sizes)) {
    const dir = path.join(resDir, `mipmap-${density}`);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Legacy square launcher icon
    await sharp(logoPath)
      .resize(s.legacy, s.legacy, { fit: 'contain', background: '#FFFFFF' })
      .toFile(path.join(dir, 'ic_launcher.png'));

    // Round launcher icon
    const radius = s.legacy / 2;
    const circleSvg = Buffer.from(
      `<svg width="${s.legacy}" height="${s.legacy}">
        <circle cx="${radius}" cy="${radius}" r="${radius}" fill="#FFFFFF"/>
       </svg>`
    );
    const logoResized = await sharp(logoPath)
      .resize(Math.round(s.legacy * 0.75), Math.round(s.legacy * 0.75), { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .toBuffer();

    await sharp(circleSvg)
      .composite([{ input: logoResized, gravity: 'center' }])
      .png()
      .toFile(path.join(dir, 'ic_launcher_round.png'));

    // Adaptive foreground icon
    const logoForegroundResized = await sharp(logoPath)
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

  // 2. Generate generic drawable splash screen
  const drawDir = path.join(resDir, 'drawable');
  if (!fs.existsSync(drawDir)) {
    fs.mkdirSync(drawDir, { recursive: true });
  }
  const mainSplashLogo = await sharp(logoPath)
    .resize(300, 300, { fit: 'contain', background: '#FFFFFF' })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: '#FFFFFF'
    }
  })
    .composite([{ input: mainSplashLogo, gravity: 'center' }])
    .png()
    .toFile(path.join(drawDir, 'splash.png'));
  console.log('Generated generic drawable/splash.png');

  // 3. Generate density-specific splash screens (Portrait & Landscape)
  for (const [density, s] of Object.entries(splashSizes)) {
    const portDir = path.join(resDir, `drawable-port-${density}`);
    const landDir = path.join(resDir, `drawable-land-${density}`);

    if (!fs.existsSync(portDir)) fs.mkdirSync(portDir, { recursive: true });
    if (!fs.existsSync(landDir)) fs.mkdirSync(landDir, { recursive: true });

    const splashLogo = await sharp(logoPath)
      .resize(s.logo, s.logo, { fit: 'contain', background: '#FFFFFF' })
      .toBuffer();

    // Portrait splash screen
    await sharp({
      create: {
        width: s.port[0],
        height: s.port[1],
        channels: 4,
        background: '#FFFFFF'
      }
    })
      .composite([{ input: splashLogo, gravity: 'center' }])
      .png()
      .toFile(path.join(portDir, 'splash.png'));

    // Landscape splash screen
    await sharp({
      create: {
        width: s.land[0],
        height: s.land[1],
        channels: 4,
        background: '#FFFFFF'
      }
    })
      .composite([{ input: splashLogo, gravity: 'center' }])
      .png()
      .toFile(path.join(landDir, 'splash.png'));

    console.log(`Generated splash screens for drawable-${density}`);
  }
}

generate().catch(console.error);
