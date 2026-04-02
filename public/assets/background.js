/**
 * 点击扩展图标时打开插件内容页（极简模式开启时打开 simple.html）
 */
chrome.action.onClicked.addListener(function() {
    chrome.storage.local.get('bookmarkManagerSettings', function(data) {
        var s = data.bookmarkManagerSettings || {};
        var page = s.useSimplePage ? 'simple.html' : 'index.html';
        chrome.tabs.create({ url: chrome.runtime.getURL(page + '?from=action') });
    });
});

/** 若开启“替换默认新标签页”，在用户打开新标签时重定向到扩展页（仅识别 chrome 默认新标签页） */
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    var url = changeInfo.url || (tab && tab.url);
    if (url !== 'chrome://newtab/') return;
    chrome.storage.local.get('bookmarkManagerSettings', function(data) {
        var s = data.bookmarkManagerSettings || {};
        if (s.replaceDefaultNewTab) {
            var page = s.useSimplePage ? 'simple.html' : 'index.html';
            chrome.tabs.update(tabId, { url: chrome.runtime.getURL(page) });
        }
    });
});
