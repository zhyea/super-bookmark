# SuperBookmark

**本分支（`vue`）主要面向 Firefox**：书签管理（从新标签页或工具栏打开），`manifest.json` 中 `background` 仅声明 **`scripts`**（Firefox 会忽略 `service_worker`，单独写 `service_worker` 会触发无效字段告警）。清单含 **`data_collection_permissions`**（`required: ["none"]`），**`strict_min_version` 为 142.0**，以符合 [AMO 对数据收集声明的要求](https://mzl.la/firefox-builtin-data-consent)。  
若需构建给 **Chrome** 使用，请执行 `npm run build:chrome`（会将 `background` 改为仅 **`service_worker`**，符合 Chrome MV3），再按下方 Chrome 步骤加载。

## 「增强型安全浏览不信任此扩展程序」说明（Chrome）

这是 **Chrome 对「未在应用商店分发」扩展的常见提示**，与扩展是否恶意无必然关系。


| 场景                    | 说明                                             |
| --------------------- | ---------------------------------------------- |
| **解压加载 / 本机 .crx 安装** | 扩展不在 Chrome 应用商店索引里，增强型安全浏览无法为其建立「信誉」，可能提示不信任。 |
| **已上架应用商店**           | 通过审核并安装后，一般不再出现该提示（或显著减少）。                     |


### 你自己开发、自己用时可以怎么做

1. **确认来源**：只加载你本仓库里构建的扩展，不要安装来历不明的 .crx。
2. **保留提示但继续使用**：若你信任本仓库代码，可在提示中选择仍保留扩展（具体入口随 Chrome 版本略有不同）。
3. **暂时放宽安全浏览（仅限个人调试）**：在 `chrome://settings/security` 中可关闭「增强型安全浏览」进行本地调试；**不建议**在日常浏览中长期关闭。
4. **正式分发**：将扩展提交 [Chrome 网上应用店](https://chrome.google.com/webstore/devconsole)，通过审核后用户从商店安装，通常最省心。

### 与本扩展权限

当前 `manifest.json` 仅声明：`storage`、`bookmarks`、`tabs`，用于存储设置、读写书签、打开新标签页；**无** `<all_urls>` 等宽泛网站权限。权限无法在代码里「消除」上述提示；提示主要来自**分发方式**，而非权限行数。

## 本地加载

1. 执行 `npm run build`，静态资源与清单来自 `public/`（含 `manifest.json`、`icons/`、`assets/`）。
2. **Firefox**：地址栏打开 `about:debugging#/runtime/this-firefox`，「临时载入附加组件…」，选择 **`dist/manifest.json`**（需 Firefox **142+**）。构建后可执行 `npm run lint:firefox`，用与 AMO 相同的 [addons-linter](https://github.com/mozilla/addons-linter) 检查 `dist`；其中对打包后的 Vue 运行时关闭 ESLint 规则 `no-unsanitized/property`，避免对框架内部 `innerHTML` 用法的误报。
3. **Chrome**：先执行 `npm run build:chrome`，再打开 `chrome://extensions`，开启「开发者模式」，「加载已解压的扩展程序」选择 `**dist`** 目录（勿选仓库根目录）。
4. 从 `icon.png` 生成各尺寸 PNG：见 `tools/build_extension_png_icons.py`（输出到 `public/icons/`）。

## 许可证

见仓库维护者说明。