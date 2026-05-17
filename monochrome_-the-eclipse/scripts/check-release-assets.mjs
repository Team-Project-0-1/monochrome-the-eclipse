import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

const failures = [];

const requireFile = (relativePath) => {
  const fullPath = path.join(rootDir, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`missing ${relativePath}`);
  }
  return fullPath;
};

const readText = (relativePath) => {
  const fullPath = requireFile(relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, 'utf8') : '';
};

const requireText = (label, text, pattern) => {
  if (!pattern.test(text)) {
    failures.push(`${label} does not include ${pattern}`);
  }
};

const indexHtml = readText('index.html');
const headers = readText('public/_headers');
const robots = readText('public/robots.txt');
const manifestPath = requireFile('public/manifest.webmanifest');

requireFile('public/mono.webp');
requireFile('public/icon-192.png');
requireFile('public/icon-512.png');
requireFile('public/apple-touch-icon.png');
requireFile('public/sw.js');

requireText('index.html', indexHtml, /<html\s+lang="ko"/);
requireText('index.html', indexHtml, /<meta\s+name="description"/);
requireText('index.html', indexHtml, /property="og:image"/);
requireText('index.html', indexHtml, /rel="manifest"/);
requireText('index.tsx', readText('index.tsx'), /serviceWorker/);
requireText('public/_headers', headers, /Cache-Control:\s*public,\s*max-age=31536000,\s*immutable/i);
requireText('public/_headers', headers, /X-Content-Type-Options:\s*nosniff/i);
requireText('public/_headers', headers, /Referrer-Policy:\s*strict-origin-when-cross-origin/i);
requireText('public/_headers', headers, /Content-Security-Policy:/i);
requireText('public/_headers', headers, /Permissions-Policy:/i);
requireText('public/_headers sw.js cache policy', headers, /\/sw\.js[\s\S]*Cache-Control:\s*public,\s*max-age=0,\s*must-revalidate/i);
requireText('public/robots.txt', robots, /User-agent:\s*\*/i);

if (existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (!manifest.name || !manifest.short_name || !manifest.icons?.length) {
      failures.push('manifest.webmanifest is missing name, short_name, or icons');
    }
    if (!manifest.start_url) {
      failures.push('manifest.webmanifest is missing start_url');
    }
    if (!manifest.display && !manifest.display_override) {
      failures.push('manifest.webmanifest is missing display or display_override');
    }

    const iconSizes = new Set((manifest.icons ?? []).flatMap((icon) => String(icon.sizes ?? '').split(/\s+/)));
    for (const requiredSize of ['192x192', '512x512']) {
      if (!iconSizes.has(requiredSize)) {
        failures.push(`manifest.webmanifest is missing ${requiredSize} icon`);
      }
    }

    for (const icon of manifest.icons ?? []) {
      if (!icon.src) {
        failures.push('manifest icon is missing src');
        continue;
      }

      const iconPath = path.join(publicDir, icon.src);
      if (!existsSync(iconPath)) {
        failures.push(`manifest icon missing file: ${icon.src}`);
      }
    }
  } catch (error) {
    failures.push(`manifest.webmanifest is invalid JSON: ${error.message}`);
  }
}

if (failures.length > 0) {
  failures.forEach((failure) => console.error(`FAIL ${failure}`));
  process.exit(1);
}

console.log('PASS release asset and metadata checks');
