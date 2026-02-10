/**
 * Генерация PNG иконок из SVG favicon.
 * Запуск: node frontend/scripts/generate-icons.mjs
 * Требует: npm install sharp (dev dependency)
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const svgPath = join(publicDir, 'favicon.svg');

async function generate() {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.error('sharp не установлен. Установите: npm install -D sharp');
    process.exit(1);
  }

  const svgBuffer = readFileSync(svgPath);

  const sizes = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
  ];

  for (const { name, size } of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(join(publicDir, name));
    console.log(`✓ ${name} (${size}x${size})`);
  }

  // Generate ICO (just use 32x32 PNG as favicon.ico — browsers accept PNG in .ico)
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(join(publicDir, 'favicon.ico'));
  console.log('✓ favicon.ico (32x32)');

  console.log('\nВсе иконки сгенерированы в frontend/public/');
}

generate().catch(console.error);
