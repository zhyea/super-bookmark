/**
 * 设置模块：storage、应用样式；设置抽屉由 App.vue 挂载 SettingsPanel
 */
import { CONTENT_WIDTH_VALUES, maxColumnsForContentWidth } from './settingsConstants.js';
import { normalizeHex } from './settingsUtils.js';
import { appRuntime } from './appRuntime.js';
import { normalizeCustomEngines, normalizeQuickEngineKeys } from './simpleSearchEngines.js';

const SETTINGS_STORAGE_KEY = 'bookmarkManagerSettings';
const DEFAULT_BG_PATH = 'assets/imgs/default_bg.webp';

function I18n() {
    return window.BookmarkManagerI18n;
}

function loadSettings(cb) {
    chrome.storage.local.get(SETTINGS_STORAGE_KEY, function (data) {
        const s = data[SETTINGS_STORAGE_KEY] || {};
        const L = I18n();
        const locale = L && L.normalizeLocale ? L.normalizeLocale(s.locale || (L.detectLocale && L.detectLocale())) : 'zh';
        if (L && L.setLocale) L.setLocale(locale);
        const contentWidth = s.contentWidth && CONTENT_WIDTH_VALUES.includes(s.contentWidth) ? s.contentWidth : '1200';
        const maxC = maxColumnsForContentWidth(contentWidth);
        let colNum = [3, 4, 5].includes(parseInt(s.columns, 10)) ? parseInt(s.columns, 10) : 3;
        if (colNum > maxC) colNum = maxC;
        const backgroundColor = normalizeHex(s.backgroundColor);
        const backgroundImage =
            s.backgroundImage && typeof s.backgroundImage === 'string' && s.backgroundImage.startsWith('data:')
                ? s.backgroundImage
                : '';
        const disableDefaultBg = s.disableDefaultBg === true;
        const theme = s.theme === 'dark' ? 'dark' : 'light';
        const BM = window.BookmarkManager;
        const visibleRoots = BM && BM.normalizeVisibleRoots ? BM.normalizeVisibleRoots(s.visibleRoots) : { bar: true, other: true, mobile: true, others: true };
        const simpleCustomEngines = normalizeCustomEngines(s.simpleCustomEngines);
        appRuntime.settings = {
            showActions: s.showActions === true,
            columns: colNum,
            contentWidth: contentWidth,
            backgroundColor: backgroundColor,
            backgroundImage: backgroundImage,
            disableDefaultBg: disableDefaultBg,
            replaceDefaultNewTab: s.replaceDefaultNewTab === true,
            locale: locale,
            visibleRoots: visibleRoots,
            theme: theme,
            showOverviewAllNav: s.showOverviewAllNav === true,
            useSimplePage: s.useSimplePage === true,
            simpleCustomEngines: simpleCustomEngines,
            simpleQuickEngines: normalizeQuickEngineKeys(
                s.simpleQuickEngines,
                simpleCustomEngines.map((e) => e.key)
            ),
            simpleSearchScale:
                Number.isFinite(Number(s.simpleSearchScale)) && Number(s.simpleSearchScale) >= 80 && Number(s.simpleSearchScale) <= 140
                    ? Number(s.simpleSearchScale)
                    : 100,
            simpleSearchOpacity: (function () {
                const v = Number(s.simpleSearchOpacity);
                if (!Number.isFinite(v) || v < 0 || v > 100) return 100;
                return Math.max(10, Math.min(100, Math.round(v)));
            })(),
            simpleOverlayOpacity:
                Number.isFinite(Number(s.simpleOverlayOpacity)) && Number(s.simpleOverlayOpacity) >= 0 && Number(s.simpleOverlayOpacity) <= 100
                    ? Math.round(Number(s.simpleOverlayOpacity))
                    : 0,
            simpleOverlayBlurPx:
                Number.isFinite(Number(s.simpleOverlayBlurPx)) && Number(s.simpleOverlayBlurPx) >= 0 && Number(s.simpleOverlayBlurPx) <= 32
                    ? Math.round(Number(s.simpleOverlayBlurPx))
                    : 0,
            simpleSearchBorderRadiusPx:
                Number.isFinite(Number(s.simpleSearchBorderRadiusPx)) &&
                Number(s.simpleSearchBorderRadiusPx) >= 0 &&
                Number(s.simpleSearchBorderRadiusPx) <= 40
                    ? Math.round(Number(s.simpleSearchBorderRadiusPx))
                    : 32
        };
        if (typeof document !== 'undefined' && document.body) {
            document.body.classList.toggle('hide-card-actions', !appRuntime.settings.showActions);
            document.body.classList.toggle('theme-dark', appRuntime.settings.theme === 'dark');
        }
        if (cb) cb(appRuntime.settings);
    });
}

function saveSettings(partial) {
    if (!appRuntime.settings) appRuntime.settings = {};
    Object.assign(appRuntime.settings, partial);
    chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: appRuntime.settings });
    if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('bookmark-settings-saved'));
    }
}

function applyContentWidthAndBackground() {
    const s = appRuntime.settings;
    if (!s) return;
    const container = document.querySelector('.container');
    if (container) {
        CONTENT_WIDTH_VALUES.forEach(function (v) {
            container.classList.remove('width-' + v);
        });
        if (s.contentWidth && s.contentWidth !== '1200') container.classList.add('width-' + s.contentWidth);
    }
    if (s.backgroundColor) {
        let bg = s.backgroundColor;
        // When user only toggles theme (not custom background), keep the page fully dark.
        if (s.theme === 'dark' && bg === '#e8f4fc') bg = '#0b1220';
        document.body.style.backgroundColor = bg;
    }
    if (s.backgroundImage) {
        document.body.style.backgroundImage = 'url(' + s.backgroundImage + ')';
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundRepeat = 'no-repeat';
    } else if (s.disableDefaultBg !== true) {
        document.body.style.backgroundImage = 'url(' + DEFAULT_BG_PATH + ')';
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundRepeat = 'no-repeat';
    } else {
        document.body.style.backgroundImage = '';
        document.body.style.backgroundSize = '';
        document.body.style.backgroundPosition = '';
        document.body.style.backgroundRepeat = '';
    }
    if (typeof document !== 'undefined' && document.body) {
        document.body.classList.toggle('theme-dark', s.theme === 'dark');
    }
}

export const BookmarkManagerSettings = {
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    applyContentWidthAndBackground: applyContentWidthAndBackground
};

if (typeof window !== 'undefined') {
    window.BookmarkManagerSettings = BookmarkManagerSettings;
}
