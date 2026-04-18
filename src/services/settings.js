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
import {
    normalizeHex,
    normalizeBookmarkCardTextColor,
    normalizeSimpleOverlayBlurStored,
    overlayBlurPercentToFilterPx
} from './settingsUtils.js';
import { appRuntime } from './appRuntime.js';
import { normalizeCustomEngines, normalizeQuickEngineKeys } from './simpleSearchEngines.js';
import { normalizeWallpaperRotateSourceIdsForSave } from './wallpaperProviders.js';

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
    /* 默认模式下整屏模糊由 #page-bg-blur-layer 承担（与背景透明度同范围）；此处仅铺半透明色，勿再叠局部 backdrop-filter */
    const noBlur = 'none';
    if (containerEl) {
        containerEl.style.backgroundColor = rgbaFromHex(containerHex, alpha);
        containerEl.style.backdropFilter = noBlur;
        containerEl.style.webkitBackdropFilter = noBlur;
    }
    if (headerEl) {
        headerEl.style.backgroundColor = rgbaFromHex(headerHex, alpha);
        headerEl.style.backdropFilter = noBlur;
        headerEl.style.webkitBackdropFilter = noBlur;
    }
    /* 中间列表区底色来自 .container，避免与 container 同色的双层半透明叠加发灰 */
    if (mainEl) {
        mainEl.style.backgroundColor = 'transparent';
        mainEl.style.backdropFilter = noBlur;
        mainEl.style.webkitBackdropFilter = noBlur;
    }
    if (footerEl) {
        footerEl.style.backgroundColor = rgbaFromHex(footerHex, alpha);
        footerEl.style.backdropFilter = noBlur;
        footerEl.style.webkitBackdropFilter = noBlur;
    }
    if (sidebarEl) {
        sidebarEl.style.backgroundColor = rgbaFromHex(sidebarHex, alpha);
        sidebarEl.style.backdropFilter = noBlur;
        sidebarEl.style.webkitBackdropFilter = noBlur;
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

/** 默认模式：整屏 backdrop-filter，叠在 #page-bg-backdrop 之上、#app 之下，与「背景透明度」作用范围一致；极简模式隐藏（由 SimpleMinimalLayout 自行模糊） */
function ensurePageBgBlurLayer() {
    let el = document.getElementById('page-bg-blur-layer');
    if (!el) {
        el = document.createElement('div');
        el.id = 'page-bg-blur-layer';
        el.className = 'page-bg-blur-layer';
        el.setAttribute('aria-hidden', 'true');
        const backdrop = document.getElementById('page-bg-backdrop');
        if (backdrop && backdrop.parentNode) {
            backdrop.parentNode.insertBefore(el, backdrop.nextSibling);
        } else {
            document.body.insertBefore(el, document.body.firstChild);
        }
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
        const wallpaperProvRaw = typeof s.wallpaperProvider === 'string' ? String(s.wallpaperProvider).trim() : '';
        let wallpaperProvider =
            wallpaperProvRaw === 'bing' ||
            wallpaperProvRaw === 'unsplash' ||
            wallpaperProvRaw === 'pexels' ||
            wallpaperProvRaw === 'custom' ||
            wallpaperProvRaw === 'none'
                ? wallpaperProvRaw
                : '';
        if (!wallpaperProvider && backgroundImage) wallpaperProvider = 'custom';
        if (!wallpaperProvider) wallpaperProvider = 'none';
        let wallpaperCustomDataUrl =
            s.wallpaperCustomDataUrl && typeof s.wallpaperCustomDataUrl === 'string' && s.wallpaperCustomDataUrl.startsWith('data:')
                ? s.wallpaperCustomDataUrl
                : '';
        if (!wallpaperCustomDataUrl && wallpaperProvider === 'custom' && backgroundImage) {
            wallpaperCustomDataUrl = backgroundImage;
        }
        const wallpaperRotateMinutes = (function () {
            const rm = Number(s.wallpaperRotateMinutes);
            return Number.isFinite(rm) && rm >= 1 && rm <= 120 ? Math.round(rm) : 30;
        })();
        const wallpaperRotateIndexParsed = parseInt(s.wallpaperRotateIndex, 10);
        const wallpaperRotateIndex =
            Number.isFinite(wallpaperRotateIndexParsed) && wallpaperRotateIndexParsed >= 0 ? wallpaperRotateIndexParsed : 0;
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
            /* 键名沿用 simpleOverlayBlurPx，语义为 0–100（与 simpleOverlayOpacity 一致）；旧版存 0–32 的像素值会在读取时换算 */
            simpleOverlayBlurPx: normalizeSimpleOverlayBlurStored(s.simpleOverlayBlurPx),
            simpleSearchBorderRadiusPx:
                Number.isFinite(Number(s.simpleSearchBorderRadiusPx)) &&
                Number(s.simpleSearchBorderRadiusPx) >= 0 &&
                Number(s.simpleSearchBorderRadiusPx) <= 40
                    ? Math.round(Number(s.simpleSearchBorderRadiusPx))
                    : 32,
            simpleBookmarkCardTextColor: normalizeBookmarkCardTextColor(s.simpleBookmarkCardTextColor),
            contentChromeTransparency: normalizeContentChromeTransparency(s),
            wallpaperProvider: wallpaperProvider,
            wallpaperAutoRotate: s.wallpaperAutoRotate === true,
            wallpaperRotateMinutes: wallpaperRotateMinutes,
            wallpaperRotateSourceIds: normalizeWallpaperRotateSourceIdsForSave(s.wallpaperRotateSourceIds),
            wallpaperRotateIndex: wallpaperRotateIndex,
            wallpaperCustomDataUrl: wallpaperCustomDataUrl
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
    backdrop.style.filter = 'none';

    const blurLayer = ensurePageBgBlurLayer();
    if (s.useSimplePage === true) {
        blurLayer.style.display = 'none';
        blurLayer.style.backdropFilter = 'none';
        blurLayer.style.webkitBackdropFilter = 'none';
    } else {
        blurLayer.style.display = '';
        const blurPct = Number(s.simpleOverlayBlurPx);
        const blurP = Number.isFinite(blurPct) && blurPct >= 0 && blurPct <= 100 ? Math.round(blurPct) : 0;
        const blurPx = overlayBlurPercentToFilterPx(blurP);
        const blurVal = blurPx > 0 ? 'blur(' + blurPx + 'px)' : 'none';
        blurLayer.style.backdropFilter = blurVal;
        blurLayer.style.webkitBackdropFilter = blurVal;
    }
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
