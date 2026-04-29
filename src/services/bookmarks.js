/**
 * 书签存储与 API：标签/描述/图标色、拉取合并后的导航数据
 */
import { BookmarkNavBuild as NB } from './bookmarkNavBuild.js';

    const TAGS_STORAGE_KEY = 'bookmarkTags';
    const ICON_COLOR_STORAGE_KEY = 'bookmarkIconColors';
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

    const CLEANUP_TIMESTAMP_KEY = 'bookmarkCleanupTimestamp';
    const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24小时

    function cleanupOrphanedData(cb) {
        chrome.storage.local.get(CLEANUP_TIMESTAMP_KEY, function(tsData) {
            const lastCleanup = tsData[CLEANUP_TIMESTAMP_KEY] || 0;
            const now = Date.now();
            if (now - lastCleanup < CLEANUP_INTERVAL_MS) {
                if (typeof cb === 'function') cb(false);
                return;
            }
            if (typeof chrome === 'undefined' || !chrome.bookmarks || !chrome.bookmarks.getTree) {
                if (typeof cb === 'function') cb(false);
                return;
            }
            chrome.bookmarks.getTree(function(tree) {
                const validIds = new Set();
                function collectIds(nodes) {
                    for (let i = 0; i < nodes.length; i++) {
                        const node = nodes[i];
                        if (node.url) validIds.add(String(node.id));
                        if (node.children) collectIds(node.children);
                    }
                }
                collectIds(tree);

                const keys = [TAGS_STORAGE_KEY, ICON_COLOR_STORAGE_KEY];
                chrome.storage.local.get(keys, function(data) {
                    let hasChanges = false;
                    const updates = {};

                    for (let ki = 0; ki < keys.length; ki++) {
                        const key = keys[ki];
                        const map = data[key] || {};
                        const cleaned = {};
                        const ids = Object.keys(map);
                        for (let ii = 0; ii < ids.length; ii++) {
                            const id = ids[ii];
                            if (validIds.has(id)) {
                                cleaned[id] = map[id];
                            } else {
                                hasChanges = true;
                            }
                        }
                        updates[key] = cleaned;
                    }

                    updates[CLEANUP_TIMESTAMP_KEY] = now;
                    chrome.storage.local.set(updates, function() {
                        if (typeof cb === 'function') cb(hasChanges);
                    });
                });
            });
        });
    }

    function parseTagInput(str) {
        if (!str || typeof str !== 'string') return [];
        return str.split(/[,，]/).map(s => s.trim()).filter(Boolean);
    }

    function collectBookmarksFromSecondary(sec) {
        if (!sec || sec.isOverviewAll) return [];
        const out = [];
        if (sec.sides && sec.sides.length) {
            for (let si = 0; si < sec.sides.length; si++) {
                const side = sec.sides[si];
                const bm = side.bookmarks || [];
                for (let bi = 0; bi < bm.length; bi++) out.push(bm[bi]);
            }
        } else {
            const bm = sec.bookmarks || [];
            for (let bi = 0; bi < bm.length; bi++) out.push(bm[bi]);
        }
        return out;
    }

    function buildOverviewSecondary(navData) {
        const overviewGroups = [];
        const _userTags = {};
        const _userIconColor = {};
        const allTagsSet = new Set();

        for (let pi = 0; pi < navData.length; pi++) {
            const primary = navData[pi];
            const secs = primary.secondaries || [];
            for (let si = 0; si < secs.length; si++) {
                const sec = secs[si];
                if (sec.id === '__overview_all__') continue;
                const seenIds = new Set();
                const groupBookmarks = [];
                const collect = collectBookmarksFromSecondary(sec);
                for (let ci = 0; ci < collect.length; ci++) {
                    const b = collect[ci];
                    if (seenIds.has(b.id)) continue;
                    seenIds.add(b.id);
                    groupBookmarks.push(b);
                    if (sec._userTags && sec._userTags[b.id]) _userTags[b.id] = sec._userTags[b.id];
                    if (sec._userIconColor && sec._userIconColor[b.id]) _userIconColor[b.id] = sec._userIconColor[b.id];
                    if (sec._userTags && sec._userTags[b.id]) {
                        sec._userTags[b.id].forEach(function(t) {
                            if (t) allTagsSet.add(t);
                        });
                    }
                    const ft = b.tags || [];
                    for (let ti = 0; ti < ft.length; ti++) if (ft[ti]) allTagsSet.add(ft[ti]);
                }
                if (!groupBookmarks.length) continue;
                overviewGroups.push({
                    folderId: sec.id,
                    title: sec.title || '',
                    titleI18nKey: sec.titleI18nKey || '',
                    primaryTitle: primary.title || '',
                    bookmarks: groupBookmarks
                });
            }
        }

        const flatBookmarks = [];
        const seenFlat = new Set();
        for (let gi = 0; gi < overviewGroups.length; gi++) {
            const g = overviewGroups[gi];
            const bm = g.bookmarks;
            for (let bi = 0; bi < bm.length; bi++) {
                const b = bm[bi];
                if (seenFlat.has(b.id)) continue;
                seenFlat.add(b.id);
                flatBookmarks.push(b);
            }
        }

        const overview = {
            id: '__overview_all__',
            title: '全部',
            titleI18nKey: 'overviewAllNav',
            isOverviewAll: true,
            overviewGroups: overviewGroups,
            bookmarks: flatBookmarks,
            allTags: Array.from(allTagsSet).sort(),
            sides: [{ id: '__overview_all__', title: '全部', titleI18nKey: 'overviewAllNav', bookmarks: [] }]
        };
        overview._userTags = _userTags;
        overview._userIconColor = _userIconColor;
        return overview;
    }

    function insertOverviewAfterUncat(secondaries, overviewSec) {
        if (!secondaries || secondaries.some(function(s) { return s.id === '__overview_all__'; })) return;
        let insertAt = -1;
        for (let i = 0; i < secondaries.length; i++) {
            const s = secondaries[i];
            if (s.id === 'MERGED_UNCAT' || s.titleI18nKey === 'uncategorized' || String(s.id).endsWith('_uncat')) {
                insertAt = i + 1;
            }
        }
        if (insertAt >= 0) secondaries.splice(insertAt, 0, overviewSec);
        else secondaries.push(overviewSec);
    }

    function fetchNavData(cb) {
        chrome.storage.local.get(SETTINGS_STORAGE_KEY, function(store) {
            const s = store[SETTINGS_STORAGE_KEY] || {};
            const visibleRoots = NB.normalizeVisibleRoots(s.visibleRoots);
            const showOverviewAllNav = s.showOverviewAllNav === true;
            chrome.bookmarks.getTree(function(tree) {
                const navData = NB.buildNavData(tree, visibleRoots);
                loadTags(function(tagsMap) {
                    loadIconColors(function(iconColorMap) {
                        navData.forEach(function(p) {
                            p.secondaries.forEach(function(sec) {
                                sec._userTags = {};
                                sec._userIconColor = {};
                                sec.bookmarks.forEach(function(b) {
                                    if (tagsMap[b.id] && tagsMap[b.id].length) sec._userTags[b.id] = tagsMap[b.id];
                                    if (iconColorMap[b.id]) sec._userIconColor[b.id] = iconColorMap[b.id];
                                });
                                const userTagSet = new Set(Object.values(sec._userTags).flat());
                                sec.allTags = [...new Set([...(sec.allTags || []), ...userTagSet])].filter(Boolean).sort();
                            });
                        });
                        if (showOverviewAllNav && navData.length) {
                            const overviewSec = buildOverviewSecondary(navData);
                            navData.forEach(function(p) {
                                insertOverviewAfterUncat(p.secondaries, overviewSec);
                            });
                        }
                        cb(navData);
                    });
                });
            });
        });
    }

export const BookmarkManager = {
    TAGS_STORAGE_KEY,
    ICON_COLOR_STORAGE_KEY,
    SETTINGS_STORAGE_KEY,
    CLEANUP_TIMESTAMP_KEY,
    DEFAULT_VISIBLE_ROOTS: NB.DEFAULT_VISIBLE_ROOTS,
    normalizeVisibleRoots: NB.normalizeVisibleRoots,
    classifyBuiltinRoot: NB.classifyBuiltinRoot,
    escapeHtml,
    collectBookmarks: NB.collectBookmarks,
    buildNavData: NB.buildNavData,
    loadTags,
    saveTags,
    loadIconColors,
    saveIconColor,
    parseTagInput,
    fetchNavData,
    cleanupOrphanedData
};

if (typeof window !== 'undefined') {
    window.BookmarkManager = BookmarkManager;
}
