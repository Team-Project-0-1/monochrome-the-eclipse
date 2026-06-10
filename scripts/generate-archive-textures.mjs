// 아카이브 텍스처 생성 — Gemini 이미지 모델(gemini-2.5-flash-image)로 책상/인화지
// 텍스처를 생성해 WebP로 변환한다. GEMINI_API_KEY는 .env.local에서 읽는다.
// 실패는 치명적이지 않다: CSS 절차적 폴백(--archive-*-image: none)이 그대로 동작.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const outDir = path.join(root, 'public', 'assets', 'archive');
const tmpDir = path.join(root, '.tmp', 'archive-textures');

const readApiKey = () => {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  const envPath = path.join(root, '.env.local');
  if (!fs.existsSync(envPath)) return null;
  const match = fs.readFileSync(envPath, 'utf8').match(/^GEMINI_API_KEY\s*=\s*(.+)$/m);
  return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : null;
};

const TEXTURES = [
  {
    name: 'desk-surface',
    prompt: 'Top-down photograph texture of a dark aged wooden archivist desk surface, '
      + 'worn matte black-brown wood with subtle scratches and ink stains, lit by a single warm '
      + 'desk lamp from the top, heavy vignette toward edges, monochrome near-black palette, '
      + 'no objects, no text, seamless feel, photographic grain',
  },
  {
    name: 'photo-paper',
    prompt: 'Flat scan texture of blank aged silver gelatin photo paper, warm grey off-white, '
      + 'subtle paper fiber and chemical staining at edges, slightly darker corners, '
      + 'monochrome, no text, no objects, full-bleed texture',
  },
];

const apiKey = readApiKey();
if (!apiKey) {
  console.error('SKIP: GEMINI_API_KEY 없음(.env.local) — 절차적 폴백 유지');
  process.exit(2);
}

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(tmpDir, { recursive: true });

/**
 * POST to a given model id. Returns {ok, status, body} where body is already parsed JSON
 * or the raw text on error.
 */
const tryGenerate = async (modelId, prompt) => {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, status: res.status, body: text };
  }
  return { ok: true, status: res.status, body: await res.json() };
};

const PRIMARY_MODEL = 'gemini-2.5-flash-image';
const FALLBACK_MODEL = 'gemini-2.5-flash-image-preview';

let generated = 0;
for (const { name, prompt } of TEXTURES) {
  let result = await tryGenerate(PRIMARY_MODEL, prompt);

  if (!result.ok && result.status === 404) {
    console.warn(`WARN ${name}: ${PRIMARY_MODEL} 404, ${FALLBACK_MODEL} 시도`);
    result = await tryGenerate(FALLBACK_MODEL, prompt);
  }

  if (!result.ok) {
    console.error(`FAIL ${name}: HTTP ${result.status} ${result.body}`);
    continue;
  }

  const part = result.body?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!part) {
    console.error(`FAIL ${name}: 응답에 이미지 없음`);
    continue;
  }

  const pngPath = path.join(tmpDir, `${name}.png`);
  fs.writeFileSync(pngPath, Buffer.from(part.inlineData.data, 'base64'));

  const webpPath = path.join(outDir, `${name}.webp`);
  const ffmpeg = spawnSync('ffmpeg', ['-y', '-i', pngPath, '-c:v', 'libwebp', '-quality', '80', webpPath], { stdio: 'inherit' });
  if (ffmpeg.status !== 0) {
    console.error(`FAIL ${name}: ffmpeg WebP 변환 실패`);
    continue;
  }

  const sizeBytes = fs.statSync(webpPath).size;
  const kb = Math.round(sizeBytes / 1024);

  // Re-encode at quality 70 if over ~250 KB
  if (sizeBytes > 250 * 1024) {
    console.warn(`WARN ${name}: ${kb} KB > 250 KB — quality 70으로 재인코딩`);
    const reEncode = spawnSync('ffmpeg', ['-y', '-i', pngPath, '-c:v', 'libwebp', '-quality', '70', webpPath], { stdio: 'inherit' });
    if (reEncode.status !== 0) {
      console.error(`FAIL ${name}: ffmpeg 재인코딩 실패`);
      continue;
    }
    const newKb = Math.round(fs.statSync(webpPath).size / 1024);
    console.log(`OK ${name}.webp (${newKb} KB, re-encoded)`);
  } else {
    console.log(`OK ${name}.webp (${kb} KB)`);
  }

  generated += 1;
}

console.log(`done: ${generated}/${TEXTURES.length} 생성`);
process.exit(generated > 0 ? 0 : 1);
