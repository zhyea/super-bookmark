/**
 * 公共在线壁纸源（抓取后转 data URL 写入 storage，与本地自选图一致）
 * Pexels：需在构建环境设置 VITE_PEXELS_API_KEY（参见 https://www.pexels.com/api/ ）
 */

export const WALLPAPER_REMOTE_IDS = ['bing', 'unsplash', 'pexels'];

export const MAX_WALLPAPER_BYTES = 3 * 1024 * 1024;

/**
 * Pexels 官方要求请求头 Authorization 为密钥本身（非 Bearer）。
 * @returns {string}
 */
export function getPexelsApiKey() {
    try {
        const k = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_PEXELS_API_KEY;
        return k != null && String(k).trim() ? String(k).trim() : '';
    } catch (_e) {
        return '';
    }
}

/**
 * @param {string} u
 * @returns {string}
 */
export function upgradeWallpaperUrlToHttps(u) {
    let s = String(u || '').trim();
    if (s.indexOf('http://') === 0) {
        s = 'https://' + s.slice(7);
    }
    return s;
}

/**
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
export function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
        if (!blob || !blob.size) {
            reject(new Error('EMPTY_BLOB'));
            return;
        }
        if (blob.size > MAX_WALLPAPER_BYTES) {
            reject(new Error('TOO_LARGE'));
            return;
        }
        const r = new FileReader();
        r.onload = function () {
            resolve(String(r.result || ''));
        };
        r.onerror = function () {
            reject(new Error('READ_FAIL'));
        };
        r.readAsDataURL(blob);
    });
}

/**
 * @param {string} url
 * @returns {Promise<Blob>}
 */
export async function fetchImageBlob(url) {
    const res = await fetch(url, {credentials: 'omit', redirect: 'follow'});
    if (!res.ok) throw new Error('HTTP_' + res.status);
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (ct && !ct.includes('image') && !ct.includes('octet-stream')) {
        throw new Error('NOT_IMAGE');
    }
    return res.blob();
}

/**
 * @param {string} pathQuery 如 curated?page=1&per_page=6
 * @param {string} errPrefix
 * @returns {Promise<unknown>}
 */
export async function fetchPexelsApiJson(pathQuery, errPrefix) {
    const key = getPexelsApiKey();
    if (!key) throw new Error('pexels_no_api_key');
    const res = await fetch('https://api.pexels.com/v1/' + pathQuery, {
        headers: {Authorization: key},
        credentials: 'omit'
    });
    if (!res.ok) throw new Error(errPrefix + res.status);
    return res.json();
}

async function fetchBing() {
    const jr = await fetch(
        'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=en-US',
        {credentials: 'omit'}
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

async function fetchPexels() {
    const page = 1 + Math.floor(Math.random() * 40);
    const j = await fetchPexelsApiJson('curated?page=' + page + '&per_page=20', 'pexels_json_');
    const photos = Array.isArray(j && j.photos) ? j.photos : [];
    if (!photos.length) throw new Error('pexels_empty');
    const p = photos[Math.floor(Math.random() * photos.length)];
    const src = (p && p.src) || {};
    const u = upgradeWallpaperUrlToHttps(src.large2x || src.large || src.original || '');
    if (!u) throw new Error('pexels_nourl');
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
        case 'pexels':
            return fetchPexels();
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
 * 参与轮换的图源 id；允许空数组（远程默认不加入，由预览开关或本地上传加入）。
 * @param {unknown} raw
 * @returns {string[]}
 */
export function normalizeWallpaperRotateSourceIdsForSave(raw) {
    if (!Array.isArray(raw)) return [];
    const out = [];
    const seen = Object.create(null);
    for (let i = 0; i < raw.length; i++) {
        const id = String(raw[i] || '');
        if (!isWallpaperRotateSourceId(id) || seen[id]) continue;
        seen[id] = true;
        out.push(id);
    }
    return out;
}
