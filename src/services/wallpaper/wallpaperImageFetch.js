/**
 * 壁纸图：跨域拉取 blob、转 data URL（供必应 / Picsum 等共用）
 */

export const MAX_WALLPAPER_BYTES = 3 * 1024 * 1024;

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
    const res = await fetch(url, { credentials: 'omit', redirect: 'follow' });
    if (!res.ok) throw new Error('HTTP_' + res.status);
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    /* 部分 CDN 偶发空 Content-Type 或非 image/*；仅拒绝明显非图片 */
    if (ct && (ct.includes('json') || ct.includes('text/html') || ct.includes('text/plain') || ct.includes('xml'))) {
        throw new Error('NOT_IMAGE');
    }
    return res.blob();
}
