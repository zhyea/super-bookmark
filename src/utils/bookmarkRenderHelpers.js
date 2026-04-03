/**
 * 纯函数：过滤书签、标签、favicon、图标色（供 Vue 与旧 render 共用）
 */
import { CARD_ICON_BACKGROUND_COLORS } from '../services/constants.js';
import { BookmarkNavBuild } from '../services/bookmarkNavBuild.js';

export const ICON_COLORS = CARD_ICON_BACKGROUND_COLORS;

export function navDisplayTitle(item, t) {
    const fn = typeof t === 'function' ? t : (k) => k;
    if (item && item.titleI18nKey) return fn(item.titleI18nKey);
    return item && item.title ? item.title : '';
}

export function getFirstChar(title) {
    if (!title || typeof title !== 'string') return '?';
    const match = title.match(/[\u4e00-\u9fa5a-zA-Z]/);
    return match ? match[0].toUpperCase() : '?';
}

/** 书签卡片网格单列最小宽度（px），与 CSS minmax 一致 */
export const GRID_CARD_MIN_PX = 240;

/** 根据容器宽度与设置中的列数上限，得到实际 CSS grid 列数（与书签区 minmax 一致） */
export function effectiveGridColumnCount(containerWidth, columnsSetting) {
    const cols = columnsSetting ?? 3;
    const w = containerWidth || 300;
    return Math.min(cols, Math.max(1, Math.floor(w / GRID_CARD_MIN_PX)));
}

/** 当前一级导航项：含当前二级目录所属根目录（多根合并顶栏时由 currentSecondaryId 反查） */
export function getCurrentPrimary(state) {
    const nav = state.navData;
    if (!nav || !nav.length) return null;
    const sid = state.currentSecondaryId;
    if (sid != null) {
        for (const p of nav) {
            if (p.secondaries && p.secondaries.some((s) => String(s.id) === String(sid))) {
                return p;
            }
        }
    }
    return nav[state.currentPrimaryIndex] || null;
}

/** 当前二级导航项：在所有根目录下查找（与合并后的顶栏二级菜单一致） */
export function getCurrentSecondary(state) {
    const nav = state.navData;
    if (!nav || !nav.length) return null;
    const sid = state.currentSecondaryId;
    if (sid == null) return null;
    for (const p of nav) {
        if (!p.secondaries) continue;
        const s = p.secondaries.find((x) => String(x.id) === String(sid));
        if (s) return s;
    }
    return null;
}

/**
 * 多个一级根目录时：合并所有二级目录到顶栏一行展示，并做跨根重名区分
 */
export function mergeSecondariesForTopNav(navData) {
    if (!navData || navData.length <= 1) return [];
    const out = [];
    for (const p of navData) {
        if (p.secondaries && p.secondaries.length) {
            out.push(...p.secondaries);
        }
    }
    if (out.length && BookmarkNavBuild.disambiguateSecondaryTitles) {
        BookmarkNavBuild.disambiguateSecondaryTitles(out);
    }
    return out;
}

/** 文件夹标签 + 用户标签（供过滤、搜索、标签栏聚合共用） */
function mergedTags(secondary, b) {
    const folderTags = b.tags || [];
    const userTags = (secondary._userTags && secondary._userTags[b.id]) || [];
    return { folderTags, userTags, allTags: [...folderTags, ...userTags] };
}

/** 当前侧栏/单屏下列表对应的书签数组（未做标签与搜索过滤） */
export function getScopeBookmarksList(state, secondary) {
    if (!secondary) return [];
    if (secondary.isOverviewAll) {
        return secondary.bookmarks || [];
    }
    if (secondary.sides && secondary.sides.length) {
        const side = secondary.sides.find((sd) => String(sd.id) === String(state.currentSideId));
        return side ? side.bookmarks || [] : secondary.sides[0].bookmarks || [];
    }
    return secondary.bookmarks || [];
}

export function getFilteredBookmarks(state, searchTerm) {
    const secondary = getCurrentSecondary(state);
    if (!secondary) return [];
    let list = getScopeBookmarksList(state, secondary);
    if (state.selectedTag) {
        const tag = state.selectedTag;
        list = list.filter((b) => {
            const { folderTags, userTags } = mergedTags(secondary, b);
            return folderTags.includes(tag) || userTags.includes(tag);
        });
    }
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        list = list.filter((b) => {
            const { allTags } = mergedTags(secondary, b);
            const titleMatch = b.title && b.title.toLowerCase().includes(term);
            const tagMatch = allTags.some((x) => x && String(x).toLowerCase().includes(term));
            const urlMatch = b.url && String(b.url).toLowerCase().includes(term);
            const desc = secondary._descriptions && secondary._descriptions[b.id];
            const descMatch = desc && String(desc).toLowerCase().includes(term);
            return titleMatch || tagMatch || urlMatch || descMatch;
        });
    }
    return list;
}

/**
 * 「全部」一览：按二级目录分组，并应用标签与搜索过滤（无匹配的分组不返回）
 */
export function getOverviewFilteredGroups(state, secondary, searchTerm) {
    if (!secondary || !secondary.isOverviewAll || !secondary.overviewGroups) return [];
    const term = (searchTerm || '').toLowerCase();
    const selectedTag = state.selectedTag;
    return secondary.overviewGroups
        .map(function (g) {
            let list = g.bookmarks.slice();
            if (selectedTag) {
                const tag = selectedTag;
                list = list.filter(function (b) {
                    const { folderTags, userTags } = mergedTags(secondary, b);
                    return folderTags.includes(tag) || userTags.includes(tag);
                });
            }
            if (term) {
                list = list.filter(function (b) {
                    const { allTags } = mergedTags(secondary, b);
                    const titleMatch = b.title && b.title.toLowerCase().includes(term);
                    const tagMatch = allTags.some(function (x) {
                        return x && String(x).toLowerCase().includes(term);
                    });
                    const urlMatch = b.url && String(b.url).toLowerCase().includes(term);
                    const desc = secondary._descriptions && secondary._descriptions[b.id];
                    const descMatch = desc && String(desc).toLowerCase().includes(term);
                    return titleMatch || tagMatch || urlMatch || descMatch;
                });
            }
            return {
                folderId: g.folderId,
                title: g.title,
                titleI18nKey: g.titleI18nKey || '',
                primaryTitle: g.primaryTitle || '',
                bookmarks: list
            };
        })
        .filter(function (g) {
            return g.bookmarks.length > 0;
        });
}

export function getCurrentScopeTags(state, secondary) {
    if (!secondary) return [];
    const scopeList = getScopeBookmarksList(state, secondary);
    const tagSet = new Set();
    scopeList.forEach(function (b) {
        mergedTags(secondary, b).allTags.forEach(function (t) {
            if (t) tagSet.add(t);
        });
    });
    return Array.from(tagSet).sort();
}

export function faviconUrl(url) {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
        return parsed.origin + '/favicon.ico';
    } catch (_) {
        return '';
    }
}

export function getIconColorForChar(firstChar) {
    const code = (firstChar && firstChar.charCodeAt(0)) || 0;
    return ICON_COLORS[code % ICON_COLORS.length];
}
