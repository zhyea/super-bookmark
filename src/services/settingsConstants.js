/**
 * 设置面板常量（原 settingsPanelTemplate 中与 DOM 字符串无关部分）
 */
export const CONTENT_WIDTH_VALUES = ['full', '1200', '960', '800'];

/** 与 links-grid minmax(240px) 一致：过窄时禁用更高列数 */
export function maxColumnsForContentWidth(w) {
    if (w === 'full') return 5;
    const px = parseInt(w, 10);
    if (!isFinite(px) || px <= 0) return 5;
    const m = Math.floor(px / 240);
    return Math.min(5, Math.max(3, m));
}

export const BACKGROUND_COLORS = [
    { value: '#e8f4fc' },
    { value: '#e8f5e9' },
    { value: '#f7f5f2' },
    { value: '#f5f5f5' },
    { value: '#ffffff' },
    { value: '#2d2d2d' }
];

export const LANG_KEYS = {
    zh: 'langZh',
    'zh-TW': 'langZhTW',
    en: 'langEn',
    es: 'langEs',
    de: 'langDe',
    fr: 'langFr',
    it: 'langIt',
    ru: 'langRu',
    ar: 'langAr',
    ja: 'langJa',
    ko: 'langKo'
};

export const DEFAULT_BGK = ['bgpBlue', 'bgpGreen', 'bgpBeige', 'bgpGray', 'bgpWhite', 'bgpDark'];

/** 兼容旧代码（仅常量 + 空壳 HTML 构建器） */
export const SettingsPanelTemplate = {
    CONTENT_WIDTH_VALUES,
    BACKGROUND_COLORS,
    maxColumnsForContentWidth,
    buildSettingsPanelHtml: function () {
        return '';
    }
};

if (typeof window !== 'undefined') {
    window.SettingsPanelTemplate = SettingsPanelTemplate;
}
