/**
 * 点击扩展图标时打开插件内容页（极简/完整模式由 index.html 内切换）
 */
chrome.action.onClicked.addListener(function () {
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html?from=action') });
});

/** 是否为浏览器默认新标签页 URL（Chromium / Firefox） */
function isBrowserDefaultNewTabUrl(url) {
    if (!url || typeof url !== 'string') return false;
    var base = url.split('#')[0];
    if (base === 'chrome://newtab/' || base === 'chrome://newtab') return true;
    if (base === 'about:newtab' || base === 'about:home') return true;
    return false;
}

/**
 * 若开启「替换默认新标签页」，在用户打开新标签时重定向到扩展页。
 * Chromium 默认新标签为 chrome://newtab/；Firefox 为 about:newtab / about:home。
 */
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    var url = changeInfo.url || (tab && tab.url);
    if (!isBrowserDefaultNewTabUrl(url)) return;
    chrome.storage.local.get('bookmarkManagerSettings', function (data) {
        var s = data.bookmarkManagerSettings || {};
        if (s.replaceDefaultNewTab) {
            chrome.tabs.update(tabId, { url: chrome.runtime.getURL('index.html') });
        }
    });
});
