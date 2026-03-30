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
        list = list.filter((b) => {
            const folderTags = b.tags || [];
            const userTags = (secondary._userTags && secondary._userTags[b.id]) || [];
            return folderTags.includes(state.selectedTag) || userTags.includes(state.selectedTag);
        });
    }
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        list = list.filter((b) => {
            const folderTags = b.tags || [];
            const userTags = (secondary._userTags && secondary._userTags[b.id]) || [];
            const allTags = [...folderTags, ...userTags];
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
        const folderTags = b.tags || [];
        const userTags = (secondary._userTags && secondary._userTags[b.id]) || [];
        folderTags.forEach(function (t) {
            if (t) tagSet.add(t);
        });
        userTags.forEach(function (t) {
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
