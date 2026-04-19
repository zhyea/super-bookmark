/**
 * 按设置定时切换在线壁纸源
 */
import { appRuntime } from './appRuntime.js';
import {
    fetchWallpaperByProvider,
    isRemoteWallpaperId,
    normalizeWallpaperRotateSourceIdsForSave,
    WALLPAPER_CUSTOM_ROTATE_ID
} from './wallpaperProviders.js';
import { BookmarkManagerSettings } from './settings.js';

let intervalId = null;

function clearTimer() {
    if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
    }
}

function intervalMs() {
    const s = appRuntime.settings;
    const min = Number(s && s.wallpaperRotateMinutes);
    const m = Number.isFinite(min) && min >= 1 && min <= 120 ? Math.round(min) : 30;
    return m * 60 * 1000;
}

/**
 * 参与轮换的图源默认不进列表（须在预览中勾选「加入轮换」）；若已开启自动轮换但列表为空，
 * 用当前图源或必应作为种子，否则定时器不会启动。
 * @param {Record<string, unknown> | null | undefined} s
 * @returns {string[]}
 */
function defaultWallpaperRotateSourceIdsWhenEmpty(s) {
    if (!s) return ['bing'];
    const p = typeof s.wallpaperProvider === 'string' ? s.wallpaperProvider.trim() : '';
    if (isRemoteWallpaperId(p)) return [p];
    if (p === WALLPAPER_CUSTOM_ROTATE_ID) {
        const d = s.wallpaperCustomDataUrl;
        if (d && typeof d === 'string' && d.startsWith('data:')) return [WALLPAPER_CUSTOM_ROTATE_ID];
        const bg = s.backgroundImage;
        if (bg && typeof bg === 'string' && bg.startsWith('data:')) return [WALLPAPER_CUSTOM_ROTATE_ID];
    }
    return ['bing'];
}

async function tickAdvance() {
    const s = appRuntime.settings;
    if (!s || s.wallpaperAutoRotate !== true) return;
    const ids = normalizeWallpaperRotateSourceIdsForSave(s.wallpaperRotateSourceIds);
    if (!ids.length) return;
    let idx = parseInt(s.wallpaperRotateIndex, 10);
    if (!Number.isFinite(idx) || idx < 0) idx = 0;
    idx = (idx + 1) % ids.length;
    const id = ids[idx];
    try {
        if (id === WALLPAPER_CUSTOM_ROTATE_ID) {
            const dataUrl = s.wallpaperCustomDataUrl;
            if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
                BookmarkManagerSettings.saveSettings({ wallpaperRotateIndex: idx });
                return;
            }
            BookmarkManagerSettings.saveSettings({
                backgroundImage: dataUrl,
                wallpaperProvider: WALLPAPER_CUSTOM_ROTATE_ID,
                disableDefaultBg: false,
                wallpaperRotateIndex: idx
            });
        } else {
            const dataUrl = await fetchWallpaperByProvider(id);
            BookmarkManagerSettings.saveSettings({
                backgroundImage: dataUrl,
                wallpaperProvider: id,
                disableDefaultBg: false,
                wallpaperRotateIndex: idx
            });
        }
        BookmarkManagerSettings.applyContentWidthAndBackground();
    } catch (e) {
        if (typeof console !== 'undefined' && console.warn) {
            console.warn('[wallpaperRotation]', id, e);
        }
    }
}

export function restartWallpaperRotation() {
    clearTimer();
    const s = appRuntime.settings;
    if (!s || s.wallpaperAutoRotate !== true) return;
    let ids = normalizeWallpaperRotateSourceIdsForSave(s.wallpaperRotateSourceIds);
    if (ids.length < 1) {
        const seeded = normalizeWallpaperRotateSourceIdsForSave(defaultWallpaperRotateSourceIdsWhenEmpty(s));
        if (seeded.length < 1) return;
        BookmarkManagerSettings.saveSettings({ wallpaperRotateSourceIds: seeded.slice() });
        ids = normalizeWallpaperRotateSourceIdsForSave(appRuntime.settings.wallpaperRotateSourceIds);
    }
    if (ids.length < 1) return;
    intervalId = setInterval(tickAdvance, intervalMs());
}

export function initWallpaperRotation() {
    restartWallpaperRotation();
    if (typeof window !== 'undefined' && !window.__wallpaperRotateBound) {
        window.__wallpaperRotateBound = true;
        window.addEventListener('bookmark-settings-saved', restartWallpaperRotation);
    }
}

export function disposeWallpaperRotation() {
    clearTimer();
    if (typeof window !== 'undefined' && window.__wallpaperRotateBound) {
        window.__wallpaperRotateBound = false;
        window.removeEventListener('bookmark-settings-saved', restartWallpaperRotation);
    }
}
