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
                        <FolderDropdown v-model="selectedFolderId" :folder-rows="folderRows" />
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
                        <TagInput
                            id="input-tag-wrap"
                            ref="tagInputRef"
                            v-model="tagsArray"
                            :placeholder="t('tagPlaceholder')"
                        />
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
import TagInput from './TagInput.vue';
import FolderDropdown from './FolderDropdown.vue';

const { t } = useI18n();

const visible = ref(false);
const titleVal = ref('');
const urlDisplay = ref('');
const descriptionVal = ref('');
const descLen = ref(0);
const tagsArray = ref([]);
const tagInputRef = ref(null);
const folderRows = ref([]);
const selectedFolderId = ref('');
const currentParentId = ref('');
const bookmarkId = ref('');
const linkItemRef = ref(null);
const contextRef = ref(null);
const selectedIconColor = ref('');

const iconColors = CARD_ICON_BACKGROUND_COLORS && CARD_ICON_BACKGROUND_COLORS.length
    ? CARD_ICON_BACKGROUND_COLORS
    : ['#42b883', '#e34c26', '#61dafb', '#764abc', '#f7df1e', '#3178c6', '#f97316', '#14b8a6', '#ec4899'];

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
