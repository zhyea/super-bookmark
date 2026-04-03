# SuperBookmark

Microsoft Edge 扩展：书签与收藏夹管理（从新标签页或工具栏打开）。

## 「SmartScreen / 未验证发布者」等提示说明

在 **未通过 Microsoft Edge 加载项** 分发、而以「加载解压缩的扩展」等方式侧载时，Edge 可能显示与信誉或发布者验证相关的提示，**与扩展是否恶意无必然关系**。

| 场景 | 说明 |
|------|------|
| **本机开发 / 侧载** | 扩展未出现在 Edge 加载项目录中，安全与信誉系统可能无法建立与商店分发相同的信任链。 |
| **通过 Edge 加载项安装** | 经审核上架后，用户从商店安装，此类提示通常更少或更规范。 |

### 你自己开发、自己用时可以怎么做

1. **确认来源**：只加载你本仓库里构建的扩展，不要安装来历不明的 `.crx` 或不明压缩包。  
2. **保留提示但继续使用**：若你信任本仓库代码，可在提示中选择仍保留扩展（具体入口随 Edge 版本略有不同）。  
3. **正式分发**：将扩展提交 [Microsoft Edge 加载项](https://partner.microsoft.com/dashboard/microsoftedge/overview)，通过审核后用户从商店安装，通常最省心。

### 与本扩展权限

当前 `manifest.json` 仅声明：`storage`、`bookmarks`、`tabs`，用于存储设置、读写书签、打开新标签页；**无** `<all_urls>` 等宽泛网站权限。上述提示主要来自**分发与签名方式**，而非权限行数多少。

## 本地加载

1. 执行 `npm run build`，静态资源与清单来自 `public/`（含 `manifest.json`、`icons/`、`assets/`）。  
2. 打开 `edge://extensions`，开启「开发人员模式」。  
3. 「加载解压缩的扩展」，选择本仓库下的 **`dist`** 目录（勿选仓库根目录）。  
4. 从 `icon.png` 生成各尺寸 PNG：见 `tools/build_extension_png_icons.py`（输出到 `public/icons/`）。

## 许可证

见仓库维护者说明。
