/**
 * 跨浏览器扩展环境探测（Chrome / Firefox WebExtension）。
 * 业务代码仍以 chrome.* 回调为主；Firefox 对 chrome 命名空间有兼容实现。
 */

/** 是否在 Firefox 扩展环境（用于少数与 Chromium 行为不同的分支） */
export function isFirefoxExtension() {
    try {
        return (
            typeof browser !== 'undefined' &&
            browser.runtime &&
            typeof browser.runtime.getBrowserInfo === 'function'
        );
    } catch {
        return false;
    }
}

/**
 * 系统内置「书签管理器」页 URL（扩展内打开新标签用）。
 * Chromium 使用 chrome://bookmarks/；Firefox 使用书签库页面。
 */
export function nativeBookmarkManagerUrl() {
    return isFirefoxExtension()
        ? 'chrome://browser/content/places/places.xhtml'
        : 'chrome://bookmarks/';
}
