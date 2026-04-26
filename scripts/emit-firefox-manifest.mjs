/**
 * 在已构建的扩展目录中为 Firefox 写入 browser_specific_settings.gecko。
 * 用法：node scripts/emit-firefox-manifest.mjs [输出目录，默认 dist-firefox]
 *
 * 可通过环境变量 GECKO_EXTENSION_ID 覆盖扩展 ID（上架 AMO 时请使用唯一 ID）。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(__dirname, '..');
const outDir = resolve(root, process.argv[2] || 'dist-firefox');
const manifestPath = resolve(outDir, 'manifest.json');

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

manifest.browser_specific_settings = {
    gecko: {
        id: process.env.GECKO_EXTENSION_ID || 'superbookmark@superbookmark.local',
        strict_min_version: '115.0'
    }
};

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log('Firefox: 已写入 gecko 段 →', manifestPath);
