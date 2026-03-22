/**
 * 卡片编辑弹窗：标题、所属目录（树状）、描述、标签、只读链接
 */
(function (global) {
    const BM = global.BookmarkManager;
    if (!BM) return;

    const escapeHtml = BM.escapeHtml;
    const parseTagInput = BM.parseTagInput;
    const saveTags = BM.saveTags;
    const saveIconColor = BM.saveIconColor;
    const saveDescription = BM.saveDescription;

    const editModalStyles = `
        @keyframes fadeOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.8); } }
        .edit-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .edit-modal-content { background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); width: 400px; max-width: 90%; }
        .edit-modal h3 { margin-bottom: 20px; color: #1890ff; }
        .edit-modal form { display: flex; flex-direction: column; gap: 15px; }
        .edit-modal .form-group { display: flex; flex-direction: column; gap: 5px; }
        .edit-modal label { font-size: 14px; font-weight: 600; color: #333; }
        .edit-modal input[type="text"]:not(.input-tag-inner) { padding: 10px; border: 1px solid #e8e8e8; border-radius: 4px; font-size: 14px; outline: none; }
        .edit-modal input[type="text"]:not(.input-tag-inner):focus { border-color: #1890ff; }
        .edit-modal select { padding: 10px; border: 1px solid #e8e8e8; border-radius: 4px; font-size: 14px; outline: none; background: #fff; cursor: pointer; }
        .edit-modal select:focus { border-color: #1890ff; }
        .edit-modal .edit-url-readonly { padding: 10px; background: #f5f5f5; border-radius: 4px; font-size: 13px; color: #666; word-break: break-all; }
        .edit-modal .edit-url-label { font-size: 14px; font-weight: 600; color: #333; display: block; margin-bottom: 5px; }
        .edit-modal .button-group { display: flex; gap: 10px; justify-content: flex-end; margin-top: 10px; }
        .edit-modal button { padding: 8px; border: none; border-radius: 4px; font-size: 14px; cursor: pointer; }
        .edit-modal .cancel-btn { background: #f0f0f0; color: #333; }
        .edit-modal .save-btn { background: #1890ff; color: #fff; }
        /* Element Plus InputTag 标签输入框风格 */
        .input-tag-wrap { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; min-height: 32px; padding: 1px 11px; border: 1px solid #dcdfe6; border-radius: 4px; background: #fff; transition: border-color 0.2s, box-shadow 0.2s; }
        .input-tag-wrap:hover { border-color: #c0c4cc; }
        .input-tag-wrap:focus-within { border-color: #409eff; outline: none; box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2); }
        .input-tag-pill { display: inline-flex; align-items: center; gap: 2px; height: 24px; padding: 0 8px; font-size: 12px; line-height: 22px; color: #909399; background: #f4f4f5; border: 1px solid #e9e9eb; border-radius: 4px; }
        .input-tag-pill .input-tag-pill-text { margin-right: 2px; }
        .input-tag-pill .input-tag-remove { padding: 0; margin: 0; width: 14px; height: 14px; border: none; background: transparent; color: #909399; cursor: pointer; border-radius: 50%; font-size: 12px; line-height: 1; display: inline-flex; align-items: center; justify-content: center; transition: color 0.2s, background 0.2s; }
        .input-tag-pill .input-tag-remove:hover { color: #409eff; background: #ecf5ff; }
        .input-tag-inner { flex: 1; min-width: 80px; height: 30px; padding: 0 4px; border: none; font-size: 14px; outline: none; background: transparent; }
        .edit-modal .icon-color-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
        .edit-modal .icon-color-swatch { width: 24px; height: 24px; border-radius: 6px; border: 2px solid transparent; cursor: pointer; flex-shrink: 0; transition: border-color 0.2s, transform 0.2s; }
        .edit-modal .icon-color-swatch:hover { transform: scale(1.08); }
        .edit-modal .icon-color-swatch.selected { border-color: #1890ff; box-shadow: 0 0 0 1px #1890ff; }
        .edit-modal .icon-color-swatch.auto { background: linear-gradient(135deg, #f0f0f0 50%, #e0e0e0 50%); font-size: 11px; color: #999; display: flex; align-items: center; justify-content: center; }
        .edit-modal .folder-dropdown { position: relative; }
        .edit-modal .folder-dropdown-trigger { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 10px 12px; border: 1px solid #e8e8e8; border-radius: 4px; background: #fff; font-size: 14px; color: #333; cursor: pointer; text-align: left; }
        .edit-modal .folder-dropdown-trigger:hover { border-color: #c0c4cc; }
        .edit-modal .folder-dropdown-trigger::after { content: ''; width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 5px solid #909399; margin-left: 8px; flex-shrink: 0; }
        .edit-modal .folder-dropdown-panel { display: none; position: absolute; top: 100%; left: 0; right: 0; margin-top: 4px; max-height: 200px; overflow-y: auto; border: 1px solid #e8e8e8; border-radius: 4px; padding: 8px; background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,0.1); z-index: 10; }
        .edit-modal .folder-dropdown-panel.open { display: block; }
        .edit-modal .folder-tree { }
        .edit-modal .folder-tree-item { padding: 6px 10px; cursor: pointer; border-radius: 4px; font-size: 13px; }
        .edit-modal .folder-tree-item:hover { background: #e6f7ff; }
        .edit-modal .folder-tree-item.selected { background: #bae7ff; color: #0050b3; }
        .edit-modal textarea.edit-desc { min-height: 60px; resize: vertical; padding: 10px; border: 1px solid #e8e8e8; border-radius: 4px; font-size: 14px; outline: none; }
        .edit-modal textarea.edit-desc:focus { border-color: #1890ff; }
        .edit-modal .desc-hint { font-size: 12px; color: #8c8c8c; margin-top: 2px; }
    `;

    /** 根据 navData 生成当前书签所在目录的 parentId（用于 Chrome API） */
    function getCurrentParentId(primary, secondary) {
        if (!primary || !secondary) return '';
        if (String(secondary.id).endsWith('_direct')) return String(primary.folderId);
        if (secondary.id === 'MERGED_UNCAT' && primary.isMergedRoots) return '1';
        return String(secondary.id);
    }

    /** 从书签树构建目录列表（树状展示用）：去掉“未命名”层级，pathDisplay 为显示路径，depth 为缩进层级 */
    function buildFolderTreeFlat(tree) {
        var out = [];
        function recurse(nodes, pathParts) {
            if (!nodes) return;
            for (var i = 0; i < nodes.length; i++) {
                var node = nodes[i];
                if (node.url) continue;
                var title = (node.title && node.title.trim()) ? node.title.trim() : '未命名';
                var nextParts = title === '未命名' ? pathParts : pathParts.concat(title);
                if (title !== '未命名') {
                    out.push({
                        id: String(node.id),
                        pathDisplay: nextParts.join(' / '),
                        depth: nextParts.length - 1
                    });
                }
                recurse(node.children || [], nextParts);
            }
        }
        for (var r = 0; r < tree.length; r++) {
            var root = tree[r];
            if (root.title === 'Mobile Bookmarks' || root.title === '移动设备书签') continue;
            var rootTitle = (root.title && root.title.trim()) ? root.title.trim() : '未命名';
            if (rootTitle !== '未命名') {
                out.push({ id: String(root.id), pathDisplay: rootTitle, depth: 0 });
            }
            recurse(root.children || [], rootTitle === '未命名' ? [] : [rootTitle]);
        }
        return out;
    }

    function injectEditStyles() {
        if (document.getElementById('edit-modal-styles')) return;
        const style = document.createElement('style');
        style.id = 'edit-modal-styles';
        style.textContent = editModalStyles;
        document.head.appendChild(style);
    }

    /**
     * 打开编辑弹窗（所属目录下拉从 Chrome 原始书签树构建，保留完整目录结构）
     * @param {HTMLElement} linkItem - .link-item 卡片元素
     * @param {Object} context - { getSecondary, onSave }
     */
    function openEditModal(linkItem, context) {
        if (!linkItem || !context) return;
        injectEditStyles();

        var id = linkItem.dataset.bookmarkId;
        var titleEl = linkItem.querySelector('.card-title');
        var title = titleEl ? titleEl.textContent : '';
        var url = linkItem.querySelector('a').href;
        var primary = context.getPrimary && context.getPrimary();
        var secondary = context.getSecondary && context.getSecondary();
        var userTags = (secondary && secondary._userTags && secondary._userTags[id]) || [];
        var tagsArray = userTags.slice(0, 3).map(function(t) { return String(t).slice(0, 16); });
        var description = (secondary && secondary._descriptions && secondary._descriptions[id]) ? String(secondary._descriptions[id]) : '';
        chrome.bookmarks.get(id, function (bmNodes) {
            if (chrome.runtime.lastError) bmNodes = null;
            var bm = bmNodes && bmNodes[0];
            var actualParentId = (bm && bm.parentId) ? String(bm.parentId) : '';
            var currentParentId = actualParentId || getCurrentParentId(primary, secondary);

            chrome.bookmarks.getTree(function(tree) {
            var tt = function(k) {
                var L = global.BookmarkManagerI18n;
                if (L && L.t) return L.t(k);
                var z = { editTitle: '编辑卡片', labelTitle: '标题', labelFolder: '所属目录', folderPick: '请选择', folderPanelAria: '选择目录', labelIcon: '图标背景色', labelTags: '标签', tagInputAria: '标签输入', tagPlaceholder: '最多3个，每标签最多16字', labelDesc: '描述', descPlaceholder: '选填，最多100字', labelUrl: '链接', cancel: '取消', save: '保存', autoColor: '自动', autoColorBtn: '自', colorAria: '颜色', removeTagAria: '移除' };
                return z[k] || k;
            };
            function escAttr(s) { return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;'); }
            var folderRows = buildFolderTreeFlat(tree);

            var ICON_COLORS = global.CARD_ICON_BACKGROUND_COLORS && global.CARD_ICON_BACKGROUND_COLORS.length
                ? global.CARD_ICON_BACKGROUND_COLORS
                : ['#42b883', '#e34c26', '#61dafb', '#764abc', '#f7df1e', '#3178c6', '#f97316', '#14b8a6', '#ec4899'];
            var savedIconColor = (secondary && secondary._userIconColor && secondary._userIconColor[id]) || '';
            var iconColorSwatchesHtml = '<button type="button" class="icon-color-swatch auto' + (!savedIconColor ? ' selected' : '') + '" data-color="" title="' + escAttr(tt('autoColor')) + '" aria-label="' + escAttr(tt('autoColor')) + '">' + escapeHtml(tt('autoColorBtn')) + '</button>' +
                ICON_COLORS.map(function(c) {
                    return '<button type="button" class="icon-color-swatch' + (c === savedIconColor ? ' selected' : '') + '" data-color="' + escapeHtml(c) + '" style="background:' + escapeHtml(c) + '" title="' + escapeHtml(c) + '" aria-label="' + escAttr(tt('colorAria')) + '"></button>';
                }).join('');

            var folderTreeHtml = folderRows.map(function(row) {
                var isSelected = row.id === currentParentId || (String(currentParentId).indexOf('_direct') >= 0 && row.id === String(currentParentId).replace(/_direct$/, ''));
                var sel = isSelected ? ' selected' : '';
                var pad = (row.depth * 16) + 'px';
                return '<div class="folder-tree-item' + sel + '" data-id="' + escapeHtml(row.id) + '" style="padding-left:' + pad + '">' + escapeHtml(row.pathDisplay) + '</div>';
            }).join('');

            var currentPathDisplay = tt('folderPick');
            for (var r = 0; r < folderRows.length; r++) {
                var row = folderRows[r];
                if (row.id === currentParentId || (String(currentParentId).indexOf('_direct') >= 0 && row.id === String(currentParentId).replace(/_direct$/, ''))) {
                    currentPathDisplay = row.pathDisplay;
                    break;
                }
            }

            var modal = document.createElement('div');
            modal.className = 'edit-modal';
            modal.innerHTML = `
            <div class="edit-modal-content">
                <h3>${escapeHtml(tt('editTitle'))}</h3>
                <form id="edit-form">
                    <div class="form-group">
                        <label for="edit-title">${escapeHtml(tt('labelTitle'))}</label>
                        <input type="text" id="edit-title" value="${escapeHtml(title)}" required>
                    </div>
                    <div class="form-group">
                        <label>${escapeHtml(tt('labelFolder'))}</label>
                        <div class="folder-dropdown" id="edit-folder-dropdown">
                            <button type="button" class="folder-dropdown-trigger" id="edit-folder-trigger" aria-haspopup="listbox" aria-expanded="false">${escapeHtml(currentPathDisplay)}</button>
                            <div class="folder-dropdown-panel" id="edit-folder-panel" role="listbox" aria-label="${escAttr(tt('folderPanelAria'))}">
                                <div class="folder-tree" id="edit-folder-tree">${folderTreeHtml}</div>
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>${escapeHtml(tt('labelIcon'))}</label>
                        <div class="icon-color-row" role="group" aria-label="${escAttr(tt('labelIcon'))}">${iconColorSwatchesHtml}</div>
                    </div>
                    <div class="form-group">
                        <label for="input-tag-wrap">${escapeHtml(tt('labelTags'))}</label>
                        <div class="input-tag-wrap" id="input-tag-wrap" role="group" aria-label="${escAttr(tt('tagInputAria'))}">
                            <input type="text" class="input-tag-inner" id="input-tag-input" placeholder="${escAttr(tt('tagPlaceholder'))}" maxlength="16" autocomplete="off">
                        </div>
                        <span class="desc-hint" id="edit-tag-hint">0 / 3</span>
                    </div>
                    <div class="form-group">
                        <label for="edit-desc">${escapeHtml(tt('labelDesc'))}</label>
                        <textarea class="edit-desc" id="edit-desc" maxlength="100" placeholder="${escAttr(tt('descPlaceholder'))}">${escapeHtml(description)}</textarea>
                        <span class="desc-hint" id="edit-desc-hint">0 / 100</span>
                    </div>
                    <div class="form-group">
                        <label class="edit-url-label">${escapeHtml(tt('labelUrl'))}</label>
                        <div class="edit-url-readonly">${escapeHtml(url)}</div>
                    </div>
                    <div class="button-group">
                        <button type="button" class="cancel-btn">${escapeHtml(tt('cancel'))}</button>
                        <button type="submit" class="save-btn">${escapeHtml(tt('save'))}</button>
                    </div>
                </form>
            </div>
        `;
            document.body.appendChild(modal);

            var selectedFolderId = currentParentId;
            function updateDescHint() {
                var ta = document.getElementById('edit-desc');
                var hint = document.getElementById('edit-desc-hint');
                if (ta && hint) {
                    var len = (ta.value || '').length;
                    hint.textContent = len + ' / 100';
                }
            }
            var descEl = document.getElementById('edit-desc');
            if (descEl) {
                descEl.addEventListener('input', updateDescHint);
                updateDescHint();
            }

            var dropdown = document.getElementById('edit-folder-dropdown');
            var trigger = document.getElementById('edit-folder-trigger');
            var panel = document.getElementById('edit-folder-panel');
            var treeEl = document.getElementById('edit-folder-tree');
            if (trigger && panel) {
                trigger.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    panel.classList.toggle('open');
                    trigger.setAttribute('aria-expanded', panel.classList.contains('open'));
                });
                function closePanel() {
                    panel.classList.remove('open');
                    trigger.setAttribute('aria-expanded', 'false');
                }
                document.addEventListener('click', function outsideClick(e) {
                    if (dropdown && !dropdown.contains(e.target)) closePanel();
                });
                if (treeEl) {
                    treeEl.querySelectorAll('.folder-tree-item').forEach(function(item) {
                        item.addEventListener('click', function(e) {
                            e.stopPropagation();
                            selectedFolderId = this.dataset.id || '';
                            trigger.textContent = this.textContent.trim();
                            treeEl.querySelectorAll('.folder-tree-item').forEach(function(i) { i.classList.remove('selected'); });
                            this.classList.add('selected');
                            closePanel();
                        });
                    });
                }
            }

            var selectedIconColor = savedIconColor;
            modal.querySelectorAll('.icon-color-swatch').forEach(function(btn) {
                btn.addEventListener('click', function () {
                    selectedIconColor = this.dataset.color || '';
                    modal.querySelectorAll('.icon-color-swatch').forEach(function(b) { b.classList.remove('selected'); });
                    this.classList.add('selected');
                });
            });

            var wrap = document.getElementById('input-tag-wrap');
            var input = document.getElementById('input-tag-input');

            function updateTagHint() {
                var hint = document.getElementById('edit-tag-hint');
                if (hint) hint.textContent = tagsArray.length + ' / 3';
            }

            function renderPills() {
                var existing = wrap.querySelectorAll('.input-tag-pill');
                existing.forEach(function(el) { el.remove(); });
                tagsArray = tagsArray.slice(0, 3).map(function(t) { return String(t).slice(0, 16); });
                updateTagHint();
                tagsArray.forEach(function(tag) {
                    var span = document.createElement('span');
                    span.className = 'input-tag-pill';
                    var text = document.createElement('span');
                    text.className = 'input-tag-pill-text';
                    text.textContent = tag;
                    var btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'input-tag-remove';
                    btn.setAttribute('aria-label', tt('removeTagAria'));
                    btn.textContent = '×';
                    btn.addEventListener('click', function (e) {
                        e.preventDefault();
                        var idx = tagsArray.indexOf(tag);
                        if (idx !== -1) tagsArray.splice(idx, 1);
                        renderPills();
                        updateTagHint();
                        input.focus();
                    });
                    span.appendChild(text);
                    span.appendChild(btn);
                    wrap.insertBefore(span, input);
                });
            }

            renderPills();

            function addTag(val) {
                var t = String(val || '').trim().slice(0, 16);
                if (!t) return;
                if (tagsArray.length >= 3) return;
                if (tagsArray.indexOf(t) === -1) tagsArray.push(t);
                updateTagHint();
            }

            function commitCurrentInput(e) {
                var raw = input.value;
                var trimmed = raw.trim();
                if (!trimmed) {
                    if (e && (e.key === ',' || e.key === '，' || e.key === ' ' || e.code === 'Space')) e.preventDefault();
                    return;
                }
                if (tagsArray.length >= 3) {
                    if (e.key === 'Tab') return;
                    if (e && (e.key === 'Enter' || e.key === ',' || e.key === '，' || e.key === ' ' || e.code === 'Space')) e.preventDefault();
                    return;
                }
                if (e) e.preventDefault();
                addTag(raw);
                input.value = '';
                renderPills();
            }

            input.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    commitCurrentInput(e);
                    return;
                }
                if (e.key === ' ' || e.code === 'Space') {
                    commitCurrentInput(e);
                    return;
                }
                if (e.key === 'Tab' && this.value.trim()) {
                    commitCurrentInput(e);
                    return;
                }
                if (e.key === ',' || e.key === '，') {
                    commitCurrentInput(e);
                    return;
                }
                if (e.key === 'Backspace' && this.value === '' && tagsArray.length) {
                    tagsArray.pop();
                    renderPills();
                    updateTagHint();
                }
            });
            input.addEventListener('input', function () {
                var v = this.value;
                if (/[,，\s]/.test(v)) {
                    var segs = v.split(/[,，\s]+/).map(function(s) { return s.trim(); }).filter(Boolean);
                    var trailing = /[,，\s]$/.test(v);
                    if (!trailing && segs.length) {
                        segs.slice(0, -1).forEach(function(p) { addTag(p); });
                        this.value = segs[segs.length - 1] || '';
                    } else {
                        segs.forEach(function(p) { addTag(p); });
                        this.value = '';
                    }
                    renderPills();
                }
            });
            input.addEventListener('blur', function () {
                var t = this.value.trim();
                if (t) {
                    addTag(t);
                    this.value = '';
                    renderPills();
                }
            });
            wrap.addEventListener('click', function () {
                input.focus();
            });

            modal.querySelector('.cancel-btn').onclick = function() { modal.remove(); };
            modal.querySelector('#edit-form').onsubmit = function (e) {
                e.preventDefault();
                var newTitle = document.getElementById('edit-title').value;
                var newDesc = (document.getElementById('edit-desc') && document.getElementById('edit-desc').value) ? document.getElementById('edit-desc').value.trim().slice(0, 100) : '';
                var selectedParentId = selectedFolderId;
                var moveApi = global.BookmarkMaintenance || window.BookmarkMaintenance;
                var folderChanged = !!(moveApi && selectedParentId && String(selectedParentId) !== String(currentParentId));

                var tagsToSave = tagsArray.slice(0, 3).map(function(t) { return String(t).slice(0, 16); });
                function doUpdateAndClose(targetParentIdForReload) {
                    chrome.bookmarks.update(id, {title: newTitle}, function () {
                        if (linkItem) {
                            var titleEl = linkItem.querySelector('.card-title');
                            if (titleEl) titleEl.textContent = newTitle;
                        }
                        saveTags(id, tagsToSave);
                        saveDescription(id, newDesc);
                        saveIconColor(id, selectedIconColor || null, function () {
                            if (context.onSave) context.onSave(id, tagsToSave);
                            if (context.onReload) context.onReload(targetParentIdForReload);
                        });
                    });
                    modal.remove();
                }

                if (folderChanged && moveApi && moveApi.moveBookmark) {
                    var realParentId = String(selectedParentId).replace(/_direct$/, '') || selectedParentId;
                    moveApi.moveBookmark(id, realParentId, function (err) {
                        if (err) {
                            alert('移动书签失败：' + (err.message || '未知错误'));
                            return;
                        }
                        /* 不传入目标目录：刷新数据但保持当前分类视图，不跳转到新书签所在分类 */
                        doUpdateAndClose(null);
                    });
                } else {
                    doUpdateAndClose(null);
                }
            };
            });
        });
    }

    global.EditModal = {openEditModal};
})(typeof window !== 'undefined' ? window : this);
