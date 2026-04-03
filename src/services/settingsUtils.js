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
