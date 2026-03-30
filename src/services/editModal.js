/**
 * 书签编辑入口：视图在 Vue 组件 BookmarkEditModal，此处仅保留兼容 API
 */
import { appRuntime } from './appRuntime.js';

export const EditModal = {
    openEditModal(linkItem, context) {
        if (typeof appRuntime.openBookmarkEditModal === 'function') {
            appRuntime.openBookmarkEditModal(linkItem, context);
        }
    }
};

if (typeof window !== 'undefined') {
    window.EditModal = EditModal;
}
