/**
 * 设置面板常量（原 settingsPanelTemplate 中与 DOM 字符串无关部分）
 */
/** 旧版内容宽度 class 名，仅用于清除 DOM 上的遗留 class */
export const CONTENT_WIDTH_VALUES = ['full', '1200', '960', '800'];

export const CONTENT_WIDTH_PERCENT_MIN = 50;
export const CONTENT_WIDTH_PERCENT_MAX = 100;
/** 新用户 / 无存储时的默认内容宽度（视口百分比） */
export const CONTENT_WIDTH_PERCENT_DEFAULT = 70;
/** 视图「内容透明度」默认（0–100，与设置滑块一致；越大内容区越透） */
export const CONTENT_CHROME_TRANSPARENCY_DEFAULT = 54;
export const CONTENT_WIDTH_MIN_PX = 400;

export function clampContentWidthPercent(p) {
    const n = Math.round(Number(p));
    if (!Number.isFinite(n)) return CONTENT_WIDTH_PERCENT_DEFAULT;
    return Math.min(CONTENT_WIDTH_PERCENT_MAX, Math.max(CONTENT_WIDTH_PERCENT_MIN, n));
}

/**
 * 从 storage 读取：优先 contentWidthPercent；否则从旧版 contentWidth 迁移。
 */
export function normalizeContentWidthPercentFromStorage(s) {
    const raw = s && s.contentWidthPercent;
    const num = Number(raw);
    if (Number.isFinite(num)) {
        return clampContentWidthPercent(num);
    }
    const w = s && s.contentWidth;
    if (w === 'full') return 100;
    if (w === '1200') return 100;
    if (w === '960') return 80;
    if (w === '800') return 67;
    return CONTENT_WIDTH_PERCENT_DEFAULT;
}

/** 视口比例 + 最小 400px 下的内容区 max-width（px） */
export function effectiveContentMaxWidthPx(percent, viewportWidth) {
    const vw = Math.max(1, Number(viewportWidth) || 1200);
    const p = clampContentWidthPercent(percent);
    const cap = (vw * p) / 100;
    return Math.max(CONTENT_WIDTH_MIN_PX, Math.min(vw, cap));
}

/**
 * 与内容区实际可用宽度一致：按有效 max-width（含 400px 下限）推断可选列数上限。
 */
export function maxColumnsForContentWidthPercent(percent, viewportWidth) {
    const w = effectiveContentMaxWidthPx(percent, viewportWidth);
    if (w <= 960) return 3;
    if (w <= 1200) return 4;
    return 5;
}

/**
 * @deprecated 旧版离散宽度，仅兼容外部仍传入字符串的场景
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
    CONTENT_WIDTH_PERCENT_MIN,
    CONTENT_WIDTH_PERCENT_MAX,
    CONTENT_WIDTH_PERCENT_DEFAULT,
    BACKGROUND_COLORS,
    maxColumnsForContentWidth,
    maxColumnsForContentWidthPercent,
    clampContentWidthPercent,
    buildSettingsPanelHtml: function () {
        return '';
    }
};

if (typeof window !== 'undefined') {
    window.SettingsPanelTemplate = SettingsPanelTemplate;
}
