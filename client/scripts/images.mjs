import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join, relative, basename, extname } from 'path';
import { readdirSync, statSync, existsSync, mkdirSync, rmSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const IMAGES_DIR = join(__dirname, '../public/images');
const OPTIMIZED_DIR = join(IMAGES_DIR, 'optimized');

// Size presets (in pixels)
const PRESETS = {
  'thumb': 80,
  'small': 160,
  'medium': 320,
  'large': 640,
  'xlarge': 1024
};

// Supported image extensions (skip SVG - already vector)
const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const SKIP_EXTENSIONS = ['.svg', '.gif', '.ico'];

/**
 * Recursively find all images in a directory
 */
function findImages(dir, baseDir = dir) {
  const images = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip the optimized directory
      if (fullPath === OPTIMIZED_DIR) continue;
      images.push(...findImages(fullPath, baseDir));
    } else {
      const ext = extname(entry).toLowerCase();
      if (SUPPORTED_EXTENSIONS.includes(ext)) {
        images.push({
          path: fullPath,
          relativePath: relative(baseDir, fullPath),
          name: basename(entry, ext),
          ext
        });
      }
    }
  }

  return images;
}

/**
 * Get image metadata
 */
async function analyzeImage(imagePath) {
  try {
    const metadata = await sharp(imagePath).metadata();
    const stat = statSync(imagePath);

    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      sizeBytes: stat.size,
      sizeKB: Math.round(stat.size / 1024)
    };
  } catch (error) {
    throw new Error(`Failed to analyze ${imagePath}: ${error.message}`);
  }
}

/**
 * Get the output path for an optimized variant
 */
function getOptimizedPath(image, preset, orientation) {
  const dir = dirname(image.relativePath);
  const outputDir = dir === '.'
    ? OPTIMIZED_DIR
    : join(OPTIMIZED_DIR, dir);

  return join(outputDir, `${image.name}-${preset}-${orientation}.webp`);
}

/**
 * Generate a single optimized variant
 */
async function generateVariant(imagePath, outputPath, size, orientation) {
  try {
    // Ensure output directory exists
    const outputDir = dirname(outputPath);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const resizeOptions = orientation === 'w'
      ? { width: size }
      : { height: size };

    await sharp(imagePath)
      .resize(resizeOptions)
      .webp({ quality: 80 })
      .toFile(outputPath);

    const stat = statSync(outputPath);
    return {
      path: outputPath,
      sizeBytes: stat.size,
      sizeKB: Math.round(stat.size / 1024)
    };
  } catch (error) {
    throw new Error(`Failed to generate ${outputPath}: ${error.message}`);
  }
}

/**
 * Get existing variants for an image
 */
function getExistingVariants(image) {
  const variants = [];

  for (const [preset, size] of Object.entries(PRESETS)) {
    for (const orientation of ['w', 'h']) {
      const outputPath = getOptimizedPath(image, preset, orientation);
      if (existsSync(outputPath)) {
        const stat = statSync(outputPath);
        variants.push({
          preset,
          orientation,
          size,
          path: outputPath,
          relativePath: relative(IMAGES_DIR, outputPath),
          sizeKB: Math.round(stat.size / 1024)
        });
      }
    }
  }

  return variants;
}

/**
 * Get missing variants for an image
 */
function getMissingVariants(image, existingVariants) {
  const existing = new Set(existingVariants.map(v => `${v.preset}-${v.orientation}`));
  const missing = [];

  for (const preset of Object.keys(PRESETS)) {
    for (const orientation of ['w', 'h']) {
      const key = `${preset}-${orientation}`;
      if (!existing.has(key)) {
        missing.push({ preset, orientation });
      }
    }
  }

  return missing;
}

/**
 * Format file size for display
 */
function formatSize(kb) {
  if (kb >= 1024) {
    return `${(kb / 1024).toFixed(1)}MB`;
  }
  return `${kb}KB`;
}

// ============ CLI Commands ============

/**
 * Show info about all images
 */
async function showInfo() {
  if (!existsSync(IMAGES_DIR)) {
    console.log('No images directory found at:', IMAGES_DIR);
    console.log('Create it and add images to get started.');
    return;
  }

  console.log('Image Analysis Report');
  console.log('=====================\n');

  const images = findImages(IMAGES_DIR);
  let totalOriginalKB = 0;
  let totalOptimizedKB = 0;

  for (const image of images) {
    const analysis = await analyzeImage(image.path);
    const variants = getExistingVariants(image);
    const missing = getMissingVariants(image, variants);

    totalOriginalKB += analysis.sizeKB;

    // Determine aspect ratio label
    const aspectLabel = analysis.width > analysis.height ? 'landscape'
      : analysis.width < analysis.height ? 'portrait'
      : 'square';

    console.log(`${image.relativePath} (${aspectLabel}: ${analysis.width}x${analysis.height})`);
    console.log(`  Original: ${formatSize(analysis.sizeKB)}`);

    if (variants.length > 0) {
      console.log('  Optimized variants:');
      for (const v of variants) {
        totalOptimizedKB += v.sizeKB;
        const sizeLabel = v.orientation === 'w' ? `${v.size}px wide` : `${v.size}px tall`;
        console.log(`    - ${v.preset}-${v.orientation} (${sizeLabel}): ${formatSize(v.sizeKB)}  /${v.relativePath}`);
      }
    }

    if (missing.length > 0) {
      console.log(`  Missing: ${missing.map(m => `${m.preset}-${m.orientation}`).join(', ')}`);
    }

    console.log('');
  }

  console.log('---');
  console.log(`Total: ${images.length} images`);
  console.log(`Original size: ${formatSize(totalOriginalKB)}`);
  if (totalOptimizedKB > 0) {
    console.log(`Optimized size: ${formatSize(totalOptimizedKB)}`);
  }
}

/**
 * Optimize all images (generate missing variants)
 */
async function optimizeAll() {
  if (!existsSync(IMAGES_DIR)) {
    console.log('No images directory found at:', IMAGES_DIR);
    console.log('Create it and add images to get started.');
    return;
  }

  console.log('Optimizing all images...\n');

  const images = findImages(IMAGES_DIR);
  let generated = 0;
  let skipped = 0;

  for (const image of images) {
    const analysis = await analyzeImage(image.path);
    const variants = getExistingVariants(image);
    const missing = getMissingVariants(image, variants);

    if (missing.length === 0) {
      skipped++;
      continue;
    }

    console.log(`Processing: ${image.relativePath}`);

    for (const { preset, orientation } of missing) {
      const size = PRESETS[preset];

      // Skip if target size is larger than original
      const relevantDimension = orientation === 'w' ? analysis.width : analysis.height;
      if (size > relevantDimension) {
        console.log(`  Skipping ${preset}-${orientation}: original ${orientation === 'w' ? 'width' : 'height'} (${relevantDimension}px) smaller than target (${size}px)`);
        continue;
      }

      const outputPath = getOptimizedPath(image, preset, orientation);
      const result = await generateVariant(image.path, outputPath, size, orientation);
      console.log(`  Generated: ${preset}-${orientation} (${formatSize(result.sizeKB)})`);
      generated++;
    }
  }

  console.log(`\nDone! Generated ${generated} variants, skipped ${skipped} fully-optimized images.`);
}

/**
 * Optimize a single image
 */
async function optimizeSingle(args) {
  const imagePath = args[0];
  const presetArg = args[1];

  if (!imagePath) {
    console.error('Usage: npm run images:optimize-single -- <path> [preset]');
    console.error('Example: npm run images:optimize-single -- images/odin-profile.jpg small-w');
    console.error('Presets: thumb-w, thumb-h, small-w, small-h, medium-w, medium-h, large-w, large-h, xlarge-w, xlarge-h');
    process.exit(1);
  }

  // Resolve path relative to public/images
  const fullPath = imagePath.startsWith('images/')
    ? join(__dirname, '../public', imagePath)
    : join(IMAGES_DIR, imagePath);

  if (!existsSync(fullPath)) {
    console.error(`Image not found: ${fullPath}`);
    process.exit(1);
  }

  const ext = extname(fullPath).toLowerCase();
  const name = basename(fullPath, ext);
  const relativePath = relative(IMAGES_DIR, fullPath);
  const image = { path: fullPath, relativePath, name, ext };

  const analysis = await analyzeImage(fullPath);
  console.log(`Image: ${relativePath} (${analysis.width}x${analysis.height}, ${formatSize(analysis.sizeKB)})\n`);

  // Parse preset argument
  let presetsToGenerate = [];

  if (presetArg) {
    // Single preset specified (e.g., "small-w" or "medium-h")
    const match = presetArg.match(/^(\w+)-(w|h)$/);
    if (!match || !PRESETS[match[1]]) {
      console.error(`Invalid preset: ${presetArg}`);
      console.error('Valid presets: thumb-w, thumb-h, small-w, small-h, medium-w, medium-h, large-w, large-h, xlarge-w, xlarge-h');
      process.exit(1);
    }
    presetsToGenerate.push({ preset: match[1], orientation: match[2] });
  } else {
    // Generate all presets
    for (const preset of Object.keys(PRESETS)) {
      presetsToGenerate.push({ preset, orientation: 'w' });
      presetsToGenerate.push({ preset, orientation: 'h' });
    }
  }

  for (const { preset, orientation } of presetsToGenerate) {
    const size = PRESETS[preset];
    const relevantDimension = orientation === 'w' ? analysis.width : analysis.height;

    if (size > relevantDimension) {
      console.log(`Skipping ${preset}-${orientation}: original ${orientation === 'w' ? 'width' : 'height'} (${relevantDimension}px) smaller than target (${size}px)`);
      continue;
    }

    const outputPath = getOptimizedPath(image, preset, orientation);
    const result = await generateVariant(fullPath, outputPath, size, orientation);
    console.log(`Generated: ${preset}-${orientation} (${formatSize(result.sizeKB)}) -> ${relative(IMAGES_DIR, outputPath)}`);
  }
}

/**
 * Clean all optimized variants
 */
async function cleanVariants() {
  if (!existsSync(OPTIMIZED_DIR)) {
    console.log('No optimized directory found. Nothing to clean.');
    return;
  }

  console.log(`Removing: ${OPTIMIZED_DIR}`);
  rmSync(OPTIMIZED_DIR, { recursive: true });
  console.log('Done! All optimized variants removed.');
}

// ============ Main ============

const command = process.argv[2];
const args = process.argv.slice(3);

switch (command) {
  case 'info':
    await showInfo();
    break;
  case 'optimize':
    await optimizeAll();
    break;
  case 'optimize-single':
    await optimizeSingle(args);
    break;
  case 'clean':
    await cleanVariants();
    break;
  default:
    console.log('Image Optimization CLI');
    console.log('');
    console.log('Commands:');
    console.log('  npm run images:info            Show info about all images');
    console.log('  npm run images:optimize        Generate missing optimized variants');
    console.log('  npm run images:optimize-single Optimize a single image');
    console.log('  npm run images:clean           Remove all optimized variants');
    console.log('');
    console.log('Size presets:');
    for (const [name, size] of Object.entries(PRESETS)) {
      console.log(`  ${name}-w: ${size}px wide    ${name}-h: ${size}px tall`);
    }
    process.exit(command ? 1 : 0);
}
