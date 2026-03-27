/**
 * 书签数据与存储：从 Chrome 书签树构建导航数据、标签读写
 */
(function(global) {
    const TAGS_STORAGE_KEY = 'bookmarkTags';
    const ICON_COLOR_STORAGE_KEY = 'bookmarkIconColors';
    const DESCRIPTION_STORAGE_KEY = 'bookmarkDescriptions';
    const SETTINGS_STORAGE_KEY = 'bookmarkManagerSettings';

    const DEFAULT_VISIBLE_ROOTS = { bar: true, other: true, mobile: true, others: true };

    function normalizeVisibleRoots(v) {
        const d = { bar: true, other: true, mobile: true, others: true };
        if (!v || typeof v !== 'object') return d;
        if (typeof v.bar === 'boolean') d.bar = v.bar;
        if (typeof v.other === 'boolean') d.other = v.other;
        if (typeof v.mobile === 'boolean') d.mobile = v.mobile;
        if (typeof v.others === 'boolean') d.others = v.others;
        if (!d.bar && !d.other && !d.mobile && !d.others) {
            return { bar: true, other: true, mobile: true, others: true };
        }
        return d;
    }

    /** 将内置顶层文件夹归类为 bar / other / mobile（与 isChromeBarOrOtherRoot 一致） */
    function classifyBuiltinRoot(node) {
        if (!node || node.url || !node.children) return null;
        const id = String(node.id);
        if (id === '1') return 'bar';
        if (id === '2') return 'other';
        if (id === '3') return 'mobile';
        const title = (node.title || '').trim();
        const tl = title.toLowerCase();
        if (['Bookmarks bar', '书签栏'].indexOf(title) !== -1) return 'bar';
        if (['Other bookmarks', '其它书签'].indexOf(title) !== -1) return 'other';
        if (tl === 'mobile bookmarks' || title === '移动设备书签') return 'mobile';
        return null;
    }

    function escapeHtml(text) {
        if (text == null) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /** 递归收集某节点下的所有书签，path 为当前路径（L3 及以下文件夹名作为 tag） */
    function collectBookmarks(node, path, out) {
        if (!node.children) {
            if (node.url) {
                out.push({ id: node.id, title: node.title || '', url: node.url, tags: path.slice() });
            }
            return;
        }
        for (const child of node.children) {
            if (child.url) {
                out.push({ id: child.id, title: child.title || '', url: child.url, tags: path.slice() });
            } else {
                collectBookmarks(child, path.concat(child.title || ''), out);
            }
        }
    }

    /** Chrome 内置顶层文件夹：书签栏、其它书签、移动设备书签（多语言 + 常见 id） */
    function isChromeBarOrOtherRoot(node) {
        if (!node || node.url || !node.children) return false;
        const id = String(node.id);
        if (id === '1' || id === '2' || id === '3') return true;
        const t = (node.title || '').trim();
        if (['Bookmarks bar', 'Other bookmarks', '书签栏', '其它书签'].indexOf(t) !== -1) return true;
        const tl = t.toLowerCase();
        if (tl === 'mobile bookmarks') return true;
        return t === '移动设备书签';
    }

    /** 由二级文件夹（L2）生成一条 secondary 配置 */
    function secondaryFromL2Folder(l2) {
        const l3Folders = (l2.children || []).filter(n => !n.url && n.children);
        const l2DirectLinks = (l2.children || []).filter(n => n.url).map(n => ({
            id: n.id,
            title: n.title || '',
            url: n.url,
            tags: []
        }));
        if (l3Folders.length === 0) {
            const bookmarks = [];
            collectBookmarks(l2, [], bookmarks);
            const allTags = [...new Set(bookmarks.flatMap(b => b.tags))].filter(Boolean).sort();
            return {
                id: l2.id,
                title: l2.title || '未命名',
                bookmarks,
                allTags,
                sides: [{ id: l2.id, title: l2.title || '未命名', bookmarks }]
            };
        }
        const sides = [];
        if (l2DirectLinks.length > 0) {
            sides.push({
                id: l2.id + '_direct',
                title: l2.title || '未命名',
                bookmarks: l2DirectLinks
            });
        }
        const allBookmarks = l2DirectLinks.slice();
        for (const l3 of l3Folders) {
            const bookmarks = [];
            collectBookmarks(l3, [], bookmarks);
            allBookmarks.push(...bookmarks);
            sides.push({ id: l3.id, title: l3.title || '未命名', bookmarks });
        }
        const allTags = [...new Set(allBookmarks.flatMap(b => b.tags))].filter(Boolean).sort();
        return {
            id: l2.id,
            title: l2.title || '未命名',
            bookmarks: allBookmarks,
            allTags,
            sides
        };
    }

    /**
     * 合并「书签栏」「其它书签」「移动设备书签」：三者下所有子文件夹作为顶部二级菜单；
     * 各根目录下的直接书签合并为一个「未分类」（置于最后）。
     */
    function buildMergedBarOtherPrimary(mergeRoots) {
        if (!mergeRoots || !mergeRoots.length) return null;
        const order = ['1', '2', '3'];
        mergeRoots.sort(function(a, b) {
            const ia = order.indexOf(String(a.id));
            const ib = order.indexOf(String(b.id));
            return (ia >= 0 ? ia : 99) - (ib >= 0 ? ib : 99);
        });
        const secondaries = [];
        const uncatDirect = [];
        for (let m = 0; m < mergeRoots.length; m++) {
            const l1 = mergeRoots[m];
            const l2Folders = (l1.children || []).filter(function(n) { return !n.url && n.children; });
            for (let k = 0; k < l2Folders.length; k++) {
                secondaries.push(secondaryFromL2Folder(l2Folders[k]));
            }
            const directs = (l1.children || []).filter(function(n) { return n.url; }).map(function(n) {
                return { id: n.id, title: n.title || '', url: n.url, tags: [] };
            });
            for (let d = 0; d < directs.length; d++) uncatDirect.push(directs[d]);
        }
        if (uncatDirect.length) {
            secondaries.push({
                id: 'MERGED_UNCAT',
                title: '未分类',
                titleI18nKey: 'uncategorized',
                bookmarks: uncatDirect,
                allTags: [],
                sides: [{ id: 'MERGED_UNCAT', title: '未分类', titleI18nKey: 'uncategorized', bookmarks: uncatDirect.slice() }]
            });
        }
        if (!secondaries.length) return null;
        return {
            title: '书签',
            folderId: '1',
            isMergedRoots: true,
            secondaries: secondaries
        };
    }

    /** 从 Chrome 书签树构建 navData：一级=primary，二级=header 菜单；直接在一级下的书签归为虚拟二级「未分类」并置于最后；
     *  书签栏 + 其它书签 + 移动设备书签合并为一级「书签」；每个二级下的分类：side 菜单 = 二级名称（直接书签）+ 三级目录名 */
    function buildNavData(tree, visibleRoots) {
        const result = [];
        if (!tree || !tree.length) return result;
        const vr = normalizeVisibleRoots(visibleRoots);

        for (const root of tree) {
            const children = root.children;
            if (!children || !children.length) continue;

            const l1Folders = children.filter(n => !n.url && n.children);
            const mergeRootsAll = l1Folders.filter(isChromeBarOrOtherRoot);
            const mergeRoots = mergeRootsAll.filter(function(n) {
                const k = classifyBuiltinRoot(n);
                if (k === 'bar') return vr.bar;
                if (k === 'other') return vr.other;
                if (k === 'mobile') return vr.mobile;
                return true;
            });
            const otherL1 = l1Folders.filter(function(n) { return !isChromeBarOrOtherRoot(n); });

            const merged = buildMergedBarOtherPrimary(mergeRoots);
            if (merged) result.push(merged);

            for (const l1 of otherL1) {
                if (!vr.others) continue;
                const l2Folders = (l1.children || []).filter(n => !n.url && n.children);
                const l1DirectLinks = (l1.children || []).filter(n => n.url).map(n => ({
                    id: n.id,
                    title: n.title || '',
                    url: n.url,
                    tags: []
                }));

                if (l2Folders.length === 0) {
                    const bookmarks = [];
                    collectBookmarks(l1, [], bookmarks);
                    if (bookmarks.length === 0) continue;
                    const allTags = [...new Set(bookmarks.flatMap(b => b.tags))].filter(Boolean).sort();
                    result.push({
                        title: l1.title || '未命名',
                        folderId: l1.id,
                        secondaries: [{
                            id: l1.id + '_uncat',
                            title: '未分类',
                            titleI18nKey: 'uncategorized',
                            bookmarks,
                            allTags,
                            sides: [{ id: l1.id + '_uncat', title: '未分类', titleI18nKey: 'uncategorized', bookmarks }]
                        }]
                    });
                } else {
                    const secondaries = [];
                    for (const l2 of l2Folders) {
                        secondaries.push(secondaryFromL2Folder(l2));
                    }
                    if (l1DirectLinks.length > 0) {
                        secondaries.push({
                            id: l1.id + '_uncat',
                            title: '未分类',
                            titleI18nKey: 'uncategorized',
                            bookmarks: l1DirectLinks,
                            allTags: [],
                            sides: [{ id: l1.id + '_uncat', title: '未分类', titleI18nKey: 'uncategorized', bookmarks: l1DirectLinks }]
                        });
                    }
                    if (secondaries.length) {
                        result.push({
                            title: l1.title || '未命名',
                            folderId: l1.id,
                            secondaries
                        });
                    }
                }
            }
        }
        return result;
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

    /** 解析逗号分隔的标签字符串为数组 */
    function parseTagInput(str) {
        if (!str || typeof str !== 'string') return [];
        return str.split(/[,，]/).map(s => s.trim()).filter(Boolean);
    }

    /** 拉取完整导航数据（书签树 + 用户标签 + 图标背景色合并），回调 cb(navData) */
    function fetchNavData(cb) {
        chrome.storage.local.get(SETTINGS_STORAGE_KEY, function(store) {
            const s = store[SETTINGS_STORAGE_KEY] || {};
            const visibleRoots = normalizeVisibleRoots(s.visibleRoots);
            chrome.bookmarks.getTree(function(tree) {
            const navData = buildNavData(tree, visibleRoots);
            loadTags(function(tagsMap) {
                loadIconColors(function(iconColorMap) {
                    loadDescriptions(function(descMap) {
                    navData.forEach(function(p) {
                        p.secondaries.forEach(function(s) {
                            s._userTags = {};
                            s._userIconColor = {};
                            s._descriptions = {};
                            s.bookmarks.forEach(function(b) {
                                if (tagsMap[b.id] && tagsMap[b.id].length) s._userTags[b.id] = tagsMap[b.id];
                                if (iconColorMap[b.id]) s._userIconColor[b.id] = iconColorMap[b.id];
                                if (descMap[b.id] != null) s._descriptions[b.id] = descMap[b.id];
                            });
                            const userTagSet = new Set(Object.values(s._userTags).flat());
                            s.allTags = [...new Set([...(s.allTags || []), ...userTagSet])].filter(Boolean).sort();
                        });
                    });
                    cb(navData);
                    });
                });
            });
            });
        });
    }

    global.BookmarkManager = {
        TAGS_STORAGE_KEY,
        ICON_COLOR_STORAGE_KEY,
        DESCRIPTION_STORAGE_KEY,
        SETTINGS_STORAGE_KEY,
        DEFAULT_VISIBLE_ROOTS,
        normalizeVisibleRoots,
        classifyBuiltinRoot,
        loadDescriptions,
        saveDescription,
        escapeHtml,
        collectBookmarks,
        buildNavData,
        loadTags,
        saveTags,
        loadIconColors,
        saveIconColor,
        parseTagInput,
        fetchNavData
    };
})(typeof window !== 'undefined' ? window : this);
