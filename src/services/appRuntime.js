/**
 * 主应用与 composable / 旧式入口之间的共享句柄，避免在 window 上挂多个 __* 属性。
 */
export const appRuntime = {
    openBookmarkEditModal: null,
    linkContextMenu: null,
    scrollFloat: null,
    bookmarkRefreshKeepView: null,
    bookmarkLinksGridGetter: null,
    settings: null,
    remountSettingsPanel: null
};
