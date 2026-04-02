/**
 * 生成极简页搜索引擎图标到 public/assets/imgs/search-engine/
 * - google：标准四色 G（品牌四色）
 * - baidu / sogou：simple-icons 路径 + 官方品牌色（simple-icons.json hex）
 * - bing：@iconify-json/logos（CC0）
 * - yandex：Font Awesome Brands faYandex（CC BY 4.0）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as faBrands from '@fortawesome/free-brands-svg-icons';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'public', 'assets', 'imgs', 'search-engine');
const siIcons = path.join(root, 'node_modules', 'simple-icons', 'icons');
const logosJson = path.join(root, 'node_modules', '@iconify-json', 'logos', 'icons.json');

fs.mkdirSync(outDir, { recursive: true });

/** 标准 Google「G」四色（非 simple-icons 单色路径） */
const GOOGLE_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" role="img" aria-hidden="true">
<title>Google</title>
<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
</svg>
`;
fs.writeFileSync(path.join(outDir, 'google.svg'), GOOGLE_SVG, 'utf8');
console.log('wrote google.svg (4-color)');

function readSiPath(slug) {
    const raw = fs.readFileSync(path.join(siIcons, `${slug}.svg`), 'utf8');
    const m = raw.match(/<path\s+d="([^"]+)"/);
    return m ? m[1] : '';
}

const baiduD = readSiPath('baidu');
const sogouD = readSiPath('sogou');
const BAIDU_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" role="img" aria-hidden="true">
<title>Baidu</title>
<path fill="#2932E1" d="${baiduD}"/>
</svg>
`;
const SOGOU_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" role="img" aria-hidden="true">
<title>Sogou</title>
<path fill="#FB6022" d="${sogouD}"/>
</svg>
`;
fs.writeFileSync(path.join(outDir, 'baidu.svg'), BAIDU_SVG, 'utf8');
fs.writeFileSync(path.join(outDir, 'sogou.svg'), SOGOU_SVG, 'utf8');
console.log('wrote baidu.svg (#2932E1)');
console.log('wrote sogou.svg (#FB6022)');

const logos = JSON.parse(fs.readFileSync(logosJson, 'utf8'));
const bing = logos.icons.bing;
const bingW = bing.width || 256;
const bingH = bing.height;
const bingSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${bingW} ${bingH}" role="img" aria-hidden="true">
<title>Bing</title>
${bing.body}
</svg>
`;
fs.writeFileSync(path.join(outDir, 'bing.svg'), bingSvg, 'utf8');
console.log('wrote bing.svg', bingW, 'x', bingH);

const yIcon = faBrands.faYandex.icon;
const yW = yIcon[0];
const yH = yIcon[1];
const yPath = yIcon[4];
const yandexSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${yW} ${yH}" role="img" aria-hidden="true">
<title>Yandex</title>
<path fill="#FC3F1D" d="${yPath}"/>
</svg>
`;
fs.writeFileSync(path.join(outDir, 'yandex.svg'), yandexSvg, 'utf8');
console.log('wrote yandex.svg', yW, 'x', yH);
