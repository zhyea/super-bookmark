/**
 * 极简搜索页：可选搜索引擎目录（图标见 public/assets/imgs/search-engine/*.svg）
 */
export const SIMPLE_ENGINE_CATALOG = [
    {
        key: 'google',
        label: 'Google',
        domain: 'www.google.com',
        url: 'https://www.google.com/search?q='
    },
    {
        key: 'baidu',
        label: '百度',
        domain: 'www.baidu.com',
        url: 'https://www.baidu.com/s?wd='
    },
    {
        key: 'bing',
        label: '必应',
        domain: 'www.bing.com',
        url: 'https://www.bing.com/search?q='
    },
    {
        key: 'sogou',
        label: '搜狗',
        domain: 'www.sogou.com',
        url: 'https://www.sogou.com/web?query='
    },
    {
        key: 'yandex',
        label: 'Yandex',
        domain: 'yandex.com',
        url: 'https://yandex.com/search/?text='
    }
];

export const DEFAULT_SIMPLE_QUICK_ENGINE_KEYS = ['baidu', 'bing'];

/** 扩展内用 chrome.runtime.getURL；开发时用当前页相对路径 */
export function engineIconPath(key) {
    const rel = `assets/imgs/search-engine/${key}.svg`;
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
