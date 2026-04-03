/**
 * 设置模块：storage、应用样式；设置抽屉由 App.vue 挂载 SettingsPanel
 */
import {
    CONTENT_WIDTH_VALUES,
    normalizeContentWidthPercentFromStorage,
    maxColumnsForContentWidthPercent,
    clampContentWidthPercent,
    CONTENT_WIDTH_PERCENT_DEFAULT
} from './settingsConstants.js';
import { normalizeHex, normalizeBookmarkCardTextColor } from './settingsUtils.js';
import { appRuntime } from './appRuntime.js';
import { normalizeCustomEngines, normalizeQuickEngineKeys } from './simpleSearchEngines.js';

const SETTINGS_STORAGE_KEY = 'bookmarkManagerSettings';
const DEFAULT_BG_PATH = 'assets/imgs/default_bg.jpg';

function hexToRgb(hex) {
    const h = (hex || '').replace('#', '');
    if (h.length !== 6) return { r: 248, g: 248, b: 248 };
    return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16)
    };
}

function rgbaFromHex(hex, alpha) {
    const rgb = hexToRgb(hex);
    const a = Math.max(0, Math.min(1, alpha));
    return 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + a + ')';
}

function normalizeContentChromeTransparency(s) {
    const t = Number(s.contentChromeTransparency);
    if (Number.isFinite(t) && t >= 0 && t <= 100) return Math.round(t);
    return 0;
}

function applyLayoutChromeSurfaces(s) {
    const ct = normalizeContentChromeTransparency(s);
    const alpha = 1 - ct / 100;
    const dark = s.theme === 'dark';
    /* 与 global.css 中默认色一致；须同步处理 .container / .sidebar，否则其不透明显在子元素下方，透明度滑块几乎看不出效果 */
    const containerHex = dark ? '#0b1220' : '#ffffff';
    const headerHex = dark ? '#0f172a' : '#f8f8f8';
    const footerHex = dark ? '#0f172a' : '#f8f8f8';
    const sidebarHex = dark ? '#0f172a' : '#f8f8f8';
    const containerEl = document.querySelector('.container');
    const headerEl = document.querySelector('.header');
    const mainEl = document.querySelector('.main-content');
    const footerEl = document.querySelector('.footer');
    const sidebarEl = document.querySelector('.sidebar');
    const blurRaw = Number(s.simpleOverlayBlurPx);
    const blur = Number.isFinite(blurRaw) && blurRaw >= 0 && blurRaw <= 32 ? Math.round(blurRaw) : 0;
    const blurValue = blur > 0 ? 'blur(' + blur + 'px)' : 'none';
    if (containerEl) {
        containerEl.style.backgroundColor = rgbaFromHex(containerHex, alpha);
        containerEl.style.backdropFilter = blurValue;
        containerEl.style.webkitBackdropFilter = blurValue;
    }
    if (headerEl) {
        headerEl.style.backgroundColor = rgbaFromHex(headerHex, alpha);
        headerEl.style.backdropFilter = blurValue;
        headerEl.style.webkitBackdropFilter = blurValue;
    }
    /* 中间列表区底色来自 .container，避免与 container 同色的双层半透明叠加发灰 */
    if (mainEl) {
        mainEl.style.backgroundColor = 'transparent';
        mainEl.style.backdropFilter = blurValue;
        mainEl.style.webkitBackdropFilter = blurValue;
    }
    if (footerEl) {
        footerEl.style.backgroundColor = rgbaFromHex(footerHex, alpha);
        footerEl.style.backdropFilter = blurValue;
        footerEl.style.webkitBackdropFilter = blurValue;
    }
    if (sidebarEl) {
        sidebarEl.style.backgroundColor = rgbaFromHex(sidebarHex, alpha);
        sidebarEl.style.backdropFilter = blurValue;
        sidebarEl.style.webkitBackdropFilter = blurValue;
    }
}

function ensurePageBgBackdrop() {
    let el = document.getElementById('page-bg-backdrop');
    if (!el) {
        el = document.createElement('div');
        el.id = 'page-bg-backdrop';
        el.className = 'page-bg-backdrop';
        el.setAttribute('aria-hidden', 'true');
        document.body.insertBefore(el, document.body.firstChild);
    }
    return el;
}

function I18n() {
    return window.BookmarkManagerI18n;
}

function loadSettings(cb) {
    chrome.storage.local.get(SETTINGS_STORAGE_KEY, function (data) {
        const s = data[SETTINGS_STORAGE_KEY] || {};
        const L = I18n();
        const locale = L && L.normalizeLocale ? L.normalizeLocale(s.locale || (L.detectLocale && L.detectLocale())) : 'zh';
        if (L && L.setLocale) L.setLocale(locale);
        const vw0 = typeof window !== 'undefined' ? window.innerWidth : 1200;
        const contentWidthPercent = normalizeContentWidthPercentFromStorage(s);
        const maxC = maxColumnsForContentWidthPercent(contentWidthPercent, vw0);
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
            contentWidthPercent: contentWidthPercent,
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
                    : 32,
            simpleBookmarkCardTextColor: normalizeBookmarkCardTextColor(s.simpleBookmarkCardTextColor),
            contentChromeTransparency: normalizeContentChromeTransparency(s)
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
    const root = document.documentElement;
    if (root) {
        const p = clampContentWidthPercent(s.contentWidthPercent ?? CONTENT_WIDTH_PERCENT_DEFAULT);
        root.style.setProperty('--content-width-percent', String(p));
    }
    const container = document.querySelector('.container');
    if (container) {
        CONTENT_WIDTH_VALUES.forEach(function (v) {
            container.classList.remove('width-' + v);
        });
    }
    const backdrop = ensurePageBgBackdrop();
    let bg = s.backgroundColor || '#e8f4fc';
    if (s.theme === 'dark' && bg === '#e8f4fc') bg = '#0b1220';
    backdrop.style.backgroundColor = bg;
    if (s.backgroundImage) {
        backdrop.style.backgroundImage = 'url(' + s.backgroundImage + ')';
        backdrop.style.backgroundSize = 'cover';
        backdrop.style.backgroundPosition = 'center';
        backdrop.style.backgroundRepeat = 'no-repeat';
    } else if (s.disableDefaultBg !== true) {
        backdrop.style.backgroundImage = 'url(' + DEFAULT_BG_PATH + ')';
        backdrop.style.backgroundSize = 'cover';
        backdrop.style.backgroundPosition = 'center';
        backdrop.style.backgroundRepeat = 'no-repeat';
    } else {
        backdrop.style.backgroundImage = '';
        backdrop.style.backgroundSize = '';
        backdrop.style.backgroundPosition = '';
        backdrop.style.backgroundRepeat = '';
    }
    /* 背景透明度：仅作用于 body 下全页背景层（色/图），0=不透明 100=完全透明；勿与内容区 chrome 混用 */
    const bgTrans = Number(s.simpleOverlayOpacity);
    const t = Number.isFinite(bgTrans) && bgTrans >= 0 && bgTrans <= 100 ? bgTrans : 0;
    backdrop.style.opacity = String(1 - t / 100);
    /* 背景模糊度：磨砂玻璃效果由 applyLayoutChromeSurfaces 控制（backdrop-filter）；背景层本身不再做 blur */
    backdrop.style.filter = 'none';
    document.body.style.backgroundColor = 'transparent';
    document.body.style.backgroundImage = 'none';
    document.body.style.backgroundSize = '';
    document.body.style.backgroundPosition = '';
    document.body.style.backgroundRepeat = '';
    if (typeof document !== 'undefined' && document.body) {
        document.body.classList.toggle('theme-dark', s.theme === 'dark');
    }
    applyLayoutChromeSurfaces(s);
}

export const BookmarkManagerSettings = {
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    applyContentWidthAndBackground: applyContentWidthAndBackground
};

if (typeof window !== 'undefined') {
    window.BookmarkManagerSettings = BookmarkManagerSettings;
}
