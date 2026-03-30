/**
 * 使用说明页：仅初始化 vue-i18n 与 legacy API，由 initGuidePage 写入 body（与旧版行为一致）
 */
import './styles/guide.css';
import { createAppI18n } from './i18n/index.js';
import { installLegacyBookmarkI18n } from './i18n/legacyI18n.js';

const i18n = createAppI18n();
installLegacyBookmarkI18n(i18n);

if (typeof window !== 'undefined' && window.BookmarkManagerI18n) {
    window.BookmarkManagerI18n.initGuidePage();
}
