/**
 * 设置面板常量（原 settingsPanelTemplate 中与 DOM 字符串无关部分）
 */
export const CONTENT_WIDTH_VALUES = ['full', '1200', '960', '800'];

/**
 * 与内容区实际可用宽度一致：固定宽度下侧边栏与内边距会吃掉宽度，
 * 不能仅用「设置宽度 / 240」推断列数（否则 1200 仍可选 5、960 仍可选 4，但实际排不下）。
 */
export function maxColumnsForContentWidth(w) {
    if (w === 'full') return 5;
    if (w === '1200') return 4;
    if (w === '960') return 3;
    if (w === '800') return 3;
    const px = parseInt(w, 10);
    if (!isFinite(px) || px <= 0) return 5;
    if (px <= 960) return 3;
    if (px <= 1200) return 4;
    return 5;
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
