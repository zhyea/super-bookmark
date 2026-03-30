/**
 * vue-i18n：文案自 strings-export（由 assets/i18n 提取）
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
