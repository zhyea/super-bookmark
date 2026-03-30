/**
 * 设置模块：storage、应用样式；设置抽屉由 SettingsPanel.vue + createApp 挂载
 */
import { createApp } from 'vue';
import SettingsPanel from '../components/settings/SettingsPanel.vue';
import { i18n } from '../i18n/instance.js';
import { CONTENT_WIDTH_VALUES, maxColumnsForContentWidth } from './settingsConstants.js';
import { normalizeHex } from './settingsUtils.js';
import { appRuntime } from './appRuntime.js';

const SETTINGS_STORAGE_KEY = 'bookmarkManagerSettings';
const DEFAULT_BG_PATH = 'assets/imgs/default_bg.webp';

let storedLinksGrid = null;
let settingsApp = null;
let settingsContainer = null;

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
        const BM = window.BookmarkManager;
        const visibleRoots = BM && BM.normalizeVisibleRoots ? BM.normalizeVisibleRoots(s.visibleRoots) : { bar: true, other: true, mobile: true, others: true };
        appRuntime.settings = {
            showActions: s.showActions === true,
            columns: colNum,
            contentWidth: contentWidth,
            backgroundColor: backgroundColor,
            backgroundImage: backgroundImage,
            disableDefaultBg: disableDefaultBg,
            replaceDefaultNewTab: s.replaceDefaultNewTab === true,
            locale: locale,
            visibleRoots: visibleRoots
        };
        if (typeof document !== 'undefined' && document.body) {
            document.body.classList.toggle('hide-card-actions', !appRuntime.settings.showActions);
        }
        if (cb) cb(appRuntime.settings);
    });
}

function saveSettings(partial) {
    if (!appRuntime.settings) appRuntime.settings = {};
    Object.assign(appRuntime.settings, partial);
    chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: appRuntime.settings });
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
        document.body.style.backgroundColor = s.backgroundColor;
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
}

function renderSettingsUI(linksGrid) {
    if (linksGrid) storedLinksGrid = linksGrid;
    if (settingsContainer && settingsApp) {
        settingsApp.unmount();
        settingsContainer.remove();
        settingsContainer = null;
        settingsApp = null;
    }
    settingsContainer = document.createElement('div');
    settingsContainer.className = 'settings-wrap';
    document.body.appendChild(settingsContainer);
    settingsApp = createApp(SettingsPanel, {
        linksGrid: storedLinksGrid
    });
    settingsApp.use(i18n);
    settingsApp.mount(settingsContainer);
    appRuntime.remountSettingsPanel = function () {
        renderSettingsUI(null);
    };
}

export const BookmarkManagerSettings = {
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    applyContentWidthAndBackground: applyContentWidthAndBackground,
    renderSettingsUI: renderSettingsUI
};

if (typeof window !== 'undefined') {
    window.BookmarkManagerSettings = BookmarkManagerSettings;
}
