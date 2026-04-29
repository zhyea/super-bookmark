/**
 * 公共在线壁纸源（抓取后转 data URL 写入 storage，与本地自选图一致）
 */

import {
    blobToDataUrl,
    fetchImageBlob,
    MAX_WALLPAPER_BYTES,
    upgradeWallpaperUrlToHttps
} from './wallpaper/wallpaperImageFetch.js';
export { blobToDataUrl, fetchImageBlob, MAX_WALLPAPER_BYTES, upgradeWallpaperUrlToHttps } from './wallpaper/wallpaperImageFetch.js';

export const WALLPAPER_REMOTE_IDS = ['bing', 'unsplash'];

async function fetchBing() {
    const jr = await fetch(
        'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=en-US',
        { credentials: 'omit' }
    );
    if (!jr.ok) throw new Error('bing_json');
    const j = await jr.json();
    const img = j.images && j.images[0];
    if (!img || !img.url) throw new Error('bing_empty');
    let u = img.url.indexOf('http') === 0 ? img.url : 'https://www.bing.com' + img.url;
    u = upgradeWallpaperUrlToHttps(u);
    const blob = await fetchImageBlob(u);
    return blobToDataUrl(blob);
}

/**
 * source.unsplash.com 等在扩展页 fetch 时易被 CORS 拦截；
 * 使用 Lorem Picsum 的 seed 图（可跨域取 blob），与预览列表同一 seed 保证缩略图与全图一致。
 */
async function fetchUnsplash() {
    const seed = String(Date.now()) + '_' + String(Math.random()).slice(2, 10);
    const u = 'https://picsum.photos/seed/' + encodeURIComponent(seed) + '/1280/720';
    const blob = await fetchImageBlob(u);
    return blobToDataUrl(blob);
}

/**
 * @param {string} id
 * @returns {Promise<string>} data URL
 */
export function fetchWallpaperByProvider(id) {
    switch (id) {
        case 'bing':
            return fetchBing();
        case 'unsplash':
            return fetchUnsplash();
        default:
            return Promise.reject(new Error('UNKNOWN_PROVIDER'));
    }
}

/**
 * @param {string} url
 * @returns {Promise<string>} data URL
 */
export async function fetchWallpaperDataUrlFromUrl(url) {
    const blob = await fetchImageBlob(upgradeWallpaperUrlToHttps(url));
    return blobToDataUrl(blob);
}

/**
 * @param {string} id
 */
export function isRemoteWallpaperId(id) {
    return WALLPAPER_REMOTE_IDS.indexOf(id) !== -1;
}

/** 自动轮换中的「本地上传」项，对应 wallpaperProvider === 'custom' */
export const WALLPAPER_CUSTOM_ROTATE_ID = 'custom';

export function isWallpaperRotateSourceId(id) {
    return id === WALLPAPER_CUSTOM_ROTATE_ID || isRemoteWallpaperId(id);
}

/**
 * 将 storage / 备份中可能出现的非数组形态转为 id 数组。
 * @param {unknown} raw
 * @returns {unknown[]}
 */
function coerceWallpaperRotateSourceIdsArray(raw) {
    if (raw == null) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
        const t = raw.trim();
        if (!t) return [];
        try {
            const j = JSON.parse(t);
            return Array.isArray(j) ? j : [];
        } catch (_e) {
            return [];
        }
    }
    if (typeof raw === 'object') {
        return Object.keys(raw)
            .filter(function (k) {
                return /^\d+$/.test(k);
            })
            .sort(function (a, b) {
                return Number(a) - Number(b);
            })
            .map(function (k) {
                return raw[k];
            });
    }
    return [];
}

/**
 * 参与轮换的图源 id；允许空数组（远程默认不加入，由预览开关或本地上传加入）。
 * @param {unknown} raw
 * @returns {string[]}
 */
export function normalizeWallpaperRotateSourceIdsForSave(raw) {
    const arr = coerceWallpaperRotateSourceIdsArray(raw);
    const out = [];
    const seen = Object.create(null);
    for (let i = 0; i < arr.length; i++) {
        const id = String(arr[i] || '');
        if (!isWallpaperRotateSourceId(id) || seen[id]) continue;
        seen[id] = true;
        out.push(id);
    }
    return out;
}
