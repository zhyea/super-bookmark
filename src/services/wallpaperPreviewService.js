import { fetchImageBlob, upgradeWallpaperUrlToHttps } from './wallpaper/wallpaperImageFetch.js';
import { buildPaugramWallpaperUrl } from './wallpaper/paugramWallpaper.js';

async function fetchJson(url, err) {
    const res = await fetch(url, { credentials: 'omit' });
    if (!res.ok) throw new Error(err + '_' + res.status);
    return res.json();
}

async function fetchBingPreviewPage(page, pageSize) {
    const idx = Math.max(0, page * pageSize);
    const json = await fetchJson(
        'https://www.bing.com/HPImageArchive.aspx?format=js&idx=' + idx + '&n=' + pageSize + '&mkt=en-US',
        'bing_preview'
    );
    const images = Array.isArray(json && json.images) ? json.images : [];
    return {
        items: images
            .map(function (img, i) {
                if (!img || !img.url) return null;
                const full = upgradeWallpaperUrlToHttps(
                    img.url.indexOf('http') === 0 ? img.url : 'https://www.bing.com' + img.url
                );
                return {
                    id: String(idx + i),
                    thumbUrl: full,
                    fullUrl: full
                };
            })
            .filter(Boolean),
        hasMore: images.length === pageSize
    };
}

function buildUnsplashItem(seed) {
    const s = String(seed);
    const seedKey = 'u_' + s;
    return {
        id: s,
        thumbUrl: 'https://picsum.photos/seed/' + encodeURIComponent(seedKey) + '/480/360',
        fullUrl: 'https://picsum.photos/seed/' + encodeURIComponent(seedKey) + '/1600/1000'
    };
}

async function fetchUnsplashPreviewPage(page, pageSize) {
    const start = page * pageSize;
    const nowSeed = Math.floor(Date.now() / 1000);
    const items = [];
    for (let i = 0; i < pageSize; i++) {
        items.push(buildUnsplashItem(nowSeed + start + i));
    }
    return {
        items,
        hasMore: true
    };
}

/** 保罗 API 每次请求随机图；用唯一查询串区分缩略图请求 */
async function fetchPaugramPreviewPage(page, pageSize) {
    const batch = String(page) + '-' + String(Date.now()) + '-' + String(Math.random()).slice(2, 9);
    const items = [];
    for (let i = 0; i < pageSize; i++) {
        const token = batch + '-' + i + '-' + String(Math.random()).slice(2, 10);
        const u = upgradeWallpaperUrlToHttps(buildPaugramWallpaperUrl(token));
        items.push({
            id: 'pg-' + page + '-' + i + '-' + token.slice(-24),
            thumbUrl: u,
            fullUrl: u
        });
    }
    return { items, hasMore: true };
}

/**
 * @param {string} providerId
 * @param {number} page
 * @param {number} pageSize
 * @returns {Promise<{items: Array<{id:string,thumbUrl:string,fullUrl:string}>, hasMore:boolean}>}
 */
export async function fetchWallpaperPreviewPage(providerId, page, pageSize) {
    switch (providerId) {
        case 'bing':
            return fetchBingPreviewPage(page, pageSize);
        case 'unsplash':
            return fetchUnsplashPreviewPage(page, pageSize);
        case 'paugram':
            return fetchPaugramPreviewPage(page, pageSize);
        default:
            throw new Error('UNKNOWN_PROVIDER');
    }
}

/**
 * @param {string} url
 * @returns {Promise<string>}
 */
export async function probeWallpaperImageUrl(url) {
    const blob = await fetchImageBlob(upgradeWallpaperUrlToHttps(url));
    if (!blob || !blob.size) throw new Error('EMPTY_BLOB');
    return url;
}
