/**
 * 新标签页主逻辑：导航与渲染调度、拖拽、悬浮链接提示、双击编辑、右键菜单
 * 依赖：bookmarks.js、edit.js、bookmark-maintenance.js、render.js、settings.js
 */
document.addEventListener('DOMContentLoaded', function() {
    const BM = window.BookmarkManager;
    const EditModal = window.EditModal;
    const BookmarkMaintenance = window.BookmarkMaintenance;
    const NewTabRender = window.NewTabRender;
    if (!BM || !EditModal || !BookmarkMaintenance || !NewTabRender) return;

    const primaryNavList = document.getElementById('primaryNavList');
    const secondaryNav = document.getElementById('secondaryNav');
    const sideNavList = document.getElementById('sideNavList');
    const loadingEl = document.getElementById('loading');
    const emptyState = document.getElementById('emptyState');
    const categoryPanel = document.getElementById('categoryPanel');
    const categoryTitle = document.getElementById('categoryTitle');
    const tagBar = document.getElementById('tagBar');
    const tagBarOuter = document.getElementById('tagBarOuter');
    const tagBarPrev = document.getElementById('tagBarPrev');
    const tagBarNext = document.getElementById('tagBarNext');
    const linksGrid = document.getElementById('linksGrid');
    const searchInput = document.getElementById('searchInput');
    const contentMain = document.getElementById('contentMain');
    const mainContentWrap = document.querySelector('.main-content');

    const escapeHtml = BM.escapeHtml;

    /** 当前顶部菜单（二级）无子目录（无多个 sides）时不展示侧边栏 */
    function updateSidebarVisibility() {
        if (!mainContentWrap) return;
        const primary = state.navData[state.currentPrimaryIndex];
        const secondary = primary && primary.secondaries && primary.secondaries.find(s => String(s.id) === String(state.currentSecondaryId));
        const hasSubDirs = secondary && secondary.sides && secondary.sides.length > 1;
        mainContentWrap.classList.toggle('sidebar-hidden', !hasSubDirs);
    }

    const state = {
        navData: [],
        currentPrimaryIndex: 0,
        currentSecondaryId: null,
        currentSideId: null,
        selectedTag: null
    };
    let searchTerm = '';
    let searchTimeout = null;

    function getEditModalOptions(item) {
        return {
            getPrimary: function() { return state.navData[state.currentPrimaryIndex]; },
            getSecondary: function() {
                const p = state.navData[state.currentPrimaryIndex];
                return p && p.secondaries.find(s => String(s.id) === String(state.currentSecondaryId));
            },
            getNavData: function() { return state.navData; },
            onSave: function(id, tagsArray) {
                state.navData.forEach(p => {
                    p.secondaries.forEach(s => {
                        if (!s._userTags) s._userTags = {};
                        if (tagsArray && tagsArray.length) s._userTags[id] = tagsArray;
                        else delete s._userTags[id];
                        const userTagSet = new Set(Object.values(s._userTags).flat());
                        s.allTags = [...new Set([...(s.allTags || []), ...userTagSet])].filter(Boolean).sort();
                    });
                });
                renderContent();
            },
            onReload: function(targetParentId) { refreshNavAndRender({ targetParentId: targetParentId }); }
        };
    }

    function openEditForItem(item) {
        if (!item || !item.classList.contains('link-item')) return;
        EditModal.openEditModal(item, getEditModalOptions(item));
    }

    function loadNavAndRender() {
        BookmarkMaintenance.loadNavAndRender(state, navCallbacks);
    }

    function refreshNavAndRender(opts) {
        opts = opts || {};
        const scrollEl = contentMain || document.documentElement;
        const scrollY = opts.scrollY != null ? opts.scrollY : (contentMain ? contentMain.scrollTop : (window.scrollY || document.documentElement.scrollTop));
        const callbacks = Object.assign({}, navCallbacks);
        if (scrollY > 0) {
            callbacks.scrollRestore = function() {
                requestAnimationFrame(function() {
                    if (contentMain) contentMain.scrollTo(0, scrollY);
                    else window.scrollTo(0, scrollY);
                });
            };
        }
        if (opts.targetParentId != null) callbacks.targetParentId = opts.targetParentId;
        BookmarkMaintenance.refreshNavAndRender(state, callbacks);
    }

    function updatePrimaryActive() {
        if (!primaryNavList) return;
        primaryNavList.querySelectorAll('.primary-nav-item').forEach((a, i) => {
            a.classList.toggle('active', i === state.currentPrimaryIndex);
        });
    }

    function updateSecondaryActive() {
        if (!secondaryNav) return;
        secondaryNav.querySelectorAll('.secondary-nav-item').forEach(el => {
            el.classList.toggle('active', String(el.dataset.secondaryId) === String(state.currentSecondaryId));
        });
    }

    function updateSideActive() {
        if (!sideNavList) return;
        sideNavList.querySelectorAll('.side-nav-item').forEach(el => {
            el.classList.toggle('active', String(el.dataset.sideId) === String(state.currentSideId));
        });
    }

    function setCurrentSideFromSecondary() {
        const primary = state.navData[state.currentPrimaryIndex];
        const secondary = primary && primary.secondaries.find(s => String(s.id) === String(state.currentSecondaryId));
        if (secondary && secondary.sides && secondary.sides.length) {
            state.currentSideId = secondary.sides[0].id;
        } else {
            state.currentSideId = null;
        }
    }

    function renderPrimaryNav() {
        NewTabRender.renderPrimaryNav(state, primaryNavList, escapeHtml);
        if (primaryNavList) {
            primaryNavList.querySelectorAll('.primary-nav-item').forEach(a => {
                a.addEventListener('click', function(e) {
                    e.preventDefault();
                    state.currentPrimaryIndex = parseInt(this.dataset.primaryIndex, 10);
                    const primary = state.navData[state.currentPrimaryIndex];
                    state.currentSecondaryId = primary.secondaries[0].id;
                    setCurrentSideFromSecondary();
                    state.selectedTag = null;
                    renderSecondaryNav();
                    renderSideNav();
                    renderContent();
                    updatePrimaryActive();
                    updateSecondaryActive();
                    updateSideActive();
                });
            });
        }
        updatePrimaryActive();
    }

    function renderSecondaryNav() {
        NewTabRender.renderSecondaryNav(state, secondaryNav, escapeHtml);
        if (secondaryNav) {
            secondaryNav.querySelectorAll('.secondary-nav-item').forEach(a => {
                a.addEventListener('click', function(e) {
                    e.preventDefault();
                    state.currentSecondaryId = this.dataset.secondaryId;
                    setCurrentSideFromSecondary();
                    state.selectedTag = null;
                    renderSideNav();
                    renderContent();
                    updateSecondaryActive();
                    updateSideActive();
                });
            });
        }
        updateSecondaryActive();
        updateSidebarVisibility();
    }

    function renderSideNav() {
        NewTabRender.renderSideNav(state, sideNavList, escapeHtml);
        if (sideNavList) {
            sideNavList.querySelectorAll('.side-nav-item').forEach(a => {
                a.addEventListener('click', function(e) {
                    e.preventDefault();
                    state.currentSideId = this.dataset.sideId;
                    state.selectedTag = null;
                    renderContent();
                    updateSideActive();
                });
            });
        }
        updateSideActive();
        updateSidebarVisibility();
    }

    function renderContent() {
        const elements = {
            linksGrid, tagBar, categoryTitle, categoryPanel, loadingEl, emptyState
        };
        const options = {
            showActions: !!(window.__settings && window.__settings.showActions),
            columns: window.__settings ? window.__settings.columns : 3,
            setHideCardActions: function(hide) { document.body.classList.toggle('hide-card-actions', hide); }
        };
        NewTabRender.renderContent(state, searchTerm, elements, escapeHtml, options);

        tagBar.querySelectorAll('.tag-pill').forEach(pill => {
            pill.addEventListener('click', function() {
                state.selectedTag = this.dataset.tag || null;
                renderContent();
            });
        });

        linksGrid.querySelectorAll('.card-icon-img').forEach(img => {
            img.addEventListener('load', function() { this.classList.add('loaded'); });
            img.addEventListener('error', function() { this.classList.add('error'); });
        });

        linksGrid.querySelectorAll('.action-delete').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const item = this.closest('.link-item');
                const id = item.dataset.bookmarkId;
                item.style.animation = 'fadeOut 0.3s ease forwards';
                BookmarkMaintenance.deleteBookmark(id, loadNavAndRender);
            });
        });

        linksGrid.querySelectorAll('.action-edit').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                openEditForItem(this.closest('.link-item'));
            });
        });

        linksGrid.querySelectorAll('.link-item').forEach(item => {
            item.addEventListener('dblclick', function(e) {
                if (e.target.closest('.actions')) return;
                e.preventDefault();
                openEditForItem(this);
            });
        });

        bindContextMenu(linksGrid);

        if (typeof updateScrollButtonVisibility === 'function') updateScrollButtonVisibility();
        if (typeof updateTagBarArrows === 'function') {
            requestAnimationFrame(function() { updateTagBarArrows(); });
        }
    }

    function updateTagBarArrows() {
        if (!tagBar || !tagBarOuter) return;
        var maxScroll = tagBar.scrollWidth - tagBar.clientWidth;
        var overflow = maxScroll > 6;
        tagBarOuter.classList.toggle('tag-bar-overflow', overflow);
        if (tagBarPrev) {
            tagBarPrev.classList.remove('tag-bar-arrow-visible');
            tagBarPrev.classList.remove('tag-bar-arrow-disabled');
        }
        if (tagBarNext) {
            tagBarNext.classList.remove('tag-bar-arrow-visible');
            tagBarNext.classList.remove('tag-bar-arrow-disabled');
        }
        if (!overflow) return;
        var left = tagBar.scrollLeft;
        var canLeft = left > 2;
        var canRight = left < maxScroll - 2;
        if (tagBarPrev) {
            tagBarPrev.classList.toggle('tag-bar-arrow-visible', canLeft);
            tagBarPrev.classList.toggle('tag-bar-arrow-disabled', !canLeft);
        }
        if (tagBarNext) {
            tagBarNext.classList.toggle('tag-bar-arrow-visible', canRight);
            tagBarNext.classList.toggle('tag-bar-arrow-disabled', !canRight);
        }
    }

    if (tagBar && tagBarPrev && tagBarNext) {
        tagBarPrev.addEventListener('click', function() {
            if (this.classList.contains('tag-bar-arrow-disabled')) return;
            var step = Math.max(120, Math.floor(tagBar.clientWidth * 0.55));
            tagBar.scrollBy({ left: -step, behavior: 'smooth' });
        });
        tagBarNext.addEventListener('click', function() {
            if (this.classList.contains('tag-bar-arrow-disabled')) return;
            var step = Math.max(120, Math.floor(tagBar.clientWidth * 0.55));
            tagBar.scrollBy({ left: step, behavior: 'smooth' });
        });
        tagBar.addEventListener('scroll', function() { updateTagBarArrows(); }, { passive: true });
        if (typeof ResizeObserver !== 'undefined') {
            var tagBarRo = new ResizeObserver(function() { updateTagBarArrows(); });
            tagBarRo.observe(tagBar);
            if (tagBarOuter) tagBarRo.observe(tagBarOuter);
        }
    }

    function bindContextMenu(container) {
        const menu = document.getElementById('linkContextMenu');
        if (!menu) return;
        container.addEventListener('contextmenu', function(e) {
            const item = e.target.closest('.link-item');
            if (!item) return;
            e.preventDefault();
            menu.dataset.bookmarkId = item.dataset.bookmarkId || '';
            menu.style.left = e.clientX + 'px';
            menu.style.top = e.clientY + 'px';
            menu.classList.add('link-context-menu-visible');
        });
    }

    const navCallbacks = {
        loadingEl,
        emptyState,
        categoryPanel,
        primaryNavList,
        secondaryNav,
        sideNavList,
        renderPrimaryNav,
        renderSecondaryNav,
        renderSideNav,
        renderContent
    };

    function canReorderCards() {
        return state.selectedTag === null && !searchTerm;
    }

    function refreshAfterMove() {
        const savedScrollY = contentMain ? contentMain.scrollTop : (window.scrollY || document.documentElement.scrollTop);
        refreshNavAndRender({ scrollY: savedScrollY });
    }

    function resolveDropParentId(rawId) {
        let parentId = rawId;
        if (parentId === 'MERGED_UNCAT') {
            return '1';
        }
        if (parentId && String(parentId).endsWith('_uncat')) {
            const primary = state.navData[state.currentPrimaryIndex];
            return primary ? primary.folderId : '';
        }
        if (parentId && String(parentId).endsWith('_direct')) {
            return String(parentId).replace(/_direct$/, '');
        }
        return parentId;
    }

    linksGrid.addEventListener('dragstart', function(e) {
        const item = e.target.closest('.link-item');
        if (!item) return;
        e.dataTransfer.setData('text/plain', item.dataset.bookmarkId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/x-bookmark-id', item.dataset.bookmarkId);
        item.classList.add('dragging');
    });
    linksGrid.addEventListener('dragend', function(e) {
        document.querySelectorAll('.link-item.dragging').forEach(el => el.classList.remove('dragging'));
        document.querySelectorAll('.link-item.drop-target-reorder').forEach(el => el.classList.remove('drop-target-reorder'));
        document.querySelectorAll('.primary-nav-item.drop-target, .secondary-nav-item.drop-target, .side-nav-item.drop-target').forEach(el => el.classList.remove('drop-target'));
    });
    linksGrid.addEventListener('dragover', function(e) {
        const item = e.target.closest('.link-item');
        if (!item || !canReorderCards()) return;
        if (item.classList.contains('dragging')) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        linksGrid.querySelectorAll('.link-item.drop-target-reorder').forEach(el => el.classList.remove('drop-target-reorder'));
        item.classList.add('drop-target-reorder');
    });
    linksGrid.addEventListener('dragleave', function(e) {
        if (!linksGrid.contains(e.relatedTarget)) {
            linksGrid.querySelectorAll('.link-item.drop-target-reorder').forEach(el => el.classList.remove('drop-target-reorder'));
        }
    });
    linksGrid.addEventListener('drop', function(e) {
        const item = e.target.closest('.link-item');
        if (!item || !canReorderCards()) return;
        e.preventDefault();
        linksGrid.querySelectorAll('.link-item.drop-target-reorder').forEach(el => el.classList.remove('drop-target-reorder'));
        const draggedId = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('application/x-bookmark-id');
        if (!draggedId || item.dataset.bookmarkId === draggedId) return;
        const items = linksGrid.querySelectorAll('.link-item');
        const index = Array.prototype.indexOf.call(items, item);
        if (index === -1) return;
        const savedScrollY = contentMain ? contentMain.scrollTop : (window.scrollY || document.documentElement.scrollTop);
        BookmarkMaintenance.reorderBookmark(draggedId, index, function() {
            refreshNavAndRender({ scrollY: savedScrollY });
        });
    });

    if (primaryNavList) {
        primaryNavList.addEventListener('dragover', function(e) {
            const a = e.target.closest('.primary-nav-item');
            if (!a) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            primaryNavList.querySelectorAll('.primary-nav-item').forEach(el => el.classList.remove('drop-target'));
            a.classList.add('drop-target');
        });
        primaryNavList.addEventListener('dragleave', function(e) {
            if (!primaryNavList.contains(e.relatedTarget)) {
                primaryNavList.querySelectorAll('.primary-nav-item').forEach(el => el.classList.remove('drop-target'));
            }
        });
        primaryNavList.addEventListener('drop', function(e) {
            const a = e.target.closest('.primary-nav-item');
            if (!a) return;
            e.preventDefault();
            primaryNavList.querySelectorAll('.primary-nav-item').forEach(el => el.classList.remove('drop-target'));
            const bookmarkId = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('application/x-bookmark-id');
            const parentId = a.dataset.folderId;
            if (bookmarkId && parentId) BookmarkMaintenance.moveBookmark(bookmarkId, parentId, refreshAfterMove);
        });
    }

    if (secondaryNav) {
        secondaryNav.addEventListener('dragover', function(e) {
            const a = e.target.closest('.secondary-nav-item');
            if (!a) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            secondaryNav.querySelectorAll('.secondary-nav-item').forEach(el => el.classList.remove('drop-target'));
            a.classList.add('drop-target');
        });
        secondaryNav.addEventListener('dragleave', function(e) {
            if (!secondaryNav.contains(e.relatedTarget)) {
                secondaryNav.querySelectorAll('.secondary-nav-item').forEach(el => el.classList.remove('drop-target'));
            }
        });
        secondaryNav.addEventListener('drop', function(e) {
            const a = e.target.closest('.secondary-nav-item');
            if (!a) return;
            e.preventDefault();
            secondaryNav.querySelectorAll('.secondary-nav-item').forEach(el => el.classList.remove('drop-target'));
            const bookmarkId = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('application/x-bookmark-id');
            const parentId = resolveDropParentId(a.dataset.secondaryId);
            if (bookmarkId && parentId) BookmarkMaintenance.moveBookmark(bookmarkId, parentId, refreshAfterMove);
        });
    }

    if (sideNavList) {
        sideNavList.addEventListener('dragover', function(e) {
            const a = e.target.closest('.side-nav-item');
            if (!a) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            sideNavList.querySelectorAll('.side-nav-item').forEach(el => el.classList.remove('drop-target'));
            a.classList.add('drop-target');
        });
        sideNavList.addEventListener('dragleave', function(e) {
            if (!sideNavList.contains(e.relatedTarget)) {
                sideNavList.querySelectorAll('.side-nav-item').forEach(el => el.classList.remove('drop-target'));
            }
        });
        sideNavList.addEventListener('drop', function(e) {
            const a = e.target.closest('.side-nav-item');
            if (!a) return;
            e.preventDefault();
            sideNavList.querySelectorAll('.side-nav-item').forEach(el => el.classList.remove('drop-target'));
            const bookmarkId = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('application/x-bookmark-id');
            const parentId = resolveDropParentId(a.dataset.sideId);
            if (bookmarkId && parentId) BookmarkMaintenance.moveBookmark(bookmarkId, parentId, refreshAfterMove);
        });
    }

    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchTerm = this.value.trim();
            renderContent();
        }, 300);
    });
    searchInput.addEventListener('contextmenu', e => e.preventDefault());
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            searchTerm = searchInput.value.trim();
            renderContent();
        });
    }

    const Settings = window.BookmarkManagerSettings;
    if (!Settings) return;

    chrome.bookmarks.onRemoved.addListener(loadNavAndRender);
    chrome.bookmarks.onCreated.addListener(loadNavAndRender);

    const scrollFloatWrap = document.createElement('div');
    scrollFloatWrap.className = 'scroll-float-wrap';
    scrollFloatWrap.setAttribute('aria-hidden', 'true');
    var I18nScroll = window.BookmarkManagerI18n;
    var scrollAria = I18nScroll && I18nScroll.t ? I18nScroll.t('scrollAria') : 'Scroll';
    var scrollBottomT = I18nScroll && I18nScroll.t ? I18nScroll.t('scrollBottom') : 'Bottom';
    scrollFloatWrap.innerHTML = '<button type="button" class="scroll-float-btn scroll-to-bottom" aria-label="' + (scrollAria.replace(/"/g, '&quot;')) + '" title="' + (scrollBottomT.replace(/"/g, '&quot;')) + '"></button>';
    document.body.appendChild(scrollFloatWrap);
    const scrollFloatBtn = scrollFloatWrap.querySelector('.scroll-float-btn');

    function updateScrollButtonVisibility() {
        const scrollHeight = contentMain ? contentMain.scrollHeight : document.documentElement.scrollHeight;
        const scrollTop = contentMain ? contentMain.scrollTop : (document.documentElement.scrollTop || window.scrollY);
        const clientHeight = contentMain ? contentMain.clientHeight : window.innerHeight;
        const overflowThreshold = clientHeight * 1.1;
        if (scrollHeight > overflowThreshold) {
            scrollFloatWrap.classList.add('scroll-float-visible');
            const nearBottom = scrollTop + clientHeight >= scrollHeight - 20;
            scrollFloatBtn.className = 'scroll-float-btn ' + (nearBottom ? 'scroll-to-top' : 'scroll-to-bottom');
            scrollFloatBtn.title = nearBottom
                ? (I18nScroll && I18nScroll.t ? I18nScroll.t('scrollTop') : 'Top')
                : (I18nScroll && I18nScroll.t ? I18nScroll.t('scrollBottom') : 'Bottom');
        } else {
            scrollFloatWrap.classList.remove('scroll-float-visible');
        }
    }

    scrollFloatBtn.addEventListener('click', function() {
        const scrollEl = contentMain;
        if (scrollEl) {
            const nearBottom = scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 20;
            scrollEl.scrollTo({ top: nearBottom ? 0 : scrollEl.scrollHeight, behavior: 'smooth' });
        } else {
            const nearBottom = document.documentElement.scrollTop + window.innerHeight >= document.documentElement.scrollHeight - 20;
            if (nearBottom) window.scrollTo({ top: 0, behavior: 'smooth' });
            else window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
        }
    });

    function updateGridColumns() {
        const cols = window.__settings ? window.__settings.columns : 3;
        const w = linksGrid.parentElement ? linksGrid.parentElement.clientWidth : 300;
        const effectiveCols = Math.min(cols, Math.max(1, Math.floor(w / 240)));
        linksGrid.style.gridTemplateColumns = `repeat(${effectiveCols}, minmax(240px, 1fr))`;
    }

    if (contentMain) {
        contentMain.addEventListener('scroll', updateScrollButtonVisibility, { passive: true });
    } else {
        window.addEventListener('scroll', updateScrollButtonVisibility, { passive: true });
    }
    window.addEventListener('resize', function() {
        updateScrollButtonVisibility();
        updateGridColumns();
        if (typeof updateTagBarArrows === 'function') updateTagBarArrows();
    });
    const scrollContentObserver = new ResizeObserver(function() {
        updateScrollButtonVisibility();
        updateGridColumns();
    });
    scrollContentObserver.observe(contentMain || document.body);

    const linkContextMenu = document.createElement('div');
    linkContextMenu.id = 'linkContextMenu';
    linkContextMenu.className = 'link-context-menu';
    linkContextMenu.setAttribute('aria-hidden', 'true');
    var ctxDel = window.BookmarkManagerI18n && window.BookmarkManagerI18n.t ? window.BookmarkManagerI18n.t('ctxDelete') : '删除书签';
    linkContextMenu.innerHTML = '<button type="button" class="link-context-menu-item" data-action="delete">' + ctxDel.replace(/</g, '&lt;') + '</button>';
    document.body.appendChild(linkContextMenu);
    linkContextMenu.querySelector('[data-action="delete"]').addEventListener('click', function() {
        const id = linkContextMenu.dataset.bookmarkId;
        if (id) {
            const item = linksGrid.querySelector('.link-item[data-bookmark-id="' + id + '"]');
            if (item) item.style.animation = 'fadeOut 0.3s ease forwards';
            BookmarkMaintenance.deleteBookmark(id, loadNavAndRender);
        }
        linkContextMenu.classList.remove('link-context-menu-visible');
    });
    document.addEventListener('click', function() {
        linkContextMenu.classList.remove('link-context-menu-visible');
    });

    Settings.loadSettings(function() {
        if (window.BookmarkManagerI18n) window.BookmarkManagerI18n.applyMainPageStatic();
        var ctxM = document.getElementById('linkContextMenu');
        if (ctxM && window.BookmarkManagerI18n) {
            var delB = ctxM.querySelector('[data-action="delete"]');
            if (delB) delB.textContent = window.BookmarkManagerI18n.t('ctxDelete');
        }
        loadNavAndRender();
        Settings.renderSettingsUI(linksGrid);
        setTimeout(updateScrollButtonVisibility, 100);
    });

    window.addEventListener('bookmark-locale-changed', function() {
        if (window.BookmarkManagerI18n) window.BookmarkManagerI18n.applyMainPageStatic();
        renderPrimaryNav();
        renderSecondaryNav();
        renderSideNav();
        renderContent();
        var ctx = document.getElementById('linkContextMenu');
        if (ctx && window.BookmarkManagerI18n) {
            var del = ctx.querySelector('[data-action="delete"]');
            if (del) del.textContent = window.BookmarkManagerI18n.t('ctxDelete');
        }
        updateScrollButtonVisibility();
    });
});
