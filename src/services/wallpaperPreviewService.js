import {fetchImageBlob, upgradeWallpaperUrlToHttps, fetchPexelsApiJson} from './wallpaperProviders.js';

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

/** Pexels curated 分页，page 为 0-based */
async function fetchPexelsPreviewPage(page, pageSize) {
    const apiPage = page + 1;
    const j = await fetchPexelsApiJson(
        'curated?page=' + apiPage + '&per_page=' + pageSize,
        'pexels_preview_'
    );
    const photos = Array.isArray(j && j.photos) ? j.photos : [];
    const items = photos
        .map(function (p) {
            if (!p || p.id == null) return null;
            const src = p.src || {};
            const thumb = upgradeWallpaperUrlToHttps(src.medium || src.small || src.tiny || '');
            const full = upgradeWallpaperUrlToHttps(src.large2x || src.large || src.original || '');
            if (!thumb || !full) return null;
            return {
                id: String(p.id),
                thumbUrl: thumb,
                fullUrl: full
            };
        })
        .filter(Boolean);
    const hasMore = !!(j && j.next_page);
    return {items, hasMore};
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
        case 'pexels':
            return fetchPexelsPreviewPage(page, pageSize);
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
