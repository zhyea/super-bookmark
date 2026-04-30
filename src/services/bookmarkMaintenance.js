/**
 * 书签维护：加载导航、删除/移动/排序书签。
 */
import { BookmarkManager as BM } from './bookmarks.js';
import { preloadFaviconsForBookmarks } from './faviconProvider.js';

function setCurrentSideId(state) {
    const primary = state.navData[state.currentPrimaryIndex];
    const secondary = primary && primary.secondaries.find(function(s) { return String(s.id) === String(state.currentSecondaryId); });
    if (secondary && secondary.sides && secondary.sides.length) {
        const hasCurrent = state.currentSideId != null && secondary.sides.some(function(sd) {
            return String(sd.id) === String(state.currentSideId);
        });
        state.currentSideId = hasCurrent ? state.currentSideId : secondary.sides[0].id;
    } else {
        state.currentSideId = null;
    }
}

/** 从 navData 中收集所有书签（用于 favicon 预加载去重） */
function collectAllBookmarksFromNavData(navData) {
    const out = [];
    for (let i = 0; i < navData.length; i++) {
        const p = navData[i];
        const secs = p.secondaries || [];
        for (let j = 0; j < secs.length; j++) {
            const sec = secs[j];
            if (sec.bookmarks) {
                for (let k = 0; k < sec.bookmarks.length; k++) out.push(sec.bookmarks[k]);
            }
            if (sec.sides) {
                for (let k = 0; k < sec.sides.length; k++) {
                    const side = sec.sides[k];
                    if (side.bookmarks) {
                        for (let m = 0; m < side.bookmarks.length; m++) out.push(side.bookmarks[m]);
                    }
                }
            }
        }
    }
    return out;
}

function loadNavAndRender(state, callbacks) {
    const loadingEl = callbacks.loadingEl;
    const emptyState = callbacks.emptyState;
    const categoryPanel = callbacks.categoryPanel;
    const primaryNav = callbacks.primaryNav;
    const secondaryNav = callbacks.secondaryNav;
    const sideNavList = callbacks.sideNavList;

    if (loadingEl) loadingEl.style.display = 'none';
    BM.fetchNavData(function(navData) {
        state.navData = navData;
        if (typeof state.initialized !== 'undefined') state.initialized = true;
        preloadFaviconsForBookmarks(collectAllBookmarksFromNavData(navData));
        if (!navData.length) {
            if (emptyState) emptyState.style.display = 'block';
            if (categoryPanel) categoryPanel.style.display = 'none';
            if (primaryNav) primaryNav.innerHTML = '';
            if (secondaryNav) secondaryNav.innerHTML = '';
            if (sideNavList) sideNavList.innerHTML = '';
            state.currentSideId = null;
            if (callbacks.renderPrimaryNav) callbacks.renderPrimaryNav();
            if (callbacks.renderSideNav) callbacks.renderSideNav();
            return;
        }
        if (emptyState) emptyState.style.display = 'none';
        state.currentPrimaryIndex = 0;
        state.currentSecondaryId = navData[0].secondaries[0].id;
        setCurrentSideId(state);
        state.selectedTag = null;
        callbacks.renderPrimaryNav();
        callbacks.renderSecondaryNav();
        if (callbacks.renderSideNav) callbacks.renderSideNav();
        callbacks.renderContent();
    });
}

function refreshNavAndRender(state, callbacks) {
    const loadingEl = callbacks.loadingEl;
    const emptyState = callbacks.emptyState;
    const categoryPanel = callbacks.categoryPanel;

    if (loadingEl) loadingEl.style.display = 'none';
    BM.fetchNavData(function(navData) {
        state.navData = navData;
        if (typeof state.initialized !== 'undefined') state.initialized = true;
        preloadFaviconsForBookmarks(collectAllBookmarksFromNavData(navData));
        if (!navData.length) {
            if (emptyState) emptyState.style.display = 'block';
            if (categoryPanel) categoryPanel.style.display = 'none';
            state.currentPrimaryIndex = 0;
            state.currentSecondaryId = null;
            if (callbacks.renderPrimaryNav) callbacks.renderPrimaryNav();
            if (callbacks.renderSecondaryNav) callbacks.renderSecondaryNav();
            if (callbacks.renderSideNav) callbacks.renderSideNav();
            return;
        }
        if (emptyState) emptyState.style.display = 'none';
        const targetParentId = callbacks.targetParentId;
        if (targetParentId) {
            outer: for (let i = 0; i < navData.length; i++) {
                const p = navData[i];
                for (const s of p.secondaries || []) {
                    const folderId = String(s.id).endsWith('_direct') ? String(p.folderId) : String(s.id).replace(/_direct$|_uncat$/, '');
                    if (folderId === String(targetParentId) || String(s.id) === String(targetParentId)) {
                        state.currentPrimaryIndex = i;
                        state.currentSecondaryId = s.id;
                        break outer;
                    }
                }
            }
        } else {
            const pi = state.currentPrimaryIndex;
            const sid = state.currentSecondaryId;
            const primary = navData[pi];
            const hasSecondary = primary && primary.secondaries && primary.secondaries.some(function(s) { return String(s.id) === String(sid); });
            if (!hasSecondary) {
                state.currentPrimaryIndex = 0;
                state.currentSecondaryId = navData[0].secondaries[0].id;
            }
        }
        setCurrentSideId(state);
        if (callbacks.renderPrimaryNav) callbacks.renderPrimaryNav();
        if (callbacks.renderSecondaryNav) callbacks.renderSecondaryNav();
        if (callbacks.renderSideNav) callbacks.renderSideNav();
        if (callbacks.renderContent) callbacks.renderContent();
        if (typeof callbacks.scrollRestore === 'function') callbacks.scrollRestore();
    });
}

function deleteBookmark(id, cb) {
    chrome.bookmarks.remove(id, function() {
        if (chrome.runtime.lastError) return;
        if (typeof cb === 'function') cb();
    });
}

function moveBookmark(id, parentId, cb) {
    chrome.bookmarks.move(id, { parentId: parentId }, function() {
        const err = chrome.runtime.lastError || null;
        if (typeof cb === 'function') cb(err);
    });
}

function reorderBookmark(id, index, cb) {
    chrome.bookmarks.move(id, { index: index }, function() {
        if (chrome.runtime.lastError) return;
        if (typeof cb === 'function') cb();
    });
}

export const BookmarkMaintenance = {
loadNavAndRender,
refreshNavAndRender,
deleteBookmark,
moveBookmark,
reorderBookmark
};

if (typeof window !== 'undefined') {
window.BookmarkMaintenance = BookmarkMaintenance;
}
