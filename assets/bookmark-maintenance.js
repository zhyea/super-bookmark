/**
 * 书签维护：加载导航、删除/移动/排序书签。依赖 bookmarks.js
 */
(function(global) {
    const BM = global.BookmarkManager;
    if (!BM) return;

    function setCurrentSideId(state) {
        const primary = state.navData[state.currentPrimaryIndex];
        const secondary = primary && primary.secondaries.find(function(s) { return String(s.id) === String(state.currentSecondaryId); });
        if (secondary && secondary.sides && secondary.sides.length) {
            state.currentSideId = secondary.sides[0].id;
        } else {
            state.currentSideId = null;
        }
    }

    function loadNavAndRender(state, callbacks) {
        const loadingEl = callbacks.loadingEl;
        const emptyState = callbacks.emptyState;
        const categoryPanel = callbacks.categoryPanel;
        const primaryNavList = callbacks.primaryNavList;
        const secondaryNav = callbacks.secondaryNav;
        const sideNavList = callbacks.sideNavList;

        loadingEl.style.display = 'none';
        BM.fetchNavData(function(navData) {
            state.navData = navData;
            if (!navData.length) {
                emptyState.style.display = 'block';
                categoryPanel.style.display = 'none';
                if (primaryNavList) primaryNavList.innerHTML = '';
                if (secondaryNav) secondaryNav.innerHTML = '';
                if (sideNavList) sideNavList.innerHTML = '';
                state.currentSideId = null;
                return;
            }
            emptyState.style.display = 'none';
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

        loadingEl.style.display = 'none';
        BM.fetchNavData(function(navData) {
            state.navData = navData;
            if (!navData.length) {
                emptyState.style.display = 'block';
                categoryPanel.style.display = 'none';
                state.currentPrimaryIndex = 0;
                state.currentSecondaryId = null;
                if (callbacks.renderPrimaryNav) callbacks.renderPrimaryNav();
                if (callbacks.renderSecondaryNav) callbacks.renderSecondaryNav();
                return;
            }
            emptyState.style.display = 'none';
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

    global.BookmarkMaintenance = {
        loadNavAndRender,
        refreshNavAndRender,
        deleteBookmark,
        moveBookmark,
        reorderBookmark
    };
})(typeof window !== 'undefined' ? window : this);
