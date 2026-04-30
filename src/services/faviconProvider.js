/** 全局 favicon 缓存：hostname -> { status: 'pending'|'resolved'|'failed', url: string|null } */
const faviconCache = new Map();

/** 从 hostname 提取主域名（如 mail.google.com -> google.com） */
function getParentDomain(hostname) {
    const parts = hostname.split('.');
    if (parts.length <= 2) return null;
    return parts.slice(1).join('.');
}

/** 统一的 favicon fallback URL 生成（含子域名回退到主域名） */
export function getFaviconFallbackUrls(hostname) {
    if (!hostname) return [];
    const urls = [
        `https://${hostname}/favicon.ico`,
        `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`,
        `https://icons.duckduckgo.com/ip3/${encodeURIComponent(hostname)}.ico`,
        `https://favicon.im/${encodeURIComponent(hostname)}`
    ];
    const parent = getParentDomain(hostname);
    if (parent && parent !== hostname) {
        urls.push(
            `https://${parent}/favicon.ico`,
            `https://www.google.com/s2/favicons?domain=${encodeURIComponent(parent)}&sz=64`,
            `https://icons.duckduckgo.com/ip3/${encodeURIComponent(parent)}.ico`,
            `https://favicon.im/${encodeURIComponent(parent)}`
        );
    }
    return urls;
}

/** 用 Image 对象探测第一个可用的 favicon URL */
function probeFavicon(hostname) {
    return new Promise((resolve) => {
        const urls = getFaviconFallbackUrls(hostname);
        let index = 0;

        function tryNext() {
            if (index >= urls.length) {
                resolve(null);
                return;
            }
            const url = urls[index++];
            const img = new Image();
            const timer = setTimeout(() => {
                img.onload = img.onerror = null;
                tryNext();
            }, 2000);

            img.onload = () => {
                clearTimeout(timer);
                resolve(url);
            };
            img.onerror = () => {
                clearTimeout(timer);
                tryNext();
            };
            img.src = url;
        }

        tryNext();
    });
}

/** 获取缓存中已探测成功的 favicon URL */
export function getCachedFaviconUrl(hostname) {
    const cached = faviconCache.get(hostname);
    if (cached && cached.status === 'resolved' && cached.url) {
        return cached.url;
    }
    return null;
}

/** 手动写入缓存（如 LinkCard 实际加载成功时） */
export function setCachedFaviconUrl(hostname, url) {
    if (!hostname || !url) return;
    faviconCache.set(hostname, { status: 'resolved', url });
}

/** 标记域名 favicon 全部不可用 */
export function setCachedFaviconFailed(hostname) {
    if (!hostname) return;
    faviconCache.set(hostname, { status: 'failed', url: null });
}

/** 预加载单个 hostname 的 favicon */
export function preloadFavicon(hostname) {
    if (faviconCache.has(hostname)) return;
    faviconCache.set(hostname, { status: 'pending', url: null });
    probeFavicon(hostname).then((url) => {
        if (url) {
            faviconCache.set(hostname, { status: 'resolved', url });
        } else {
            faviconCache.set(hostname, { status: 'failed', url: null });
        }
    });
}

/** 从书签数组中提取去重后的 hostname 列表 */
function extractHostnames(bookmarks) {
    const set = new Set();
    for (let i = 0; i < bookmarks.length; i++) {
        const b = bookmarks[i];
        if (!b || !b.url) continue;
        try {
            const parsed = new URL(b.url);
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
                set.add(parsed.hostname);
            }
        } catch (_) {}
    }
    return Array.from(set);
}

/** 从书签数组中提取所有域名并批量预加载 */
export function preloadFaviconsForBookmarks(bookmarks) {
    const hostnames = extractHostnames(bookmarks);
    for (let i = 0; i < hostnames.length; i++) {
        preloadFavicon(hostnames[i]);
    }
}

/** 自定义搜索引擎专用：兼容旧调用，内部使用统一 fallback 链 */
export function getCustomEngineFaviconUrls(domain) {
    return getFaviconFallbackUrls(domain);
}
