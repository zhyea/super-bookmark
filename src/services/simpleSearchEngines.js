/**
 * 极简搜索页：可选搜索引擎目录（图标见 public/assets/imgs/search-engine/*.svg）
 */
/** 显示名见 i18n：simpleEngine_{key} */
export const SIMPLE_ENGINE_CATALOG = [
    {
        key: 'google',
        domain: 'www.google.com',
        url: 'https://www.google.com/search?q='
    },
    {
        key: 'baidu',
        domain: 'www.baidu.com',
        url: 'https://www.baidu.com/s?wd='
    },
    {
        key: 'bing',
        domain: 'www.bing.com',
        url: 'https://www.bing.com/search?q='
    },
    {
        key: 'sogou',
        domain: 'www.sogou.com',
        url: 'https://www.sogou.com/web?query='
    },
    {
        key: 'yandex',
        domain: 'yandex.com',
        url: 'https://yandex.com/search/?text='
    }
];

export const DEFAULT_SIMPLE_QUICK_ENGINE_KEYS = ['baidu', 'bing'];

/** 扩展内用 chrome.runtime.getURL；开发时用当前页相对路径 */
function extensionAssetUrl(rel) {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
        try {
            return chrome.runtime.getURL(rel);
        } catch {
            /* fall through */
        }
    }
    if (typeof window !== 'undefined' && window.location?.href) {
        return new URL(rel, window.location.href).href;
    }
    return `/${rel}`;
}

export function engineIconPath(key) {
    return extensionAssetUrl(`assets/imgs/search-engine/${key}.svg`);
}

/** 极简搜索：快捷面板「书签」与书签模式下的引擎图标 */
export function bookmarkQuickPanelIconUrl() {
    return extensionAssetUrl('assets/imgs/simple-bookmark-mode-bookmark.png');
}

export function getEngineByKey(key) {
    return SIMPLE_ENGINE_CATALOG.find((e) => e.key === key) || SIMPLE_ENGINE_CATALOG[0];
}

/** 从搜索 URL 模板推断 favicon 用域名 */
export function inferHostFromUrlTemplate(tpl) {
    const s = String(tpl || '').trim();
    if (!s) return '';
    try {
        const withDummy = s.replace(/%s/g, 'x');
        const href = /^https?:\/\//i.test(withDummy) ? withDummy : `https://${withDummy}`;
        const u = new URL(href);
        return u.hostname.replace(/^www\./i, '') || '';
    } catch {
        return '';
    }
}

function stripWwwHost(h) {
    return String(h || '').replace(/^www\./i, '').toLowerCase();
}

/** 无 %s 时在末尾补占位符（与极简搜索 buildSearchUrl 规则一致：先处理以 = 结尾） */
function normalizeUrlTemplatePlaceholderSuffix(urlTemplate) {
    let u = String(urlTemplate || '').trim();
    if (!u) return '';
    if (u.includes('%s')) return u;
    if (/=$/.test(u)) return u + '%s';
    u += u.includes('?') ? '&q=%s' : '?q=%s';
    return u;
}

/**
 * 自定义搜索引擎：输入域名或半成品 URL 后补全为含 %s 的模板（已知引擎用内置模板）
 */
export function expandSimpleCustomUrlTemplate(raw) {
    const s = String(raw || '').trim();
    if (!s) return '';

    if (s.includes('%s')) {
        if (!/^https?:\/\//i.test(s)) {
            return 'https://' + s.replace(/^\/+/, '');
        }
        return s;
    }

    let hostForMatch = '';
    try {
        const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`;
        const u = new URL(withProto);
        hostForMatch = stripWwwHost(u.hostname);
    } catch {
        hostForMatch = stripWwwHost(s.split('/')[0].split('?')[0]);
    }

    for (const e of SIMPLE_ENGINE_CATALOG) {
        const catalogHost = stripWwwHost(e.domain);
        if (hostForMatch === catalogHost || hostForMatch.endsWith('.' + catalogHost)) {
            return e.url.endsWith('=') ? `${e.url}%s` : normalizeUrlTemplatePlaceholderSuffix(e.url);
        }
    }

    if (/^https?:\/\//i.test(s)) {
        return normalizeUrlTemplatePlaceholderSuffix(s);
    }

    if (/^[\w.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(s)) {
        return normalizeUrlTemplatePlaceholderSuffix(`https://${s}`);
    }

    return s;
}

export function normalizeCustomEngines(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((item) => {
            if (!item || typeof item !== 'object') return null;
            const id = String(item.id || '').trim();
            const name = String(item.name || '').trim();
            const urlTemplate = String(item.urlTemplate || '').trim();
            if (!id || !name || !urlTemplate) return null;
            return {
                id,
                key: `custom:${id}`,
                name,
                urlTemplate
            };
        })
        .filter(Boolean);
}

export function normalizeQuickEngineKeys(raw, extraKeys = []) {
    const valid = new Set([...SIMPLE_ENGINE_CATALOG.map((e) => e.key), ...extraKeys]);
    let list = Array.isArray(raw) ? raw.filter((k) => valid.has(k)) : [];
    if (!list.length) list = [...DEFAULT_SIMPLE_QUICK_ENGINE_KEYS];
    return list;
}
