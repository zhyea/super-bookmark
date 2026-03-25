/**
 * 新标签页渲染：一级/二级导航、标签栏、书签卡片列表
 * 依赖：bookmarks.js（escapeHtml）。由 operate.js 调用并绑定事件。
 */
(function(global) {
    function navDisplayTitle(item) {
        if (item && item.titleI18nKey && global.BookmarkManagerI18n && global.BookmarkManagerI18n.t) {
            return global.BookmarkManagerI18n.t(item.titleI18nKey);
        }
        return (item && item.title) ? item.title : '';
    }

    function getFirstChar(title) {
        if (!title || typeof title !== 'string') return '?';
        const match = title.match(/[\u4e00-\u9fa5a-zA-Z]/);
        return match ? match[0].toUpperCase() : '?';
    }

    function getFilteredBookmarks(state, searchTerm) {
        const primary = state.navData[state.currentPrimaryIndex];
        if (!primary) return [];
        const secondary = primary.secondaries.find(s => String(s.id) === String(state.currentSecondaryId));
        if (!secondary) return [];
        let list;
        if (secondary.sides && secondary.sides.length) {
            const side = secondary.sides.find(sd => String(sd.id) === String(state.currentSideId));
            list = side ? side.bookmarks : (secondary.sides[0].bookmarks || []);
        } else {
            list = secondary.bookmarks || [];
        }
        if (state.selectedTag) {
            list = list.filter(b => {
                const folderTags = b.tags || [];
                const userTags = (secondary._userTags && secondary._userTags[b.id]) || [];
                return folderTags.includes(state.selectedTag) || userTags.includes(state.selectedTag);
            });
        }
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            list = list.filter(b => {
                const folderTags = b.tags || [];
                const userTags = (secondary._userTags && secondary._userTags[b.id]) || [];
                const allTags = [...folderTags, ...userTags];
                return (b.title && b.title.toLowerCase().includes(term)) ||
                    allTags.some(t => t.toLowerCase().includes(term));
            });
        }
        return list;
    }

    function getCurrentScopeTags(state, secondary) {
        if (!secondary) return [];
        let scopeList;
        if (secondary.sides && secondary.sides.length) {
            const side = secondary.sides.find(sd => String(sd.id) === String(state.currentSideId));
            scopeList = side ? (side.bookmarks || []) : (secondary.sides[0].bookmarks || []);
        } else {
            scopeList = secondary.bookmarks || [];
        }
        const tagSet = new Set();
        scopeList.forEach(function(b) {
            const folderTags = b.tags || [];
            const userTags = (secondary._userTags && secondary._userTags[b.id]) || [];
            folderTags.forEach(function(t) { if (t) tagSet.add(t); });
            userTags.forEach(function(t) { if (t) tagSet.add(t); });
        });
        return Array.from(tagSet).sort();
    }

    /** 渲染到侧栏 primaryNavList */
    function renderPrimaryNav(state, primaryNavList, escapeHtml) {
        if (!primaryNavList) return;
        if (!state.navData.length) {
            primaryNavList.innerHTML = '';
            return;
        }
        primaryNavList.innerHTML = state.navData.map((p, i) =>
            `<li class="sidebar-item"><a href="#" class="primary-nav-item" data-primary-index="${i}" data-folder-id="${escapeHtml(String(p.folderId))}">${escapeHtml(p.title)}</a></li>`
        ).join('');
    }

    /** 二级目录：渲染到顶部 header secondaryNav */
    function renderSecondaryNav(state, secondaryNav, escapeHtml) {
        if (!secondaryNav) return;
        const primary = state.navData[state.currentPrimaryIndex];
        if (!primary) {
            secondaryNav.innerHTML = '';
            return;
        }
        secondaryNav.innerHTML = primary.secondaries.map(s =>
            `<li class="nav-item"><a href="#" class="secondary-nav-item" data-secondary-id="${escapeHtml(String(s.id))}">${escapeHtml(navDisplayTitle(s))}</a></li>`
        ).join('');
    }

    /** 当前二级下的子项（二级名称 + 三级目录）：渲染到侧栏 sideNavList */
    function renderSideNav(state, sideNavList, escapeHtml) {
        if (!sideNavList) return;
        const primary = state.navData[state.currentPrimaryIndex];
        const secondary = primary && primary.secondaries.find(s => String(s.id) === String(state.currentSecondaryId));
        if (!secondary || !secondary.sides || !secondary.sides.length) {
            sideNavList.innerHTML = '';
            return;
        }
        sideNavList.innerHTML = secondary.sides.map(sd =>
            `<li class="sidebar-item"><a href="#" class="side-nav-item" data-side-id="${escapeHtml(String(sd.id))}">${escapeHtml(navDisplayTitle(sd))}</a></li>`
        ).join('');
    }

    function faviconUrl(url) {
        try {
            const parsed = new URL(url);
            // Only web pages are allowed for direct favicon fetch.
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                return '';
            }
            return parsed.origin + '/favicon.ico';
        } catch (_) {
            return '';
        }
    }

    const ICON_COLORS = global.CARD_ICON_BACKGROUND_COLORS && global.CARD_ICON_BACKGROUND_COLORS.length
        ? global.CARD_ICON_BACKGROUND_COLORS
        : ['#42b883', '#e34c26', '#61dafb', '#764abc', '#f7df1e', '#3178c6', '#f97316', '#14b8a6', '#ec4899'];

    function getIconColorForChar(firstChar) {
        const code = (firstChar && firstChar.charCodeAt(0)) || 0;
        return ICON_COLORS[code % ICON_COLORS.length];
    }

    function renderContent(state, searchTerm, elements, escapeHtml, options) {
        const primary = state.navData[state.currentPrimaryIndex];
        const secondary = primary && primary.secondaries.find(s => String(s.id) === String(state.currentSecondaryId));
        const { linksGrid, tagBar, categoryTitle, categoryPanel, loadingEl, emptyState } = elements;

        if (!secondary) {
            if (loadingEl) loadingEl.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            if (categoryPanel) categoryPanel.style.display = 'none';
            return;
        }

        if (loadingEl) loadingEl.style.display = 'none';
        if (emptyState) emptyState.style.display = 'none';
        if (categoryPanel) categoryPanel.style.display = 'block';

        const tags = getCurrentScopeTags(state, secondary);
        const selectedTag = state.selectedTag;
        var I18n = global.BookmarkManagerI18n;
        var i18n = I18n && I18n.t ? I18n.t.bind(I18n) : function(k) {
            var d = { tagAll: '全部', uncategorized: '未分类', cardDelete: '删除', cardEdit: '编辑' };
            return d[k] || k;
        };
        tagBar.innerHTML = '<span class="tag-pill' + (selectedTag === null ? ' active' : '') + '" data-tag="">' + escapeHtml(i18n('tagAll')) + '</span>' +
            tags.map(function(tagName) {
                return '<span class="tag-pill' + (selectedTag === tagName ? ' active' : '') + '" data-tag="' + escapeHtml(tagName) + '">' + escapeHtml(tagName) + '</span>';
            }).join('');

        const list = getFilteredBookmarks(state, searchTerm);
        if (categoryTitle) {
            categoryTitle.textContent = '';
            categoryTitle.style.display = 'none';
        }

        const showActions = options && options.showActions !== false;
        const columns = (options && options.columns) != null ? options.columns : 3;

        const containerWidth = linksGrid.parentElement ? linksGrid.parentElement.clientWidth : 300;
        const effectiveCols = Math.min(columns, Math.max(1, Math.floor(containerWidth / 240)));

        linksGrid.innerHTML = list.map((b) => {
            const firstChar = getFirstChar(b.title);
            const iconColor = (secondary._userIconColor && secondary._userIconColor[b.id]) || getIconColorForChar(firstChar);
            const favicon = faviconUrl(b.url);
            const iconHtml = favicon
                ? `<img class="card-icon-img" src="${escapeHtml(favicon)}" alt="" referrerpolicy="no-referrer"><span class="card-icon-fallback">${escapeHtml(firstChar)}</span>`
                : `<span class="card-icon-fallback">${escapeHtml(firstChar)}</span>`;
            const linkTitle = (b.title && b.title.trim()) ? b.title.trim() : b.url;
            const urlDisplay = (b.url || '').replace(/^https?:\/\//, '').replace(/\/$/, '') || b.url || '';
            const userTags = (secondary._userTags && secondary._userTags[b.id]) || [];
            // Note: b.tags is derived from folder names under the current side.
            // Folder-derived "tags" should be used for top-bar filtering, but shouldn't be rendered on each card.
            const tagsHtml = userTags && userTags.length
                ? userTags.map(function(t) { return '<span class="card-tag">' + escapeHtml(t) + '</span>'; }).join('')
                : '';
            return `
<div class="link-item" data-bookmark-id="${escapeHtml(b.id)}" data-url="${escapeHtml(b.url)}" data-icon-color="${escapeHtml(iconColor)}" draggable="true">
  <a href="${escapeHtml(b.url)}" target="_blank" draggable="false" class="card-link" title="${escapeHtml(linkTitle)}">
    <div class="card-head">
      <div class="card-icon" style="background:${iconColor}">${iconHtml}</div>
      <div class="card-body">
        <span class="card-title">${escapeHtml(b.title)}</span>
        <span class="card-url">${escapeHtml(urlDisplay)}</span>
      </div>
    </div>
  </a>
  <div class="card-tags">${tagsHtml}</div>
  <div class="actions">
    <button type="button" title="${escapeHtml(i18n('cardDelete'))}" aria-label="${escapeHtml(i18n('cardDelete'))}" class="action-delete">🗑</button>
    <button type="button" title="${escapeHtml(i18n('cardEdit'))}" aria-label="${escapeHtml(i18n('cardEdit'))}" class="action-edit">✏️</button>
  </div>
</div>`;
        }).join('');

        linksGrid.style.gridTemplateColumns = `repeat(${effectiveCols}, minmax(240px, 1fr))`;
        if (options && typeof options.setHideCardActions === 'function') {
            options.setHideCardActions(!showActions);
        }
    }

    global.NewTabRender = {
        ICON_COLORS,
        getFirstChar,
        getFilteredBookmarks,
        renderPrimaryNav,
        renderSecondaryNav,
        renderSideNav,
        renderContent
    };
})(typeof window !== 'undefined' ? window : this);
