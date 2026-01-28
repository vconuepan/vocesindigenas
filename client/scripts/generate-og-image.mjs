import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

// OG image dimensions (recommended for social sharing)
const WIDTH = 1200;
const HEIGHT = 630;

// Brand colors
const BRAND_700 = '#b91c1c';
const NEUTRAL_800 = '#262626';

async function generateOgImage() {
  const outputPath = path.join(publicDir, 'images', 'og-image.png');

  const textSvg = `
    <svg width="${WIDTH}" height="${HEIGHT}">
      <style>
        .name {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 72px;
          font-weight: 700;
          fill: ${NEUTRAL_800};
        }
        .tagline {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 36px;
          font-weight: 400;
          fill: #525252;
        }
        .highlight {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 28px;
          font-weight: 500;
          fill: ${BRAND_700};
        }
      </style>
      <text x="80" y="240" class="name">Actually Relevant</text>
      <text x="80" y="310" class="tagline">AI-curated news that matters.</text>
      <text x="80" y="380" class="tagline">Stories most relevant to humanity's future.</text>
      <text x="80" y="460" class="highlight">actuallyrelevant.news</text>
    </svg>
  `;

  await sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${WIDTH}" height="8">
            <rect width="${WIDTH}" height="8" fill="${BRAND_700}"/>
          </svg>`
        ),
        top: 0,
        left: 0
      },
      {
        input: Buffer.from(textSvg),
        top: 0,
        left: 0
      }
    ])
    .png()
    .toFile(outputPath);

  console.log(`Generated og-image.png (${WIDTH}x${HEIGHT})`);
}

generateOgImage().catch(console.error);
