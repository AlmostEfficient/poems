#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const DEFAULT_ICON_CONFIG = {
  textOffset: { x: -660, y: 70 },
  rotation: -5,
  fontSize: 82
};

function generateIcon(size = 1024) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Scale factor for larger sizes
  const scale = size / 512;
  const scaledConfig = {
    textOffset: {
      x: DEFAULT_ICON_CONFIG.textOffset.x * scale,
      y: DEFAULT_ICON_CONFIG.textOffset.y * scale
    },
    rotation: DEFAULT_ICON_CONFIG.rotation,
    fontSize: DEFAULT_ICON_CONFIG.fontSize * scale
  };

  const { width, height } = canvas;
  const { textOffset, rotation, fontSize } = scaledConfig;

  ctx.clearRect(0, 0, width, height);

  const radius = 113 * scale;

  // Draw rounded rectangle background
  const drawRoundedRect = () => {
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(width - radius, 0);
    ctx.quadraticCurveTo(width, 0, width, radius);
    ctx.lineTo(width, height - radius);
    ctx.quadraticCurveTo(width, height, width - radius, height);
    ctx.lineTo(radius, height);
    ctx.quadraticCurveTo(0, height, 0, height - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
  };

  ctx.save();
  drawRoundedRect();
  ctx.fillStyle = '#f5f5f0';
  ctx.fill();
  ctx.clip();

  const lines = [
    'I have heard that hysterical women',
    'say they are sick of the palette and',
    'fiddle-bow, of poems that are all',
    'imagination, and of men that are',
    'taken up with the shows that please',
    'them most and call them masterworks'
  ];

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(textOffset.x, textOffset.y);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const lineHeight = fontSize * 1.45;
  const startY = -(lines.length * lineHeight) / 2;

  lines.forEach((line, index) => {
    const y = startY + index * lineHeight;

    if (line.includes('poems')) {
      const beforePoems = line.substring(0, line.indexOf('poems'));
      const poemsText = 'poems';
      const afterPoems = line.substring(line.indexOf('poems') + poemsText.length);

      ctx.fillStyle = '#2a2a2a';
      ctx.font = `${fontSize}px Georgia, serif`;
      ctx.fillText(beforePoems, 0, y);

      const beforeWidth = ctx.measureText(beforePoems).width;

      ctx.fillStyle = '#c41e3a';
      ctx.font = `bold ${fontSize + 6 * scale}px Georgia, serif`;
      ctx.fillText(poemsText, beforeWidth, y);

      const poemsWidth = ctx.measureText(poemsText).width;

      ctx.fillStyle = '#2a2a2a';
      ctx.font = `${fontSize}px Georgia, serif`;
      ctx.fillText(afterPoems, beforeWidth + poemsWidth, y);
    } else {
      ctx.fillStyle = '#2a2a2a';
      ctx.font = `${fontSize}px Georgia, serif`;
      ctx.fillText(line, 0, y);
    }
  });

  ctx.restore();
  ctx.restore();

  return canvas;
}

async function main() {
  const assetsDir = path.resolve(__dirname, '..', 'assets');

  console.log('Generating app icons...');

  // Generate 1024x1024 for iOS App Store
  console.log('  → Generating 1024x1024 icon.png...');
  const icon1024 = generateIcon(1024);
  const icon1024Path = path.join(assetsDir, 'icon.png');
  const icon1024Buffer = icon1024.toBuffer('image/png');
  fs.writeFileSync(icon1024Path, icon1024Buffer);
  console.log(`     ✓ Saved to ${icon1024Path}`);

  // Generate 1024x1024 for Android adaptive icon
  console.log('  → Generating 1024x1024 adaptive-icon.png...');
  const adaptiveIconPath = path.join(assetsDir, 'adaptive-icon.png');
  fs.writeFileSync(adaptiveIconPath, icon1024Buffer);
  console.log(`     ✓ Saved to ${adaptiveIconPath}`);

  // Generate 192x192 favicon
  console.log('  → Generating 192x192 favicon.png...');
  const favicon = generateIcon(192);
  const faviconPath = path.join(assetsDir, 'favicon.png');
  fs.writeFileSync(faviconPath, favicon.toBuffer('image/png'));
  console.log(`     ✓ Saved to ${faviconPath}`);

  // Clean up root icon if it exists
  const rootIconPath = path.resolve(__dirname, '..', 'icon.png');
  if (fs.existsSync(rootIconPath)) {
    fs.unlinkSync(rootIconPath);
    console.log('  → Cleaned up icon.png from project root');
  }

  console.log('\n✅ All app icons generated successfully!');
}

main().catch((error) => {
  console.error('Failed to generate icons:', error);
  process.exit(1);
});
