/**
 * 主应用与 composable / 旧式入口之间的共享句柄，避免在 window 上挂多个 __* 属性。
 * 使用 Vue reactive() 使 settings 变更自动触发依赖的 computed 重新求值。
 */
import { reactive } from 'vue';

export const appRuntime = reactive({
    openBookmarkEditModal: null,
    linkContextMenu: null,
    scrollFloat: null,
    bookmarkRefreshKeepView: null,
    bookmarkLinksGridGetter: null,
    settings: null
});
