/**
 * 从源 PNG 生成 manifest 用 icon16 / icon48 / icon128（圆角外黑边改为透明）
 * 用法：node scripts/build-extension-icons.mjs [源图路径]
 * 默认：public/icons/icon-source.png
 */
import sharp from 'sharp';
import { readFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const defaultSrc = join(root, 'public', 'icons', 'icon-source.png');
const outDir = join(root, 'public', 'icons');

/** @param {Buffer} inputBuffer */
async function stripNearBlackToAlpha(inputBuffer) {
    const { data, info } = await sharp(inputBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const d = Buffer.from(data);
    for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        if (r <= 16 && g <= 16 && b <= 16) {
            d[i + 3] = 0;
        }
    }
    return sharp(d, {
        raw: {
            width: info.width,
            height: info.height,
            channels: 4
        }
    }).png();
}

async function main() {
    const src = process.argv[2] || defaultSrc;
    const inputBuffer = await readFile(src);
    const normalized = await stripNearBlackToAlpha(inputBuffer);
    const pngBuf = await normalized.toBuffer();
    await mkdir(outDir, { recursive: true });
    for (const size of [16, 48, 128]) {
        const outPath = join(outDir, `icon${size}.png`);
        await sharp(pngBuf)
            .resize(size, size, { fit: 'cover', position: 'centre' })
            .png()
            .toFile(outPath);
        console.log('[build-extension-icons]', outPath);
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
