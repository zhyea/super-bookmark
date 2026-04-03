/**
 * 点击扩展图标时打开插件内容页（极简/完整模式由 index.html 内切换）
 */
chrome.action.onClicked.addListener(function() {
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html?from=action') });
});

/** 若开启“替换默认新标签页”，在用户打开新标签时重定向到扩展页（识别 Edge / Chromium 默认新标签页） */
function isDefaultNewTabUrl(url) {
    if (!url || typeof url !== 'string') return false;
    if (url === 'chrome://newtab/') return true;
    if (url === 'edge://newtab' || url === 'edge://newtab/') return true;
    return url.indexOf('chrome-search://local-ntp') === 0;
}
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    var url = changeInfo.url || (tab && tab.url);
    if (!isDefaultNewTabUrl(url)) return;
    chrome.storage.local.get('bookmarkManagerSettings', function(data) {
        var s = data.bookmarkManagerSettings || {};
        if (s.replaceDefaultNewTab) {
            chrome.tabs.update(tabId, { url: chrome.runtime.getURL('index.html') });
        }
    });
});
