/** 统一的 favicon fallback URL 生成（优先级：网站 favicon → google → duckduckgo → favicon.im） */
export function getFaviconFallbackUrls(hostname) {
    if (!hostname) return [];
    return [
        `https://${hostname}/favicon.ico`,
        `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`,
        `https://icons.duckduckgo.com/ip3/${encodeURIComponent(hostname)}.ico`,
        `https://favicon.im/${encodeURIComponent(hostname)}`
    ];
}

/** 自定义搜索引擎专用：兼容旧调用，内部使用统一 fallback 链 */
export function getCustomEngineFaviconUrls(domain) {
    return getFaviconFallbackUrls(domain);
}
