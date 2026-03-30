/**
 * 新标签页：拖拽、悬浮滚动、双击编辑、右键菜单、Chrome 书签事件（导航与列表由 Vue 响应式渲染）
 */
import { appRuntime } from '../services/appRuntime.js';
import { getCurrentPrimary, getCurrentSecondary } from '../utils/bookmarkRenderHelpers.js';

export function initBookmarkPage(ctx) {
    const { state, searchTerm } = ctx;
    const EditModal = window.EditModal;
    const BookmarkMaintenance = window.BookmarkMaintenance;
    if (!window.BookmarkManager || !EditModal || !BookmarkMaintenance) return {};

    function applyMainPageStatic() {
        window.BookmarkManagerI18n?.applyMainPageStatic?.();
    }

    const primaryNav = document.getElementById('primaryNav');
    const secondaryNav = document.getElementById('secondaryNav');
    const sideNavList = document.getElementById('sideNavList');
    const contentMain = document.getElementById('contentMain');
    const linksGrid = document.getElementById('linksGrid');

    function currentScrollY() {
        return contentMain
            ? contentMain.scrollTop
            : window.scrollY || document.documentElement.scrollTop;
    }

    function getEditModalOptions() {
        return {
            getPrimary: function () {
                return getCurrentPrimary(state);
            },
            getSecondary: function () {
                return getCurrentSecondary(state);
            },
            getNavData: function () {
                return state.navData;
            },
            onSave: function () {
                if (typeof state.contentVersion !== 'undefined') state.contentVersion++;
            },
            onReload: function (targetParentId) {
                refreshNavAndRender({ targetParentId: targetParentId });
            }
        };
    }

    function openEditForItem(item) {
        if (!item || !item.classList.contains('link-item')) return;
        EditModal.openEditModal(item, getEditModalOptions());
    }

    function noop() {}

    const navCallbacks = {
        loadingEl: null,
        emptyState: null,
        categoryPanel: null,
        primaryNav: null,
        secondaryNav: null,
        sideNavList: null,
        renderPrimaryNav: noop,
        renderSecondaryNav: noop,
        renderSideNav: noop,
        renderContent: noop
    };

    function loadNavAndRender() {
        BookmarkMaintenance.loadNavAndRender(state, navCallbacks);
    }

    function refreshNavAndRender(opts) {
        opts = opts || {};
        const scrollY = opts.scrollY != null ? opts.scrollY : currentScrollY();
        const callbacks = Object.assign({}, navCallbacks);
        if (scrollY > 0) {
            callbacks.scrollRestore = function () {
                requestAnimationFrame(function () {
                    if (contentMain) contentMain.scrollTo(0, scrollY);
                    else window.scrollTo(0, scrollY);
                });
            };
        }
        if (opts.targetParentId != null) callbacks.targetParentId = opts.targetParentId;
        BookmarkMaintenance.refreshNavAndRender(state, callbacks);
    }

    function canReorderCards() {
        return state.selectedTag === null && !searchTerm.value;
    }

    function refreshKeepView() {
        refreshNavAndRender({ scrollY: currentScrollY() });
    }

    function deleteBookmark(id) {
        const item = linksGrid && linksGrid.querySelector('.link-item[data-bookmark-id="' + id + '"]');
        if (item) item.style.animation = 'fadeOut 0.3s ease forwards';
        BookmarkMaintenance.deleteBookmark(id, refreshKeepView);
    }

    appRuntime.bookmarkRefreshKeepView = refreshKeepView;
    appRuntime.bookmarkLinksGridGetter = function () {
        return linksGrid;
    };

    function resolveDropParentId(rawId) {
        let parentId = rawId;
        if (parentId === 'MERGED_UNCAT') {
            return '1';
        }
        if (parentId && String(parentId).endsWith('_uncat')) {
            const primary = getCurrentPrimary(state);
            return primary ? primary.folderId : '';
        }
        if (parentId && String(parentId).endsWith('_direct')) {
            return String(parentId).replace(/_direct$/, '');
        }
        return parentId;
    }

    function bookmarkIdFromTransfer(e) {
        return e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('application/x-bookmark-id');
    }

    function bindNavBookmarkDrop(container, itemSelector, getParentId) {
        if (!container) return;
        container.addEventListener('dragover', function (e) {
            const a = e.target.closest(itemSelector);
            if (!a) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            container.querySelectorAll(itemSelector).forEach((el) => el.classList.remove('drop-target'));
            a.classList.add('drop-target');
        });
        container.addEventListener('dragleave', function (e) {
            if (!container.contains(e.relatedTarget)) {
                container.querySelectorAll(itemSelector).forEach((el) => el.classList.remove('drop-target'));
            }
        });
        container.addEventListener('drop', function (e) {
            const a = e.target.closest(itemSelector);
            if (!a) return;
            e.preventDefault();
            container.querySelectorAll(itemSelector).forEach((el) => el.classList.remove('drop-target'));
            const bookmarkId = bookmarkIdFromTransfer(e);
            const parentId = getParentId(a);
            if (bookmarkId && parentId) BookmarkMaintenance.moveBookmark(bookmarkId, parentId, refreshKeepView);
        });
    }

    bindNavBookmarkDrop(primaryNav, '.primary-nav-item', function (a) {
        return a.dataset.folderId;
    });
    bindNavBookmarkDrop(secondaryNav, '.secondary-nav-item', function (a) {
        return resolveDropParentId(a.dataset.secondaryId);
    });
    bindNavBookmarkDrop(sideNavList, '.side-nav-item', function (a) {
        return resolveDropParentId(a.dataset.sideId);
    });

    if (linksGrid) {
        linksGrid.addEventListener('dragstart', function (e) {
            const item = e.target.closest('.link-item');
            if (!item) return;
            e.dataTransfer.setData('text/plain', item.dataset.bookmarkId);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('application/x-bookmark-id', item.dataset.bookmarkId);
            item.classList.add('dragging');
        });
        linksGrid.addEventListener('dragend', function () {
            document.querySelectorAll('.link-item.dragging').forEach((el) => el.classList.remove('dragging'));
            document.querySelectorAll('.link-item.drop-target-reorder').forEach((el) =>
                el.classList.remove('drop-target-reorder')
            );
            document
                .querySelectorAll(
                    '.primary-nav-item.drop-target, .secondary-nav-item.drop-target, .side-nav-item.drop-target'
                )
                .forEach((el) => el.classList.remove('drop-target'));
        });
        linksGrid.addEventListener('dragover', function (e) {
            const item = e.target.closest('.link-item');
            if (!item || !canReorderCards()) return;
            if (item.classList.contains('dragging')) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            linksGrid.querySelectorAll('.link-item.drop-target-reorder').forEach((el) =>
                el.classList.remove('drop-target-reorder')
            );
            item.classList.add('drop-target-reorder');
        });
        linksGrid.addEventListener('dragleave', function (e) {
            if (!linksGrid.contains(e.relatedTarget)) {
                linksGrid.querySelectorAll('.link-item.drop-target-reorder').forEach((el) =>
                    el.classList.remove('drop-target-reorder')
                );
            }
        });
        linksGrid.addEventListener('drop', function (e) {
            const item = e.target.closest('.link-item');
            if (!item || !canReorderCards()) return;
            e.preventDefault();
            linksGrid.querySelectorAll('.link-item.drop-target-reorder').forEach((el) =>
                el.classList.remove('drop-target-reorder')
            );
            const draggedId = bookmarkIdFromTransfer(e);
            if (!draggedId || item.dataset.bookmarkId === draggedId) return;
            const items = linksGrid.querySelectorAll('.link-item');
            const index = Array.prototype.indexOf.call(items, item);
            if (index === -1) return;
            const savedScrollY = currentScrollY();
            BookmarkMaintenance.reorderBookmark(draggedId, index, function () {
                refreshNavAndRender({ scrollY: savedScrollY });
            });
        });
        linksGrid.addEventListener('contextmenu', function (e) {
            const item = e.target.closest('.link-item');
            if (!item) return;
            e.preventDefault();
            appRuntime.linkContextMenu?.show?.(e.clientX, e.clientY, item.dataset.bookmarkId || '');
        });
        linksGrid.addEventListener('dblclick', function (e) {
            const item = e.target.closest('.link-item');
            if (!item) return;
            if (e.target.closest('.actions')) return;
            e.preventDefault();
            openEditForItem(item);
        });
    }

    const Settings = window.BookmarkManagerSettings;
    if (!Settings) return { openEditForItem, deleteBookmark, refreshKeepView };

    chrome.bookmarks.onRemoved.addListener(refreshKeepView);
    chrome.bookmarks.onCreated.addListener(refreshKeepView);

    function updateScrollButtonVisibility() {
        appRuntime.scrollFloat?.update?.();
    }

    Settings.loadSettings(function () {
        applyMainPageStatic();
        loadNavAndRender();
        if (linksGrid) Settings.renderSettingsUI(linksGrid);
        setTimeout(updateScrollButtonVisibility, 100);
    });

    window.addEventListener('bookmark-locale-changed', function () {
        applyMainPageStatic();
        updateScrollButtonVisibility();
    });

    window.addEventListener('bookmark-visible-roots-changed', function () {
        refreshNavAndRender();
    });

    return { openEditForItem, deleteBookmark, refreshKeepView };
}
