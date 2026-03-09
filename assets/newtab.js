document.addEventListener('DOMContentLoaded', function() {
    const primaryNav = document.getElementById('primaryNav');
    const secondaryNavList = document.getElementById('secondaryNavList');
    const loadingEl = document.getElementById('loading');
    const emptyState = document.getElementById('emptyState');
    const categoryPanel = document.getElementById('categoryPanel');
    const categoryTitle = document.getElementById('categoryTitle');
    const tagBar = document.getElementById('tagBar');
    const linksGrid = document.getElementById('linksGrid');
    const searchInput = document.getElementById('searchInput');

    let navData = []; // [{ title, secondaries: [{ id, title, bookmarks: [{ id, title, url, tags }], allTags }] }]
    let currentPrimaryIndex = 0;
    let currentSecondaryId = null;
    let selectedTag = null;
    let searchTerm = '';
    let searchTimeout = null;
    const TAGS_STORAGE_KEY = 'bookmarkTags';
    const SETTINGS_STORAGE_KEY = 'superBookmarkSettings';

    function escapeHtml(text) {
        if (text == null) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 递归收集某节点下的所有书签，path 为当前路径（当前节点以下的文件夹名，即 L3 及以下）
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

    // 从 Chrome 书签树构建 navData：一级=顶级菜单，二级=左侧菜单，三级及以下文件夹名=tag；根目录下的书签归入「未分类」
    function buildNavData(tree) {
        const result = [];
        if (!tree || !tree.length) return result;

        for (const root of tree) {
            const children = root.children;
            if (!children || !children.length) continue;
            if (root.title === 'Mobile Bookmarks' || root.title === '移动设备书签') continue;

            // 根目录下的直接链接（未放入任何文件夹）归入「未分类」
            const rootDirectLinks = children.filter(n => n.url).map(n => ({
                id: n.id,
                title: n.title || '',
                url: n.url,
                tags: []
            }));
            if (rootDirectLinks.length > 0) {
                const allTags = [...new Set(rootDirectLinks.flatMap(b => b.tags))].filter(Boolean).sort();
                result.push({
                    title: '未分类',
                    folderId: root.id,
                    secondaries: [{ id: root.id, title: '未分类', bookmarks: rootDirectLinks, allTags }]
                });
            }

            const l1Folders = children.filter(n => !n.url && n.children);
            if (l1Folders.length === 0) continue;

            for (const l1 of l1Folders) {
                const l2Folders = (l1.children || []).filter(n => !n.url && n.children);
                const secondaries = [];
                if (l2Folders.length === 0) {
                    const bookmarks = [];
                    collectBookmarks(l1, [], bookmarks);
                    const allTags = [...new Set(bookmarks.flatMap(b => b.tags))].filter(Boolean).sort();
                    secondaries.push({
                        id: l1.id,
                        title: l1.title || '未命名',
                        bookmarks,
                        allTags
                    });
                } else {
                    for (const l2 of l2Folders) {
                        const bookmarks = [];
                        collectBookmarks(l2, [], bookmarks);
                        const allTags = [...new Set(bookmarks.flatMap(b => b.tags))].filter(Boolean).sort();
                        secondaries.push({
                            id: l2.id,
                            title: l2.title || '未命名',
                            bookmarks,
                            allTags
                        });
                    }
                }
                if (secondaries.length) {
                    result.push({ title: l1.title || '未命名', folderId: l1.id, secondaries });
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

    function parseTagInput(str) {
        if (!str || typeof str !== 'string') return [];
        return str.split(/[,，]/).map(s => s.trim()).filter(Boolean);
    }

    function getFilteredBookmarks() {
        const primary = navData[currentPrimaryIndex];
        if (!primary) return [];
        const secondary = primary.secondaries.find(s => String(s.id) === String(currentSecondaryId));
        if (!secondary) return [];
        let list = secondary.bookmarks;
        if (selectedTag) {
            list = list.filter(b => {
                const folderTags = b.tags || [];
                const userTags = (secondary._userTags && secondary._userTags[b.id]) || [];
                return folderTags.includes(selectedTag) || userTags.includes(selectedTag);
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

    function renderPrimaryNav() {
        if (!navData.length) {
            primaryNav.innerHTML = '';
            return;
        }
        primaryNav.innerHTML = navData.map((p, i) =>
            `<a href="#" class="primary-nav-item" data-primary-index="${i}" data-folder-id="${escapeHtml(String(p.folderId))}">${escapeHtml(p.title)}</a>`
        ).join('');
        primaryNav.querySelectorAll('.primary-nav-item').forEach(a => {
            a.addEventListener('click', function(e) {
                e.preventDefault();
                currentPrimaryIndex = parseInt(this.dataset.primaryIndex, 10);
                currentSecondaryId = navData[currentPrimaryIndex].secondaries[0].id;
                selectedTag = null;
                renderSecondaryNav();
                renderContent();
                updatePrimaryActive();
            });
        });
        updatePrimaryActive();
    }

    function updatePrimaryActive() {
        primaryNav.querySelectorAll('.primary-nav-item').forEach((a, i) => {
            a.classList.toggle('active', i === currentPrimaryIndex);
        });
    }

    function renderSecondaryNav() {
        const primary = navData[currentPrimaryIndex];
        if (!primary) {
            secondaryNavList.innerHTML = '';
            return;
        }
        secondaryNavList.innerHTML = primary.secondaries.map(s =>
            `<a href="#" class="secondary-nav-item" data-secondary-id="${escapeHtml(String(s.id))}">${escapeHtml(s.title)}</a>`
        ).join('');
        secondaryNavList.querySelectorAll('.secondary-nav-item').forEach(a => {
            a.addEventListener('click', function(e) {
                e.preventDefault();
                currentSecondaryId = this.dataset.secondaryId;
                selectedTag = null;
                renderContent();
                secondaryNavList.querySelectorAll('.secondary-nav-item').forEach(el => {
                    el.classList.toggle('active', el.dataset.secondaryId === currentSecondaryId);
                });
            });
        });
        secondaryNavList.querySelectorAll('.secondary-nav-item').forEach(el => {
            el.classList.toggle('active', el.dataset.secondaryId === currentSecondaryId);
        });
    }

    function renderContent() {
        const primary = navData[currentPrimaryIndex];
        const secondary = primary && primary.secondaries.find(s => String(s.id) === String(currentSecondaryId));
        if (!secondary) {
            loadingEl.style.display = 'none';
            emptyState.style.display = 'block';
            categoryPanel.style.display = 'none';
            return;
        }
        loadingEl.style.display = 'none';
        emptyState.style.display = 'none';
        categoryPanel.style.display = 'block';

        // Tag 栏：全部 + 各 tag（含用户标签），点击筛选
        const tags = secondary.allTags || [];
        tagBar.innerHTML = '<span class="tag-pill' + (selectedTag === null ? ' active' : '') + '" data-tag="">全部</span>' +
            tags.map(t => '<span class="tag-pill' + (selectedTag === t ? ' active' : '') + '" data-tag="' + escapeHtml(t) + '">' + escapeHtml(t) + '</span>').join('');
        tagBar.querySelectorAll('.tag-pill').forEach(pill => {
            pill.addEventListener('click', function() {
                selectedTag = this.dataset.tag || null;
                renderContent();
            });
        });

        const list = getFilteredBookmarks();
        categoryTitle.textContent = '√ ' + secondary.title + ' x ' + list.length;
        const showActions = !window.__settings || window.__settings.showActions !== false;
        const userTagsMap = secondary._userTags || {};
        const iconColors = ['#42b883', '#e34c26', '#61dafb', '#764abc', '#f7df1e', '#3178c6'];
        linksGrid.innerHTML = list.map((b, idx) => {
            const urlDisplay = b.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
            const firstChar = (b.title && b.title[0]) ? b.title[0].toUpperCase() : '?';
            const iconColor = iconColors[idx % iconColors.length];
            const folderTags = b.tags || [];
            const userTags = userTagsMap[b.id] || [];
            const displayTags = [...new Set([...folderTags, ...userTags])];
            const tagsHtml = displayTags.length
                ? '<div class="card-tags">' + displayTags.map((t, i) => {
                    const cls = ['tag-blue', 'tag-red', 'tag-green'][i % 3];
                    return '<span class="card-tag ' + cls + '">' + escapeHtml(t) + '</span>';
                }).join('') + '</div>'
                : '<div class="card-tags"></div>';
            return `
<div class="link-item" data-bookmark-id="${escapeHtml(b.id)}" draggable="true">
  <a href="${escapeHtml(b.url)}" target="_blank" draggable="false" class="card-link">
    <div class="card-head">
      <div class="card-icon" style="background:${iconColor}">${escapeHtml(firstChar)}</div>
      <div class="card-title">${escapeHtml(b.title)}</div>
    </div>
    <div class="link-url">${escapeHtml(urlDisplay)}</div>
    ${tagsHtml}
  </a>
  <div class="actions">
    <button type="button" title="删除" aria-label="删除" class="action-delete">🗑</button>
    <button type="button" title="编辑" aria-label="编辑">✏️</button>
  </div>
</div>`;
        }).join('');
        linksGrid.style.gridTemplateColumns = `repeat(${window.__settings ? window.__settings.columns : 3}, minmax(0, 1fr))`;
        document.body.classList.toggle('hide-card-actions', !showActions);

        linksGrid.querySelectorAll('.action-delete').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const item = this.closest('.link-item');
                const id = item.dataset.bookmarkId;
                item.style.animation = 'fadeOut 0.3s ease forwards';
                chrome.bookmarks.remove(id);
            });
        });
        linksGrid.querySelectorAll('.actions button[aria-label="编辑"]').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                openEditModal(this.closest('.link-item'));
            });
        });
    }

    // ========== 拖拽卡片到菜单以移动书签 ==========
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
        document.querySelectorAll('.primary-nav-item.drop-target, .secondary-nav-item.drop-target').forEach(el => el.classList.remove('drop-target'));
    });

    primaryNav.addEventListener('dragover', function(e) {
        const a = e.target.closest('.primary-nav-item');
        if (!a) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        primaryNav.querySelectorAll('.primary-nav-item').forEach(el => el.classList.remove('drop-target'));
        a.classList.add('drop-target');
    });
    primaryNav.addEventListener('dragleave', function(e) {
        if (!primaryNav.contains(e.relatedTarget)) {
            primaryNav.querySelectorAll('.primary-nav-item').forEach(el => el.classList.remove('drop-target'));
        }
    });
    primaryNav.addEventListener('drop', function(e) {
        const a = e.target.closest('.primary-nav-item');
        if (!a) return;
        e.preventDefault();
        primaryNav.querySelectorAll('.primary-nav-item').forEach(el => el.classList.remove('drop-target'));
        const bookmarkId = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('application/x-bookmark-id');
        const parentId = a.dataset.folderId;
        if (bookmarkId && parentId) {
            chrome.bookmarks.move(bookmarkId, { parentId: parentId }, function() {
                if (chrome.runtime.lastError) return;
                loadNavAndRender();
            });
        }
    });

    secondaryNavList.addEventListener('dragover', function(e) {
        const a = e.target.closest('.secondary-nav-item');
        if (!a) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        secondaryNavList.querySelectorAll('.secondary-nav-item').forEach(el => el.classList.remove('drop-target'));
        a.classList.add('drop-target');
    });
    secondaryNavList.addEventListener('dragleave', function(e) {
        if (!secondaryNavList.contains(e.relatedTarget)) {
            secondaryNavList.querySelectorAll('.secondary-nav-item').forEach(el => el.classList.remove('drop-target'));
        }
    });
    secondaryNavList.addEventListener('drop', function(e) {
        const a = e.target.closest('.secondary-nav-item');
        if (!a) return;
        e.preventDefault();
        secondaryNavList.querySelectorAll('.secondary-nav-item').forEach(el => el.classList.remove('drop-target'));
        const bookmarkId = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('application/x-bookmark-id');
        const parentId = a.dataset.secondaryId;
        if (bookmarkId && parentId) {
            chrome.bookmarks.move(bookmarkId, { parentId: parentId }, function() {
                if (chrome.runtime.lastError) return;
                loadNavAndRender();
            });
        }
    });

    function loadNavAndRender() {
        chrome.bookmarks.getTree(function(tree) {
            navData = buildNavData(tree);
            loadTags(function(tagsMap) {
                navData.forEach(p => {
                    p.secondaries.forEach(s => {
                        s._userTags = {};
                        s.bookmarks.forEach(b => {
                            if (tagsMap[b.id] && tagsMap[b.id].length) s._userTags[b.id] = tagsMap[b.id];
                        });
                        const userTagSet = new Set(Object.values(s._userTags).flat());
                        s.allTags = [...new Set([...(s.allTags || []), ...userTagSet])].sort();
                    });
                });
                loadingEl.style.display = 'none';
                if (!navData.length) {
                    emptyState.style.display = 'block';
                    categoryPanel.style.display = 'none';
                    primaryNav.innerHTML = '';
                    secondaryNavList.innerHTML = '';
                    return;
                }
                emptyState.style.display = 'none';
                currentPrimaryIndex = 0;
                currentSecondaryId = navData[0].secondaries[0].id;
                selectedTag = null;
                renderPrimaryNav();
                renderSecondaryNav();
                renderContent();
            });
        });
    }

    // 搜索
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchTerm = this.value.trim();
            renderContent();
        }, 300);
    });
    searchInput.addEventListener('contextmenu', e => e.preventDefault());

    // 编辑弹窗（不修改链接）
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.8); } }
        .edit-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .edit-modal-content { background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); width: 400px; max-width: 90%; }
        .edit-modal h3 { margin-bottom: 20px; color: #1890ff; }
        .edit-modal form { display: flex; flex-direction: column; gap: 15px; }
        .edit-modal .form-group { display: flex; flex-direction: column; gap: 5px; }
        .edit-modal label { font-size: 14px; font-weight: 600; color: #333; }
        .edit-modal input { padding: 10px; border: 1px solid #e8e8e8; border-radius: 4px; font-size: 14px; outline: none; }
        .edit-modal input:focus { border-color: #1890ff; }
        .edit-modal .edit-tags-input { padding: 10px; border: 1px solid #e8e8e8; border-radius: 4px; font-size: 14px; outline: none; width: 100%; }
        .edit-modal .edit-tags-input:focus { border-color: #1890ff; }
        .edit-modal .edit-tags-pills { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; min-height: 28px; }
        .edit-modal .edit-tag-pill { display: inline-block; padding: 4px 12px; font-size: 13px; font-weight: 600; color: #1890ff; background: #e6f7ff; border: 1px solid #91d5ff; border-radius: 14px; }
        .edit-modal .edit-tags-hint { font-size: 12px; color: #8c8c8c; margin-top: 4px; }
        .edit-modal .button-group { display: flex; gap: 10px; justify-content: flex-end; margin-top: 10px; }
        .edit-modal button { padding: 8px 16px; border: none; border-radius: 4px; font-size: 14px; cursor: pointer; }
        .edit-modal .cancel-btn { background: #f0f0f0; color: #333; }
        .edit-modal .save-btn { background: #1890ff; color: #fff; }
        .edit-modal .edit-url-readonly { padding: 10px; background: #f5f5f5; border-radius: 4px; font-size: 13px; color: #666; word-break: break-all; }
        .edit-modal .edit-url-label { font-size: 14px; font-weight: 600; color: #333; display: block; margin-bottom: 5px; }
    `;
    document.head.appendChild(style);

    function openEditModal(linkItem) {
        if (!linkItem) return;
        const id = linkItem.dataset.bookmarkId;
        const titleEl = linkItem.querySelector('.card-title');
        const title = titleEl ? titleEl.textContent : '';
        const url = linkItem.querySelector('a').href;
        const primary = navData[currentPrimaryIndex];
        const secondary = primary && primary.secondaries.find(s => String(s.id) === String(currentSecondaryId));
        const userTags = (secondary && secondary._userTags && secondary._userTags[id]) || [];
        const tagsValue = userTags.join(', ');

        const modal = document.createElement('div');
        modal.className = 'edit-modal';
        modal.innerHTML = `
            <div class="edit-modal-content">
                <h3>编辑卡片</h3>
                <form id="edit-form">
                    <div class="form-group">
                        <label for="edit-title">标题</label>
                        <input type="text" id="edit-title" value="${escapeHtml(title)}" required>
                    </div>
                    <div class="form-group">
                        <label for="edit-tags">标签</label>
                        <input type="text" id="edit-tags" class="edit-tags-input" value="${escapeHtml(tagsValue)}" placeholder="多个标签用逗号分隔">
                        <div class="edit-tags-pills" id="editTagsPills"></div>
                        <div class="edit-tags-hint">多个标签请用英文或中文逗号分隔</div>
                    </div>
                    <div class="form-group">
                        <label class="edit-url-label">链接</label>
                        <div class="edit-url-readonly">${escapeHtml(url)}</div>
                    </div>
                    <div class="button-group">
                        <button type="button" class="cancel-btn">取消</button>
                        <button type="submit" class="save-btn">保存</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        const tagsInput = document.getElementById('edit-tags');
        const pillsEl = document.getElementById('editTagsPills');
        function renderEditPills() {
            const arr = parseTagInput(tagsInput.value);
            pillsEl.innerHTML = arr.length ? arr.map(t => '<span class="edit-tag-pill">' + escapeHtml(t) + '</span>').join('') : '';
        }
        renderEditPills();
        tagsInput.addEventListener('input', renderEditPills);

        modal.querySelector('.cancel-btn').onclick = () => modal.remove();
        modal.querySelector('#edit-form').onsubmit = function(e) {
            e.preventDefault();
            const newTitle = document.getElementById('edit-title').value;
            const newTags = parseTagInput(document.getElementById('edit-tags').value);
            chrome.bookmarks.update(id, { title: newTitle }, function() {
                if (linkItem) {
                    const titleEl = linkItem.querySelector('.card-title');
                    if (titleEl) titleEl.textContent = newTitle;
                }
                saveTags(id, newTags);
                navData.forEach(p => {
                    p.secondaries.forEach(s => {
                        if (s._userTags) {
                            if (newTags.length) s._userTags[id] = newTags;
                            else delete s._userTags[id];
                        }
                        const userTagSet = new Set(Object.values(s._userTags || {}).flat());
                        s.allTags = [...new Set([...(s.allTags || []), ...userTagSet])].filter(Boolean).sort();
                    });
                });
            });
            modal.remove();
        };
    }

    // 书签结构变化时刷新（增删书签/文件夹时）
    chrome.bookmarks.onRemoved.addListener(loadNavAndRender);
    chrome.bookmarks.onCreated.addListener(loadNavAndRender);

    // ========== 设置：右下角固定按钮，默认折叠 ==========
    function loadSettings(cb) {
        chrome.storage.local.get(SETTINGS_STORAGE_KEY, function(data) {
            const s = data[SETTINGS_STORAGE_KEY] || {};
            window.__settings = {
                showActions: s.showActions !== false,
                columns: [3, 4, 5].includes(parseInt(s.columns, 10)) ? parseInt(s.columns, 10) : 3
            };
            if (cb) cb(window.__settings);
        });
    }

    function saveSettings(settings) {
        window.__settings = settings;
        chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: settings });
    }

    function renderSettingsUI() {
        const wrap = document.createElement('div');
        wrap.className = 'settings-wrap';
        wrap.innerHTML = `
            <button type="button" class="settings-toggle" aria-label="设置">⚙️</button>
            <div class="settings-panel">
                <div class="settings-row">
                    <label><input type="checkbox" id="settingsShowActions" ${window.__settings.showActions ? 'checked' : ''}> 显示维护按钮</label>
                </div>
                <div class="settings-row">
                    <label>卡片列数</label>
                    <select id="settingsColumns">
                        <option value="3" ${window.__settings.columns === 3 ? 'selected' : ''}>3</option>
                        <option value="4" ${window.__settings.columns === 4 ? 'selected' : ''}>4</option>
                        <option value="5" ${window.__settings.columns === 5 ? 'selected' : ''}>5</option>
                    </select>
                </div>
            </div>
        `;
        document.body.appendChild(wrap);
        const toggle = wrap.querySelector('.settings-toggle');
        const panel = wrap.querySelector('.settings-panel');
        const cb = wrap.querySelector('#settingsShowActions');
        const sel = wrap.querySelector('#settingsColumns');

        toggle.addEventListener('click', function(e) {
            e.stopPropagation();
            panel.classList.toggle('settings-panel-open');
        });
        document.addEventListener('click', function() {
            panel.classList.remove('settings-panel-open');
        });
        panel.addEventListener('click', function(e) { e.stopPropagation(); });

        function applySettings() {
            const showActions = cb.checked;
            const columns = parseInt(sel.value, 10);
            saveSettings({ showActions, columns });
            document.body.classList.toggle('hide-card-actions', !showActions);
            if (linksGrid) linksGrid.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
        }
        cb.addEventListener('change', applySettings);
        sel.addEventListener('change', applySettings);
    }

    loadSettings(function() {
        loadNavAndRender();
        renderSettingsUI();
    });
});
