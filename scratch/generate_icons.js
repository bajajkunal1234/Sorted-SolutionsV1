const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconSrcPath = path.join(__dirname, '../public/logo-light.jpg');
const splashSrcPath = path.join(__dirname, '../public/New Logo.jpg');
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

async function processImages() {
  if (!fs.existsSync(iconSrcPath)) {
    console.error(`Icon source file not found at ${iconSrcPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(splashSrcPath)) {
    console.error(`Splash source file not found at ${splashSrcPath}`);
    process.exit(1);
  }

  console.log('Extracting transparent foreground for App Icon...');
  // 1. Process App Icon Source (logo-light.jpg) to make it transparent
  const iconRaw = await sharp(iconSrcPath)
    .ensureAlpha()
    .toFormat('png')
    .raw()
    .toBuffer({ resolveWithObject: true });

  const iconData = iconRaw.data;
  for (let i = 0; i < iconData.length; i += 4) {
    const r = iconData[i];
    const g = iconData[i+1];
    const b = iconData[i+2];
    // Convert white/near-white to transparent
    if (r > 200 && g > 200 && b > 200) {
      iconData[i+3] = 0;
    }
  }

  const transparentIconBuffer = await sharp(iconData, {
    raw: {
      width: iconRaw.info.width,
      height: iconRaw.info.height,
      channels: 4
    }
  }).png().toBuffer();

  // 2. Process Splash Source (New Logo.jpg) to generate transparent and inverted versions for Webapp Loader
  console.log('Extracting transparent and inverted versions of New Logo.jpg...');
  const splashRaw = await sharp(splashSrcPath)
    .ensureAlpha()
    .toFormat('png')
    .raw()
    .toBuffer({ resolveWithObject: true });

  const splashData = splashRaw.data;
  for (let i = 0; i < splashData.length; i += 4) {
    const r = splashData[i];
    const g = splashData[i+1];
    const b = splashData[i+2];
    if (r > 200 && g > 200 && b > 200) {
      splashData[i+3] = 0;
    }
  }

  const transparentSplashBuffer = await sharp(splashData, {
    raw: {
      width: splashRaw.info.width,
      height: splashRaw.info.height,
      channels: 4
    }
  }).png().toBuffer();

  // Save transparent logo to public/logo-transparent.png
  await fs.promises.writeFile(path.join(publicDir, 'logo-transparent.png'), transparentSplashBuffer);
  console.log('Saved public/logo-transparent.png');

  // Invert the transparent logo to create a white stamp for dark backgrounds
  const invertedSplashBuffer = await sharp(transparentSplashBuffer)
    .negate({ alpha: false })
    .toBuffer();

  // Save inverted logo to public/logo-inverted.png
  await fs.promises.writeFile(path.join(publicDir, 'logo-inverted.png'), invertedSplashBuffer);
  console.log('Saved public/logo-inverted.png');

  // 3. Generate Android Launcher Icons using the white logo (logo-light.jpg)
  console.log('Generating Android launcher icons...');
  for (const [density, s] of Object.entries(sizes)) {
    const dir = path.join(resDir, `mipmap-${density}`);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Legacy square launcher icon: Transparent logo centered on white background
    await sharp(transparentIconBuffer)
      .resize(s.legacy, s.legacy, { fit: 'contain', background: '#FFFFFF' })
      .toFile(path.join(dir, 'ic_launcher.png'));

    // Round launcher icon: Transparent logo centered on white circle
    const radius = s.legacy / 2;
    const circleSvg = Buffer.from(
      `<svg width="${s.legacy}" height="${s.legacy}">
        <circle cx="${radius}" cy="${radius}" r="${radius}" fill="#FFFFFF"/>
       </svg>`
    );
    const logoResized = await sharp(transparentIconBuffer)
      .resize(Math.round(s.legacy * 0.75), Math.round(s.legacy * 0.75), { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .toBuffer();

    await sharp(circleSvg)
      .composite([{ input: logoResized, gravity: 'center' }])
      .png()
      .toFile(path.join(dir, 'ic_launcher_round.png'));

    // Adaptive foreground icon: Transparent logo centered on transparent background (Android will mask it)
    const logoForegroundResized = await sharp(transparentIconBuffer)
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

  // 4. Generate Android Splash Screens using original New Logo.jpg centered on black background
  console.log('Generating Android splash screens (Black background + original New Logo.jpg)...');
  const drawDir = path.join(resDir, 'drawable');
  if (!fs.existsSync(drawDir)) {
    fs.mkdirSync(drawDir, { recursive: true });
  }

  const mainSplashLogo = await sharp(splashSrcPath)
    .resize(300, 300, { fit: 'contain', background: '#000000' })
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

    const splashLogo = await sharp(splashSrcPath)
      .resize(s.logo, s.logo, { fit: 'contain', background: '#000000' })
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

processImages().catch(console.error);
