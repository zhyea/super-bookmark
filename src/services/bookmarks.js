/**
 * 书签存储与 API：标签/描述/图标色、拉取合并后的导航数据
 */
import { BookmarkNavBuild as NB } from './bookmarkNavBuild.js';

    const TAGS_STORAGE_KEY = 'bookmarkTags';
    const ICON_COLOR_STORAGE_KEY = 'bookmarkIconColors';
    const DESCRIPTION_STORAGE_KEY = 'bookmarkDescriptions';
    const SETTINGS_STORAGE_KEY = 'bookmarkManagerSettings';

    function escapeHtml(text) {
        if (text == null) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function loadTags(cb) {
        chrome.storage.local.get(TAGS_STORAGE_KEY, function(data) {
            cb(data[TAGS_STORAGE_KEY] || {});
        });
    }

    function saveTags(bookmarkId, tagsArray) {
        loadTags(function(tagsMap) {
            if (tagsArray && tagsArray.length) {
                tagsMap[bookmarkId] = tagsArray;
            } else {
                delete tagsMap[bookmarkId];
            }
            chrome.storage.local.set({ [TAGS_STORAGE_KEY]: tagsMap });
        });
    }

    function loadIconColors(cb) {
        chrome.storage.local.get(ICON_COLOR_STORAGE_KEY, function(data) {
            cb(data[ICON_COLOR_STORAGE_KEY] || {});
        });
    }

    function loadDescriptions(cb) {
        chrome.storage.local.get(DESCRIPTION_STORAGE_KEY, function(data) {
            cb(data[DESCRIPTION_STORAGE_KEY] || {});
        });
    }

    function saveDescription(bookmarkId, text) {
        loadDescriptions(function(map) {
            if (text != null && String(text).trim() !== '') {
                map[bookmarkId] = String(text).trim().slice(0, 100);
            } else {
                delete map[bookmarkId];
            }
            chrome.storage.local.set({ [DESCRIPTION_STORAGE_KEY]: map });
        });
    }

    function saveIconColor(bookmarkId, color, cb) {
        loadIconColors(function(colorMap) {
            if (color != null && color !== '') {
                colorMap[bookmarkId] = color;
            } else {
                delete colorMap[bookmarkId];
            }
            chrome.storage.local.set({ [ICON_COLOR_STORAGE_KEY]: colorMap }, function() {
                if (typeof cb === 'function') cb();
            });
        });
    }

    function parseTagInput(str) {
        if (!str || typeof str !== 'string') return [];
        return str.split(/[,，]/).map(s => s.trim()).filter(Boolean);
    }

    function fetchNavData(cb) {
        chrome.storage.local.get(SETTINGS_STORAGE_KEY, function(store) {
            const s = store[SETTINGS_STORAGE_KEY] || {};
            const visibleRoots = NB.normalizeVisibleRoots(s.visibleRoots);
            chrome.bookmarks.getTree(function(tree) {
                const navData = NB.buildNavData(tree, visibleRoots);
                loadTags(function(tagsMap) {
                    loadIconColors(function(iconColorMap) {
                        loadDescriptions(function(descMap) {
                            navData.forEach(function(p) {
                                p.secondaries.forEach(function(sec) {
                                    sec._userTags = {};
                                    sec._userIconColor = {};
                                    sec._descriptions = {};
                                    sec.bookmarks.forEach(function(b) {
                                        if (tagsMap[b.id] && tagsMap[b.id].length) sec._userTags[b.id] = tagsMap[b.id];
                                        if (iconColorMap[b.id]) sec._userIconColor[b.id] = iconColorMap[b.id];
                                        if (descMap[b.id] != null) sec._descriptions[b.id] = descMap[b.id];
                                    });
                                    const userTagSet = new Set(Object.values(sec._userTags).flat());
                                    sec.allTags = [...new Set([...(sec.allTags || []), ...userTagSet])].filter(Boolean).sort();
                                });
                            });
                            cb(navData);
                        });
                    });
                });
            });
        });
    }

export const BookmarkManager = {
    TAGS_STORAGE_KEY,
    ICON_COLOR_STORAGE_KEY,
    DESCRIPTION_STORAGE_KEY,
    SETTINGS_STORAGE_KEY,
    DEFAULT_VISIBLE_ROOTS: NB.DEFAULT_VISIBLE_ROOTS,
    normalizeVisibleRoots: NB.normalizeVisibleRoots,
    classifyBuiltinRoot: NB.classifyBuiltinRoot,
    loadDescriptions,
    saveDescription,
    escapeHtml,
    collectBookmarks: NB.collectBookmarks,
    buildNavData: NB.buildNavData,
    loadTags,
    saveTags,
    loadIconColors,
    saveIconColor,
    parseTagInput,
    fetchNavData
};

if (typeof window !== 'undefined') {
    window.BookmarkManager = BookmarkManager;
}
