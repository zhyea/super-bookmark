/**
 * 点击扩展图标时打开插件内容页（极简/完整模式由 index.html 内切换）
 * Chrome / Firefox 均提供 chrome.* 兼容层；无则回退 browser.*
 */
(function () {
    var ext = typeof chrome !== 'undefined' && chrome.runtime ? chrome : typeof browser !== 'undefined' && browser.runtime ? browser : null;
    if (!ext) return;

    function isDefaultNewTabUrl(url) {
        if (!url) return false;
        if (url === 'chrome://newtab/') return true;
        if (url === 'about:newtab' || url === 'about:home') return true;
        if (url.indexOf('about:newtab?') === 0) return true;
        return false;
    }

    ext.action.onClicked.addListener(function () {
        ext.tabs.create({ url: ext.runtime.getURL('index.html?from=action') });
    });

    /** 替换默认新标签页：Chrome 为 chrome://newtab/；Firefox 为 about:newtab / about:home 等 */
    ext.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
        var url = changeInfo.url || (tab && tab.url);
        if (!isDefaultNewTabUrl(url)) return;
        ext.storage.local.get('bookmarkManagerSettings', function (data) {
            var s = (data && data.bookmarkManagerSettings) || {};
            if (s.replaceDefaultNewTab) {
                ext.tabs.update(tabId, { url: ext.runtime.getURL('index.html') });
            }
        });
    });
})();
