/**
 * 保罗随机动漫壁纸 API（Dreamer-Paul）
 * 文档：https://api.paugram.com/help/wallpaper
 * 使用 source=sm（sm.ms 图床）；接口 302 至实际图片 URL。
 */

const PAUGRAM_BASE = 'https://api.paugram.com/wallpaper/?source=sm';

/**
 * @param {string} cacheToken 用于避免浏览器/中间层复用同一随机图
 * @returns {string}
 */
export function buildPaugramWallpaperUrl(cacheToken) {
    const t = encodeURIComponent(String(cacheToken || '').slice(0, 200));
    return PAUGRAM_BASE + (t ? '&_sb=' + t : '');
}
