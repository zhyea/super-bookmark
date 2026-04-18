/**
 * 公共在线壁纸源（抓取后转 data URL 写入 storage，与本地自选图一致）
 */

export const WALLPAPER_REMOTE_IDS = ['bing', 'unsplash', 'lifeofpix', 'mmt', 'jaymantri', 'skitterphoto'];

export const MAX_WALLPAPER_BYTES = 3 * 1024 * 1024;

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

async function fetchBing() {
    const jr = await fetch(
        'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=en-US',
        {credentials: 'omit'}
    );
    if (!jr.ok) throw new Error('bing_json');
    const j = await jr.json();
    const img = j.images && j.images[0];
    if (!img || !img.url) throw new Error('bing_empty');
    const u = img.url.indexOf('http') === 0 ? img.url : 'https://www.bing.com' + img.url;
    const blob = await fetchImageBlob(u);
    return blobToDataUrl(blob);
}

async function fetchUnsplash() {
    /**
     * source.unsplash.com 在扩展页 fetch 时会被 CORS 拦截；
     * 这里用 Lorem Picsum 作为「Unsplash」图源的可抓取实现（随机摄影图，允许跨域取 blob）。
     */
    const seed = String(Date.now()) + '_' + String(Math.random()).slice(2, 10);
    const u = 'https://picsum.photos/seed/' + encodeURIComponent(seed) + '/1280/720';
    const blob = await fetchImageBlob(u);
    return blobToDataUrl(blob);
}

async function fetchWordpressRandomImage(apiUrl, errPrefix) {
    const page = 1 + Math.floor(Math.random() * 5);
    const sep = apiUrl.indexOf('?') === -1 ? '?' : '&';
    const jr = await fetch(apiUrl + sep + 'per_page=100&page=' + page, {credentials: 'omit'});
    if (!jr.ok) throw new Error(errPrefix + '_json');
    const arr = await jr.json();
    if (!Array.isArray(arr) || !arr.length) throw new Error(errPrefix + '_empty');
    const imageRows = arr.filter(function (x) {
        return x && String(x.mime_type || '').indexOf('image/') === 0;
    });
    if (!imageRows.length) throw new Error(errPrefix + '_noimg');
    const pick = imageRows[Math.floor(Math.random() * imageRows.length)];
    const u =
        (pick.media_details && pick.media_details.sizes && pick.media_details.sizes.large && pick.media_details.sizes.large.source_url) ||
        (pick.media_details && pick.media_details.sizes && pick.media_details.sizes.full && pick.media_details.sizes.full.source_url) ||
        pick.source_url;
    if (!u) throw new Error(errPrefix + '_nourl');
    const blob = await fetchImageBlob(u);
    return blobToDataUrl(blob);
}

async function fetchLifeOfPix() {
    return fetchWordpressRandomImage('https://www.lifeofpix.com/wp-json/wp/v2/media', 'lifeofpix');
}

async function fetchMmt() {
    return fetchWordpressRandomImage('https://mmtstock.com/wp-json/wp/v2/media', 'mmt');
}

async function fetchJayMantri() {
    return fetchWordpressRandomImage('https://jaymantri.com/wp-json/wp/v2/media', 'jaymantri');
}

async function fetchSkitterPhoto() {
    return fetchWordpressRandomImage('https://skitterphoto.com/wp-json/wp/v2/media', 'skitterphoto');
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
        case 'lifeofpix':
            return fetchLifeOfPix();
        case 'mmt':
            return fetchMmt();
        case 'jaymantri':
            return fetchJayMantri();
        case 'skitterphoto':
            return fetchSkitterPhoto();
        default:
            return Promise.reject(new Error('UNKNOWN_PROVIDER'));
    }
}

/**
 * @param {string} url
 * @returns {Promise<string>} data URL
 */
export async function fetchWallpaperDataUrlFromUrl(url) {
    const blob = await fetchImageBlob(url);
    return blobToDataUrl(blob);
}

/**
 * @param {string} id
 */
export function isRemoteWallpaperId(id) {
    return WALLPAPER_REMOTE_IDS.indexOf(id) !== -1;
}
