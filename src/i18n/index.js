/**
 * vue-i18n：文案来自 strings-export.js。
 * 扩展标准 _locales 由 scripts/sync-chrome-locales.mjs 生成（供 manifest __MSG_*__ 与 chrome.i18n）。
 */
import { createI18n } from 'vue-i18n';
import { STRINGS } from './strings-export.js';
import { normalizeLocale, detectLocale, HTML_LANG, CODES, BG_PRESET_KEYS } from './locale-utils.js';

export { STRINGS, normalizeLocale, detectLocale, HTML_LANG, CODES, BG_PRESET_KEYS };

/**
 * @param {string} [initialLocale]
 */
export function createAppI18n(initialLocale) {
    const locale = normalizeLocale(initialLocale || detectLocale());
    return createI18n({
        legacy: false,
        globalInjection: true,
        locale,
        fallbackLocale: 'zh',
        messages: STRINGS
    });
}
