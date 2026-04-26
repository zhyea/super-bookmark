export function getSettingsModule() {
    return typeof window !== 'undefined' ? window.BookmarkManagerSettings : null;
}

export function getBookmarkManager() {
    return typeof window !== 'undefined' ? window.BookmarkManager : null;
}

export function getLegacyI18n() {
    return typeof window !== 'undefined' ? window.BookmarkManagerI18n : null;
}

export function persistSettings(partial) {
    getSettingsModule()?.saveSettings(partial);
}

export function applyLayout() {
    getSettingsModule()?.applyContentWidthAndBackground();
}
