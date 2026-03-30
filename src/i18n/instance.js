/**
 * 全局单例 i18n（供 main 与程序化挂载的组件共用）
 */
import { createAppI18n } from './index.js';
import { installLegacyBookmarkI18n } from './legacyI18n.js';

const i18n = createAppI18n();
installLegacyBookmarkI18n(i18n);

export { i18n };
