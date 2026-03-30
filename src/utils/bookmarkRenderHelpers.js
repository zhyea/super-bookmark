/**
 * 纯函数：过滤书签、标签、favicon、图标色（供 Vue 与旧 render 共用）
 */
import { CARD_ICON_BACKGROUND_COLORS } from '../services/constants.js';

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

/** 当前一级导航项（与顶栏选中一致） */
export function getCurrentPrimary(state) {
    const nav = state.navData;
    if (!nav || !nav.length) return null;
    return nav[state.currentPrimaryIndex] || null;
}

/** 当前二级导航项（与次栏选中一致） */
export function getCurrentSecondary(state) {
    const primary = getCurrentPrimary(state);
    if (!primary || !primary.secondaries) return null;
    return primary.secondaries.find((s) => String(s.id) === String(state.currentSecondaryId)) || null;
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
