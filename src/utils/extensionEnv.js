/**
 * 跨浏览器扩展环境（Chrome / Firefox WebExtensions）
 * Firefox：https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions
 */

/** 是否在 Firefox 中运行（扩展页内 navigator） */
export function isFirefoxExtensionContext() {
    if (typeof navigator === 'undefined') return false;
    return /Firefox\//i.test(navigator.userAgent);
}

/**
 * 打开原生「书签管理器」的 URL：Chrome 为 chrome://bookmarks/；Firefox 为 about:library（资料库/书签）
 */
export function bookmarkManagerTabUrl() {
    return isFirefoxExtensionContext() ? 'about:library' : 'chrome://bookmarks/';
}

/**
 * 是否为用户新开的默认新标签页 URL（用于替换为新标签页扩展页）
 * Chrome：chrome://newtab/；Firefox：about:newtab / about:home 等
 */
export function isBrowserDefaultNewTabUrl(url) {
    if (!url || typeof url !== 'string') return false;
    if (url === 'chrome://newtab/') return true;
    if (url === 'about:newtab' || url === 'about:home') return true;
    if (url.startsWith('about:newtab?')) return true;
    return false;
}
