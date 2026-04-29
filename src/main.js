/**
 * 扩展新标签页入口：先加载服务模块（挂 window），再挂载 Vue，最后初始化书签交互。
 */
import './styles/base.css';
import './styles/layout.css';
import './styles/components/cards.css';
import './styles/components/tags.css';
import './styles/components/settings.css';
import './styles/components/menu-float.css';
import './styles/components/footer.css';
import './styles/theme-dark.css';
import './styles/responsive.css';

import './services/constants.js';
import './services/bookmarkNavBuild.js';
import './services/bookmarks.js';
import './services/bookmarkMaintenance.js';
import './services/editModal.js';
import './services/backupRestore.js';
import './services/settings.js';

import { createApp } from 'vue';
import App from './App.vue';
import { i18n } from './i18n/instance.js';

const app = createApp(App);
app.use(i18n);
app.mount('#app');
