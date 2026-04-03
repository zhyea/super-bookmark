/**
 * 从 src/i18n/strings-export.js 生成 Chrome 扩展标准 _locales/<locale>/messages.json
 * 参见：https://developer.chrome.com/docs/extensions/reference/api/i18n
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STRINGS } from '../src/i18n/strings-export.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_ROOT = join(__dirname, '../public/_locales');

/** 应用内 locale → Chrome _locales 目录名 */
const APP_TO_CHROME = {
    zh: 'zh_CN',
    'zh-TW': 'zh_TW',
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

/** 清单 name / description（各语言短文案，供 __MSG_extName__ / __MSG_extDescription__） */
const EXT_NAME = {
    zh: '超级书签 SuperBookmark',
    'zh-TW': '超級書籤 SuperBookmark',
    en: 'SuperBookmark',
    es: 'SuperBookmark',
    de: 'SuperBookmark',
    fr: 'SuperBookmark',
    it: 'SuperBookmark',
    ru: 'SuperBookmark',
    ar: 'SuperBookmark',
    ja: 'SuperBookmark',
    ko: 'SuperBookmark'
};

const EXT_DESCRIPTION = {
    zh: '在新标签页中整理书签与搜索，把你的书签变成私人导航首页。',
    'zh-TW': '在新分頁中整理書籤與搜尋，打造私人導航首頁。',
    en: 'Turn your bookmarks into your private navigation hub on the new tab page.',
    es: 'Convierte tus marcadores en tu centro de navegación privado en la nueva pestaña.',
    de: 'Mach deine Lesezeichen auf der neuen Registerkarte zu deinem privaten Navigations-Hub.',
    fr: 'Transformez vos favoris en hub de navigation privé sur la page Nouvel onglet.',
    it: 'Trasforma i segnalibri nel tuo hub di navigazione privato nella nuova scheda.',
    ru: 'Превратите закладки в личный навигационный центр на странице новой вкладки.',
    ar: 'حوّل الإشارات المرجعية إلى مركز تنقل خاص في صفحة علامة التبويب الجديدة.',
    ja: '新しいタブでブックマークをプライベートなナビゲーションハブに。',
    ko: '새 탭에서 북마크를 나만의 내비게이션 허브로 만듭니다.'
};

/**
 * Chrome messages.json 中 message 字段：字面量 $ 需写成 $$
 * @param {string} s
 */
function escapeChromeMessageDollar(s) {
    return String(s).replace(/\$/g, '$$');
}

function buildChromeMessages(appLocale) {
    const flat = STRINGS[appLocale];
    if (!flat || typeof flat !== 'object') {
        throw new Error(`Missing STRINGS[${appLocale}]`);
    }
    /** @type {Record<string, { message: string, description?: string }>} */
    const out = {};

    out.extName = {
        message: escapeChromeMessageDollar(EXT_NAME[appLocale] || EXT_NAME.en),
        description: 'Extension name shown in browser and Microsoft Edge Add-ons.'
    };
    out.extDescription = {
        message: escapeChromeMessageDollar(EXT_DESCRIPTION[appLocale] || EXT_DESCRIPTION.en),
        description: 'Short description for manifest and store listing.'
    };

    for (const [key, val] of Object.entries(flat)) {
        if (typeof val !== 'string') continue;
        if (key === 'extName' || key === 'extDescription') continue;
        out[key] = {
            message: escapeChromeMessageDollar(val),
            description: `UI string: ${key}`
        };
    }
    return out;
}

function main() {
    for (const [appLoc, chromeDir] of Object.entries(APP_TO_CHROME)) {
        const dir = join(OUT_ROOT, chromeDir);
        mkdirSync(dir, { recursive: true });
        const messages = buildChromeMessages(appLoc);
        const json = JSON.stringify(messages, null, 2);
        writeFileSync(join(dir, 'messages.json'), json, 'utf8');
    }
    console.log('[sync-chrome-locales] wrote', Object.keys(APP_TO_CHROME).length, 'locales to public/_locales');
}

main();
