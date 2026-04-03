/** 语言代码与 normalize（与历史 i18n 行为一致） */
export const CODES = ['zh', 'zh-TW', 'en', 'es', 'de', 'fr', 'it', 'ru', 'ar', 'ja', 'ko'];

export const HTML_LANG = {
    zh: 'zh-CN',
    'zh-TW': 'zh-TW',
    en: 'en',
    es: 'es',
    de: 'de',
    fr: 'fr',
    it: 'it',
    ru: 'ru',
    ar: 'ar',
    ja: 'ja',
    ko: 'ko'
};

export const BG_PRESET_KEYS = ['bgpBlue', 'bgpGreen', 'bgpBeige', 'bgpGray', 'bgpWhite', 'bgpDark'];

export function normalizeLocale(code) {
    if (!code || typeof code !== 'string') return 'zh';
    let lower = String(code).toLowerCase().replace(/_/g, '-');
    if (lower === 'zh-tw' || lower === 'zh-hk' || lower === 'zh-hant') return 'zh-TW';
    let z = lower.split('-');
    if (z[0] === 'zh' && (z[1] === 'tw' || z[1] === 'hk' || z[1] === 'hant')) return 'zh-TW';
    for (let i = 0; i < CODES.length; i++) {
        if (String(CODES[i]).toLowerCase() === lower) return CODES[i];
    }
    let c = lower.split('-')[0];
    return CODES.indexOf(c) >= 0 ? c : 'zh';
}

export function detectLocale() {
    try {
        /* 扩展环境：优先使用浏览器界面语言（与 _locales 一致），参见 chrome.i18n.getUILanguage */
        if (typeof chrome !== 'undefined' && chrome.i18n && typeof chrome.i18n.getUILanguage === 'function') {
            const uil = chrome.i18n.getUILanguage();
            if (uil && typeof uil === 'string') {
                return normalizeLocale(uil);
            }
        }
    } catch (e) {
        /* 非扩展页或未注入 chrome */
    }
    try {
        const nav = (typeof navigator !== 'undefined' && navigator.language) || 'zh';
        return normalizeLocale(nav);
    } catch (e) {
        return 'zh';
    }
}
