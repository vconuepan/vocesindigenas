# Image Optimization System

This document describes how images are managed, optimized, and used in the website.

## Directory Structure

```
client/public/images/
├── *.jpg, *.png           # Original images (never modified)
├── optimized/             # Generated WebP variants
│   ├── *-thumb-w.webp     # 80px wide
│   ├── *-thumb-h.webp     # 80px tall
│   ├── *-small-w.webp     # 160px wide
│   ├── *-small-h.webp     # 160px tall
│   ├── *-medium-w.webp    # 320px wide
│   ├── *-medium-h.webp    # 320px tall
│   ├── *-large-w.webp     # 640px wide
│   ├── *-large-h.webp     # 640px tall
│   ├── *-xlarge-w.webp    # 1024px wide
│   └── *-xlarge-h.webp    # 1024px tall
└── logos/                 # Source/publication logos
```

## CLI Commands

All commands run from the `client/` directory:

| Command | Description |
|---------|-------------|
| `npm run images:info` | List all images with sizes and available variants |
| `npm run images:optimize` | Generate missing WebP variants for all images |
| `npm run images:optimize-single -- <path> [preset]` | Optimize a single image |
| `npm run images:clean` | Remove all generated variants |

### Examples

```bash
# See what images exist and what variants are available
npm run images:info

# Generate all missing optimized variants
npm run images:optimize

# Optimize a specific image with all presets
npm run images:optimize-single -- images/some-image.jpg

# Optimize with one preset
npm run images:optimize-single -- images/some-image.jpg small-w
```

## Size Presets

| Preset | Size | Use Case |
|--------|------|----------|
| `thumb` | 80px | Source logos, small thumbnails |
| `small` | 160px | Story card thumbnails |
| `medium` | 320px | Card images, panel photos |
| `large` | 640px | Featured story images |
| `xlarge` | 1024px | Full-width or hero images |

Each preset has two orientations:
- `-w` (width-constrained): Height scales proportionally
- `-h` (height-constrained): Width scales proportionally

## Choosing the Right Preset

**Use `-w` presets when CSS constrains width:**
```tsx
<img src="/images/optimized/story-thumb-small-w.webp" className="w-32 h-32" />
```

**Use `-h` presets when CSS constrains height:**
```tsx
<img src="/images/optimized/featured-story-medium-h.webp" className="w-full h-48 object-cover" />
```

## Adding New Images

1. Add the original image to `client/public/images/` (or a subdirectory)
2. Run the optimizer:
   ```bash
   cd client
   npm run images:optimize-single -- images/your-new-image.jpg
   ```
3. Check what was generated: `npm run images:info`
4. Use the appropriate variant in your component

## Retina/HiDPI Support

Preset sizes are chosen to support 2x retina displays:
- For 64px CSS display, use `thumb` (80px)
- For 128px CSS display, use `small` (160px)
- For 256px CSS display, use `medium` (320px)

## Technical Details

- **Format:** All optimized images are WebP (80% quality)
- **Aspect ratio:** Always preserved
- **Skip behavior:** Variants larger than the original are skipped
- **Originals:** Never modified or deleted
- **Script location:** `client/scripts/images.mjs`
