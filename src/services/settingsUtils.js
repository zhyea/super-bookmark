/**
 * 设置相关纯函数（供 settings.js 与 SettingsPanel.vue 共用，避免循环依赖）
 */
import { BACKGROUND_COLORS } from './settingsConstants.js';

export function normalizeHex(hex) {
    if (!hex || typeof hex !== 'string') return '#e8f4fc';
    const h = hex.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(h)) return h.toLowerCase();
    return '#e8f4fc';
}

export function presetMatchesColor(hex) {
    const n = normalizeHex(hex);
    return BACKGROUND_COLORS.some(function (c) {
        return c.value.toLowerCase() === n;
    });
}

/** 极简书签搜索结果卡片文字色（极简页默认 #dddddd） */
export function normalizeBookmarkCardTextColor(hex) {
    if (!hex || typeof hex !== 'string') return '#dddddd';
    const h = hex.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(h)) return h.toLowerCase();
    return '#dddddd';
}

/** 与「背景透明度」同为 0–100；换算为 backdrop-filter 像素，100% 等价于原先滑块最大值 32px */
export const OVERLAY_BLUR_MAX_FILTER_PX = 32;

/**
 * 从 storage 读取 simpleOverlayBlurPx：历史版本存 0–32（px），现统一为 0–100（百分比）
 * @param {unknown} raw
 * @returns {number}
 */
export function normalizeSimpleOverlayBlurStored(raw) {
    const v = Number(raw);
    if (!Number.isFinite(v) || v < 0) return 0;
    if (v > 32) return Math.min(100, Math.round(v));
    return Math.min(100, Math.round((v / OVERLAY_BLUR_MAX_FILTER_PX) * 100));
}

/**
 * @param {unknown} percent 0–100
 * @returns {number} 用于 CSS blur() 的 px，0–OVERLAY_BLUR_MAX_FILTER_PX
 */
export function overlayBlurPercentToFilterPx(percent) {
    const p = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
    if (p <= 0) return 0;
    return Math.round((p / 100) * OVERLAY_BLUR_MAX_FILTER_PX);
}
