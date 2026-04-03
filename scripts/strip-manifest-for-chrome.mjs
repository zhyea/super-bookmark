/**
 * Chrome MV3 仅支持 background.service_worker，不接受 background.scripts。
 * Firefox 构建（默认 npm run build）在 public/manifest.json 中只声明 scripts。
 *
 * 上架 Chrome 应用商店前请执行：npm run build:chrome
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifestPath = join(__dirname, '../dist/manifest.json');

const raw = readFileSync(manifestPath, 'utf8');
const m = JSON.parse(raw);
const sw =
    (m.background && m.background.service_worker) ||
    (m.background && m.background.scripts && m.background.scripts[0]) ||
    'assets/background.js';
m.background = { service_worker: sw };
writeFileSync(manifestPath, JSON.stringify(m, null, 2) + '\n', 'utf8');
console.log('[strip-manifest-for-chrome] dist/manifest.json: background set to service_worker only');
