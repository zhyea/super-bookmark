/**
 * 按设置定时切换在线壁纸源
 */
import { appRuntime } from './appRuntime.js';
import {
    fetchWallpaperByProvider,
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
    const ids = normalizeWallpaperRotateSourceIdsForSave(s.wallpaperRotateSourceIds);
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
