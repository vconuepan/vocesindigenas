import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import { BRAND } from '../src/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

// OG image dimensions (recommended for social sharing)
const WIDTH = 1200;
const HEIGHT = 630;

// Brand colors (from tailwind.config.js)
const BRAND_500 = '#ec268f';
const NEUTRAL_600 = '#525252';

async function generateOgImage() {
  const outputPath = path.join(publicDir, 'images', 'og-image.png');
  const logoPath = path.join(publicDir, 'images', 'logo-text-horizontal.png');

  // Resize logo large — OG images are displayed small, so fill the space
  const LOGO_WIDTH = 650;
  const logo = await sharp(logoPath)
    .resize({ width: LOGO_WIDTH })
    .toBuffer();

  const logoMeta = await sharp(logo).metadata();
  const logoHeight = logoMeta.height || 260;

  // Center the logo horizontally, position near top
  const logoLeft = Math.round((WIDTH - LOGO_WIDTH) / 2);
  const logoTop = 55;

  // Taglines positioned below logo with tighter spacing
  const taglineY = logoTop + logoHeight + 60;
  const subtitleY = taglineY + 60;
  const urlY = subtitleY + 70;

  // Strip trailing period for display
  const claim = BRAND.claim.replace(/\.$/, '');
  const claimSupport = BRAND.claimSupport.replace(/\.$/, '');

  const textSvg = `
    <svg width="${WIDTH}" height="${HEIGHT}">
      <style>
        .tagline {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 56px;
          font-weight: 500;
          fill: ${NEUTRAL_600};
        }
        .subtitle {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 38px;
          font-weight: 400;
          fill: #737373;
        }
        .url {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 32px;
          font-weight: 500;
          fill: ${BRAND_500};
        }
      </style>
      <text x="${WIDTH / 2}" y="${taglineY}" text-anchor="middle" class="tagline">${claim}</text>
      <text x="${WIDTH / 2}" y="${subtitleY}" text-anchor="middle" class="subtitle">${claimSupport}</text>
      <text x="${WIDTH / 2}" y="${urlY}" text-anchor="middle" class="url">actuallyrelevant.news</text>
    </svg>
  `;

  // Color strip at top using the 4 issue area colors
  const STRIP_HEIGHT = 20;
  const ISSUE_COLORS = ['#fbbf24', '#2dd4bf', '#f87171', '#818cf8'];
  const segmentWidth = WIDTH / ISSUE_COLORS.length;
  const topStrip = Buffer.from(
    `<svg width="${WIDTH}" height="${STRIP_HEIGHT}">
      ${ISSUE_COLORS.map((color, i) =>
        `<rect x="${i * segmentWidth}" width="${segmentWidth}" height="${STRIP_HEIGHT}" fill="${color}"/>`
      ).join('\n      ')}
    </svg>`
  );

  await sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
    .composite([
      { input: topStrip, top: 0, left: 0 },
      { input: logo, top: logoTop, left: logoLeft },
      { input: Buffer.from(textSvg), top: 0, left: 0 }
    ])
    .png()
    .toFile(outputPath);

  console.log(`Generated og-image.png (${WIDTH}x${HEIGHT})`);
}

generateOgImage().catch(console.error);
