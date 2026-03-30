<template>
    <Teleport to="body">
        <div v-show="visible" class="bookmark-edit-modal edit-modal">
            <div class="edit-modal-content">
                <h3>{{ t('editTitle') }}</h3>
                <form id="edit-form" @submit.prevent="onSubmit">
                    <div class="form-group">
                        <label for="edit-title">{{ t('labelTitle') }}</label>
                        <input id="edit-title" v-model="titleVal" type="text" required />
                    </div>
                    <div class="form-group">
                        <label>{{ t('labelFolder') }}</label>
                        <div ref="dropdownRef" class="folder-dropdown" id="edit-folder-dropdown">
                            <button
                                type="button"
                                id="edit-folder-trigger"
                                class="folder-dropdown-trigger"
                                aria-haspopup="listbox"
                                :aria-expanded="folderOpen ? 'true' : 'false'"
                                @click.prevent.stop="folderOpen = !folderOpen"
                            >
                                {{ currentPathDisplay }}
                            </button>
                            <div
                                id="edit-folder-panel"
                                class="folder-dropdown-panel"
                                :class="{ open: folderOpen }"
                                role="listbox"
                                :aria-label="t('folderPanelAria')"
                            >
                                <div id="edit-folder-tree" class="folder-tree">
                                    <div
                                        v-for="row in folderRows"
                                        :key="row.id"
                                        class="folder-tree-item"
                                        :class="{ selected: isFolderRowSelected(row) }"
                                        :data-id="row.id"
                                        :style="{ paddingLeft: row.depth * 16 + 10 + 'px' }"
                                        @click.stop="selectFolder(row)"
                                    >
                                        {{ row.pathDisplay }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>{{ t('labelIcon') }}</label>
                        <div class="icon-color-row" role="group" :aria-label="t('labelIcon')">
                            <button
                                type="button"
                                class="icon-color-swatch auto"
                                :class="{ selected: !selectedIconColor }"
                                data-color=""
                                :title="t('autoColor')"
                                :aria-label="t('autoColor')"
                                @click="selectedIconColor = ''"
                            >
                                {{ t('autoColorBtn') }}
                            </button>
                            <button
                                v-for="c in iconColors"
                                :key="c"
                                type="button"
                                class="icon-color-swatch"
                                :class="{ selected: selectedIconColor === c }"
                                :data-color="c"
                                :style="{ background: c }"
                                :title="c"
                                :aria-label="t('colorAria')"
                                @click="selectedIconColor = c"
                            ></button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="input-tag-wrap">{{ t('labelTags') }}</label>
                        <div
                            id="input-tag-wrap"
                            ref="tagWrapRef"
                            class="input-tag-wrap"
                            role="group"
                            :aria-label="t('tagInputAria')"
                            @click="focusTagInput"
                        >
                            <span v-for="(tag, idx) in tagsArray" :key="tag + idx" class="input-tag-pill">
                                <span class="input-tag-pill-text">{{ tag }}</span>
                                <button
                                    type="button"
                                    class="input-tag-remove"
                                    :aria-label="t('removeTagAria')"
                                    @click.prevent.stop="removeTag(tag)"
                                >
                                    ×
                                </button>
                            </span>
                            <input
                                id="input-tag-input"
                                ref="tagInputRef"
                                v-model="tagInputVal"
                                type="text"
                                class="input-tag-inner"
                                :placeholder="t('tagPlaceholder')"
                                maxlength="16"
                                autocomplete="off"
                                @keydown="onTagKeydown"
                                @input="onTagInput"
                                @blur="onTagBlur"
                            />
                        </div>
                        <span class="desc-hint">{{ tagsArray.length }} / 3</span>
                    </div>
                    <div class="form-group">
                        <label for="edit-desc">{{ t('labelDesc') }}</label>
                        <textarea
                            id="edit-desc"
                            v-model="descriptionVal"
                            class="edit-desc"
                            maxlength="100"
                            :placeholder="t('descPlaceholder')"
                            @input="descLen = (descriptionVal || '').length"
                        ></textarea>
                        <span class="desc-hint">{{ descLen }} / 100</span>
                    </div>
                    <div class="form-group">
                        <label class="edit-url-label">{{ t('labelUrl') }}</label>
                        <div class="edit-url-readonly">{{ urlDisplay }}</div>
                    </div>
                    <div class="button-group">
                        <button type="button" class="cancel-btn" @click="close">{{ t('cancel') }}</button>
                        <button type="submit" class="save-btn">{{ t('save') }}</button>
                    </div>
                </form>
            </div>
        </div>
    </Teleport>
</template>

<script setup>
import { ref, computed, watch, onUnmounted, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { CARD_ICON_BACKGROUND_COLORS } from '../../services/constants.js';
import { BookmarkManager as BM } from '../../services/bookmarks.js';
import { BookmarkMaintenance } from '../../services/bookmarkMaintenance.js';
import { buildFolderTreeFlat, getCurrentParentId } from '../../utils/bookmarkEditHelpers.js';

const { t } = useI18n();

const visible = ref(false);
const titleVal = ref('');
const urlDisplay = ref('');
const descriptionVal = ref('');
const descLen = ref(0);
const tagsArray = ref([]);
const tagInputVal = ref('');
const tagInputRef = ref(null);
const tagWrapRef = ref(null);
const folderRows = ref([]);
const selectedFolderId = ref('');
const currentParentId = ref('');
const folderOpen = ref(false);
const dropdownRef = ref(null);
const bookmarkId = ref('');
const linkItemRef = ref(null);
const contextRef = ref(null);
const selectedIconColor = ref('');

const iconColors = CARD_ICON_BACKGROUND_COLORS && CARD_ICON_BACKGROUND_COLORS.length
    ? CARD_ICON_BACKGROUND_COLORS
    : ['#42b883', '#e34c26', '#61dafb', '#764abc', '#f7df1e', '#3178c6', '#f97316', '#14b8a6', '#ec4899'];

const currentPathDisplay = computed(() => {
    const pick = t('folderPick');
    for (let r = 0; r < folderRows.value.length; r++) {
        const row = folderRows.value[r];
        if (
            row.id === selectedFolderId.value ||
            (String(selectedFolderId.value).indexOf('_direct') >= 0 &&
                row.id === String(selectedFolderId.value).replace(/_direct$/, ''))
        ) {
            return row.pathDisplay;
        }
    }
    return pick;
});

function isFolderRowSelected(row) {
    return (
        row.id === selectedFolderId.value ||
        (String(selectedFolderId.value).indexOf('_direct') >= 0 &&
            row.id === String(selectedFolderId.value).replace(/_direct$/, ''))
    );
}

function selectFolder(row) {
    selectedFolderId.value = row.id;
    folderOpen.value = false;
}

function focusTagInput() {
    tagInputRef.value?.focus();
}

function removeTag(tag) {
    const idx = tagsArray.value.indexOf(tag);
    if (idx !== -1) tagsArray.value.splice(idx, 1);
    nextTick(() => tagInputRef.value?.focus());
}

function addTag(val) {
    const t0 = String(val || '')
        .trim()
        .slice(0, 16);
    if (!t0) return;
    if (tagsArray.value.length >= 3) return;
    if (tagsArray.value.indexOf(t0) === -1) tagsArray.value.push(t0);
}

function commitTagInput(e) {
    const raw = tagInputVal.value;
    const trimmed = raw.trim();
    if (!trimmed) {
        if (e && (e.key === ',' || e.key === '，' || e.key === ' ' || e.code === 'Space')) e.preventDefault();
        return;
    }
    if (tagsArray.value.length >= 3) {
        if (e && e.key === 'Tab') return;
        if (e && (e.key === 'Enter' || e.key === ',' || e.key === '，' || e.key === ' ' || e.code === 'Space'))
            e.preventDefault();
        return;
    }
    if (e) e.preventDefault();
    addTag(raw);
    tagInputVal.value = '';
}

function onTagKeydown(e) {
    if (e.key === 'Enter') {
        commitTagInput(e);
        return;
    }
    if (e.key === ' ' || e.code === 'Space') {
        commitTagInput(e);
        return;
    }
    if (e.key === 'Tab' && tagInputRef.value && tagInputRef.value.value.trim()) {
        commitTagInput(e);
        return;
    }
    if (e.key === ',' || e.key === '，') {
        commitTagInput(e);
        return;
    }
    if (e.key === 'Backspace' && tagInputRef.value && tagInputRef.value.value === '' && tagsArray.value.length) {
        tagsArray.value.pop();
    }
}

function onTagInput() {
    const v = tagInputVal.value;
    if (/[,，\s]/.test(v)) {
        const segs = v
            .split(/[,，\s]+/)
            .map((s) => s.trim())
            .filter(Boolean);
        const trailing = /[,，\s]$/.test(v);
        if (!trailing && segs.length) {
            segs.slice(0, -1).forEach((p) => addTag(p));
            tagInputVal.value = segs[segs.length - 1] || '';
        } else {
            segs.forEach((p) => addTag(p));
            tagInputVal.value = '';
        }
    }
}

function onTagBlur() {
    const t0 = tagInputVal.value.trim();
    if (t0) {
        addTag(t0);
        tagInputVal.value = '';
    }
}

function onOutsideClick(e) {
    if (dropdownRef.value && !dropdownRef.value.contains(e.target)) {
        folderOpen.value = false;
    }
}

watch(visible, (v) => {
    if (v) {
        document.addEventListener('click', onOutsideClick);
    } else {
        document.removeEventListener('click', onOutsideClick);
    }
});

onUnmounted(() => {
    document.removeEventListener('click', onOutsideClick);
});

function close() {
    visible.value = false;
}

function openEditModal(linkItem, context) {
    if (!linkItem || !context) return;
    const id = linkItem.dataset.bookmarkId;
    const titleEl = linkItem.querySelector('.card-title');
    const title = titleEl ? titleEl.textContent : '';
    const url = linkItem.querySelector('a')?.href || '';
    const primary = context.getPrimary && context.getPrimary();
    const secondary = context.getSecondary && context.getSecondary();
    const userTags = (secondary && secondary._userTags && secondary._userTags[id]) || [];
    tagsArray.value = userTags.slice(0, 3).map((tag) => String(tag).slice(0, 16));
    descriptionVal.value =
        secondary && secondary._descriptions && secondary._descriptions[id]
            ? String(secondary._descriptions[id])
            : '';
    descLen.value = (descriptionVal.value || '').length;
    const savedIconColor = (secondary && secondary._userIconColor && secondary._userIconColor[id]) || '';
    selectedIconColor.value = savedIconColor;
    titleVal.value = title;
    urlDisplay.value = url;
    bookmarkId.value = id;
    linkItemRef.value = linkItem;
    contextRef.value = context;
    tagInputVal.value = '';
    folderOpen.value = false;

    chrome.bookmarks.get(id, function (bmNodes) {
        if (chrome.runtime.lastError) bmNodes = null;
        const bm = bmNodes && bmNodes[0];
        const actualParentId = bm && bm.parentId ? String(bm.parentId) : '';
        currentParentId.value = actualParentId || getCurrentParentId(primary, secondary);

        chrome.bookmarks.getTree(function (tree) {
            folderRows.value = buildFolderTreeFlat(tree);
            selectedFolderId.value = currentParentId.value;
            visible.value = true;
            nextTick(() => {
                tagInputRef.value?.focus();
            });
        });
    });
}

function onSubmit() {
    const id = bookmarkId.value;
    const linkItem = linkItemRef.value;
    const context = contextRef.value;
    const newTitle = titleVal.value;
    const newDesc = (descriptionVal.value || '').trim().slice(0, 100);
    const selectedParentId = selectedFolderId.value;
    const moveApi = BookmarkMaintenance;
    const folderChanged = !!(moveApi && selectedParentId && String(selectedParentId) !== String(currentParentId.value));

    const tagsToSave = tagsArray.value.slice(0, 3).map((tag) => String(tag).slice(0, 16));

    function doUpdateAndClose(targetParentIdForReload) {
        chrome.bookmarks.update(id, { title: newTitle }, function () {
            if (linkItem) {
                const te = linkItem.querySelector('.card-title');
                if (te) te.textContent = newTitle;
            }
            BM.saveTags(id, tagsToSave);
            BM.saveDescription(id, newDesc);
            BM.saveIconColor(id, selectedIconColor.value || null, function () {
                if (context.onSave) context.onSave(id, tagsToSave);
                if (context.onReload) context.onReload(targetParentIdForReload);
            });
        });
        close();
    }

    if (folderChanged && moveApi && moveApi.moveBookmark) {
        const realParentId = String(selectedParentId).replace(/_direct$/, '') || selectedParentId;
        moveApi.moveBookmark(id, realParentId, function (err) {
            if (err) {
                alert('移动书签失败：' + (err.message || '未知错误'));
                return;
            }
            doUpdateAndClose(null);
        });
    } else {
        doUpdateAndClose(null);
    }
}

defineExpose({ open: openEditModal });
</script>

<style scoped>
.bookmark-edit-modal.edit-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}
.edit-modal-content {
    background: #fff;
    padding: 30px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    width: 400px;
    max-width: 90%;
}
.bookmark-edit-modal h3 {
    margin-bottom: 20px;
    color: #1890ff;
}
.bookmark-edit-modal form {
    display: flex;
    flex-direction: column;
    gap: 15px;
}
.bookmark-edit-modal .form-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
}
.bookmark-edit-modal label {
    font-size: 14px;
    font-weight: 600;
    color: #333;
}
.bookmark-edit-modal input[type='text']:not(.input-tag-inner) {
    padding: 10px;
    border: 1px solid #e8e8e8;
    border-radius: 4px;
    font-size: 14px;
    outline: none;
}
.bookmark-edit-modal input[type='text']:not(.input-tag-inner):focus {
    border-color: #1890ff;
}
.bookmark-edit-modal select {
    padding: 10px;
    border: 1px solid #e8e8e8;
    border-radius: 4px;
    font-size: 14px;
    outline: none;
    background: #fff;
    cursor: pointer;
}
.bookmark-edit-modal select:focus {
    border-color: #1890ff;
}
.bookmark-edit-modal .edit-url-readonly {
    padding: 10px;
    background: #f5f5f5;
    border-radius: 4px;
    font-size: 13px;
    color: #666;
    word-break: break-all;
}
.bookmark-edit-modal .edit-url-label {
    font-size: 14px;
    font-weight: 600;
    color: #333;
    display: block;
    margin-bottom: 5px;
}
.bookmark-edit-modal .button-group {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: 10px;
}
.bookmark-edit-modal button {
    padding: 8px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
}
.bookmark-edit-modal .cancel-btn {
    background: #f0f0f0;
    color: #333;
}
.bookmark-edit-modal .save-btn {
    background: #1890ff;
    color: #fff;
}
.input-tag-wrap {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 8px;
    min-height: 32px;
    padding: 1px 11px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    background: #fff;
    transition:
        border-color 0.2s,
        box-shadow 0.2s;
}
.input-tag-wrap:hover {
    border-color: #c0c4cc;
}
.input-tag-wrap:focus-within {
    border-color: #409eff;
    outline: none;
    box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}
.input-tag-pill {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    height: 24px;
    padding: 0 8px;
    font-size: 12px;
    line-height: 22px;
    color: #909399;
    background: #f4f4f5;
    border: 1px solid #e9e9eb;
    border-radius: 4px;
}
.input-tag-pill .input-tag-pill-text {
    margin-right: 2px;
}
.input-tag-pill .input-tag-remove {
    padding: 0;
    margin: 0;
    width: 14px;
    height: 14px;
    border: none;
    background: transparent;
    color: #909399;
    cursor: pointer;
    border-radius: 50%;
    font-size: 12px;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition:
        color 0.2s,
        background 0.2s;
}
.input-tag-pill .input-tag-remove:hover {
    color: #409eff;
    background: #ecf5ff;
}
.input-tag-inner {
    flex: 1;
    min-width: 80px;
    height: 30px;
    padding: 0 4px;
    border: none;
    font-size: 14px;
    outline: none;
    background: transparent;
}
.bookmark-edit-modal .icon-color-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
}
.bookmark-edit-modal .icon-color-swatch {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    border: 2px solid transparent;
    cursor: pointer;
    flex-shrink: 0;
    transition:
        border-color 0.2s,
        transform 0.2s;
}
.bookmark-edit-modal .icon-color-swatch:hover {
    transform: scale(1.08);
}
.bookmark-edit-modal .icon-color-swatch.selected {
    border-color: #1890ff;
    box-shadow: 0 0 0 1px #1890ff;
}
.bookmark-edit-modal .icon-color-swatch.auto {
    background: linear-gradient(135deg, #f0f0f0 50%, #e0e0e0 50%);
    font-size: 11px;
    color: #999;
    display: flex;
    align-items: center;
    justify-content: center;
}
.bookmark-edit-modal .folder-dropdown {
    position: relative;
}
.bookmark-edit-modal .folder-dropdown-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #e8e8e8;
    border-radius: 4px;
    background: #fff;
    font-size: 14px;
    color: #333;
    cursor: pointer;
    text-align: left;
}
.bookmark-edit-modal .folder-dropdown-trigger:hover {
    border-color: #c0c4cc;
}
.bookmark-edit-modal .folder-dropdown-trigger::after {
    content: '';
    width: 0;
    height: 0;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 5px solid #909399;
    margin-left: 8px;
    flex-shrink: 0;
}
.bookmark-edit-modal .folder-dropdown-panel {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 4px;
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid #e8e8e8;
    border-radius: 4px;
    padding: 8px;
    background: #fff;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    z-index: 10;
}
.bookmark-edit-modal .folder-dropdown-panel.open {
    display: block;
}
.bookmark-edit-modal .folder-tree-item {
    padding: 6px 10px;
    cursor: pointer;
    border-radius: 4px;
    font-size: 13px;
}
.bookmark-edit-modal .folder-tree-item:hover {
    background: #e6f7ff;
}
.bookmark-edit-modal .folder-tree-item.selected {
    background: #bae7ff;
    color: #0050b3;
}
.bookmark-edit-modal textarea.edit-desc {
    min-height: 60px;
    resize: vertical;
    padding: 10px;
    border: 1px solid #e8e8e8;
    border-radius: 4px;
    font-size: 14px;
    outline: none;
}
.bookmark-edit-modal textarea.edit-desc:focus {
    border-color: #1890ff;
}
.bookmark-edit-modal .desc-hint {
    font-size: 12px;
    color: #8c8c8c;
    margin-top: 2px;
}
</style>
