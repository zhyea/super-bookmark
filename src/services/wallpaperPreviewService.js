import { fetchImageBlob } from './wallpaperProviders.js';

function normalizeWordpressItems(arr) {
    if (!Array.isArray(arr)) return [];
    return arr
        .filter(function (x) {
            return x && String(x.mime_type || '').indexOf('image/') === 0;
        })
        .map(function (x, idx) {
            const sizes = (x && x.media_details && x.media_details.sizes) || {};
            const thumb =
                (sizes.medium_large && sizes.medium_large.source_url) ||
                (sizes.medium && sizes.medium.source_url) ||
                (sizes.thumbnail && sizes.thumbnail.source_url) ||
                x.source_url;
            const full =
                (sizes.large && sizes.large.source_url) ||
                (sizes.full && sizes.full.source_url) ||
                x.source_url;
            return {
                id: String(x.id || idx),
                thumbUrl: thumb,
                fullUrl: full
            };
        })
        .filter(function (x) {
            return !!(x.thumbUrl && x.fullUrl);
        });
}

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
                const full = img.url.indexOf('http') === 0 ? img.url : 'https://www.bing.com' + img.url;
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
    /**
     * 扩展页内用 fetch 拉 blob 时，source.unsplash.com 会触发 CORS；
     * 预览缩略图与双击应用均走可跨域的图片地址（Lorem Picsum，与 fetchUnsplash 实现一致）。
     * 缩略图与 full 必须使用同一 seed，否则 Picsum 会给出两张不同的图。
     */
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

async function fetchWordpressPreviewPage(apiUrl, page, pageSize) {
    const json = await fetchJson(apiUrl + '?per_page=' + pageSize + '&page=' + (page + 1), 'wp_preview');
    const items = normalizeWordpressItems(json);
    return {
        items,
        hasMore: items.length === pageSize
    };
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
        case 'lifeofpix':
            return fetchWordpressPreviewPage('https://www.lifeofpix.com/wp-json/wp/v2/media', page, pageSize);
        case 'mmt':
            return fetchWordpressPreviewPage('https://mmtstock.com/wp-json/wp/v2/media', page, pageSize);
        case 'jaymantri':
            return fetchWordpressPreviewPage('https://jaymantri.com/wp-json/wp/v2/media', page, pageSize);
        case 'skitterphoto':
            return fetchWordpressPreviewPage('https://skitterphoto.com/wp-json/wp/v2/media', page, pageSize);
        default:
            throw new Error('UNKNOWN_PROVIDER');
    }
}

/**
 * @param {string} url
 * @returns {Promise<string>}
 */
export async function probeWallpaperImageUrl(url) {
    const blob = await fetchImageBlob(url);
    if (!blob || !blob.size) throw new Error('EMPTY_BLOB');
    return url;
}
