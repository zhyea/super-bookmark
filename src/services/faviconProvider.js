import { reactive } from 'vue';

export const faviconState = reactive({
    googleReachable: null,
    faviconImReachable: null
});

function probeProvider(url) {
    return new Promise((resolve) => {
        const img = new Image();
        const timer = setTimeout(() => {
            img.src = '';
            resolve(false);
        }, 2500);
        img.onload = () => {
            clearTimeout(timer);
            resolve(true);
        };
        img.onerror = () => {
            clearTimeout(timer);
            resolve(false);
        };
        img.src = url;
    });
}

export async function detectFaviconProviders() {
    if (faviconState.googleReachable !== null) return;

    faviconState.googleReachable = await probeProvider(
        'https://www.google.com/s2/favicons?sz=64&domain=google.com'
    );

    if (faviconState.googleReachable === false && faviconState.faviconImReachable === null) {
        faviconState.faviconImReachable = await probeProvider('https://favicon.im/google.com');
    }
}

export function getCustomEngineFaviconUrl(domain) {
    if (!domain) return '';
    if (faviconState.googleReachable !== false) {
        return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(domain)}`;
    }
    if (faviconState.faviconImReachable !== false) {
        return `https://favicon.im/${encodeURIComponent(domain)}`;
    }
    return `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`;
}
