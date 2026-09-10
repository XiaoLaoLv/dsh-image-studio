# dsh-image-studio

DeepSeek Harness 图片工作台插件：文生图、图生图（最多 4 张参考图）、Canvas 编辑（缩放/两段式裁剪/旋转/滤镜/撤销）、图片压缩、一键发送到当前对话输入框。**零依赖、零构建**，标准 dsh bundle，一条命令安装。

A full image workbench plugin for DeepSeek Harness: text-to-image, image-to-image (up to 4 reference images), canvas editing (zoom, two-phase crop with handles + mask, rotate, flip, filters, undo), image compression with a live size estimate, and one-click send-to-composer. **Zero dependencies, zero build** — a standard dsh bundle.

## 功能 / Features

- **文生图** — 提示词 + 尺寸，走你自己的图像 API
- **图生图** — 最多 4 张参考图（多选上传、逐张移除）；火山方舟走 `image` 数组，OpenAI 兼容走 multipart `image[]`
- **编辑器** — 缩放（20%–800% + 适应窗口）、两段式裁剪（进入裁剪模式后画框，8 把手调整 + 蒙版，确认生效）、旋转/翻转、6 种滤镜、撤销/重做
- **图片压缩** — 格式（JPEG/WebP/PNG）+ 质量 + 最长边，实时显示压缩后大小；下载与发送均按压缩设置输出
- **发送到对话** — 当前图（含编辑结果）作为草稿附件附到当前会话输入框
- **配置持久化** — 接口风格/地址/密钥/模型/尺寸自动保存到 `~/.dsh/imgstudio/config.json`，重启后自动恢复
- **演示模式** — 未配置 API Key 时本地生成示意图，完整走通流程

支持两种接口风格：**OpenAI 兼容**（`/images/generations`、`/images/edits`）与**火山方舟 Seedream**（`/api/v3/images/generations`）。

## 安装 / Install

CLI 版（`dsh web`）：

```bat
:: 从 npm 安装（发布后可用）
dsh plugin --profile web add dsh-image-studio

:: 或直接从 GitHub 安装
dsh plugin --profile web add github:XiaoLaoLv/dsh-image-studio
```

本地开发（clone 仓库后以活链接安装，改代码无需重装）：

```bat
git clone https://github.com/XiaoLaoLv/dsh-image-studio.git
dsh plugin --profile web add .\dsh-image-studio
```

桌面版（dsh-desktop）：关闭应用 → 桌面「Desktop Plugins…」→ 添加 `dsh-image-studio`。桌面端安全模式不加载第三方插件。

然后**重启** `dsh web` 并硬刷新浏览器（Ctrl+F5）。侧栏底部出现「图像工坊」入口；接口配置在 **设置 → 图像工坊**。

卸载：`dsh plugin --profile web remove dsh-image-studio`（配置文件保留在 `~/.dsh/imgstudio/`，可手动删除）。

## 安全须知 / Security

- API Key 以**明文**保存在 `~/.dsh/imgstudio/config.json`（与部署 `.env` 同一信任级别），请勿分享该文件
- 插件的路由 `/api/image-studio/*` 走 DSH connection 的认证通道，与 `/api` 同级
- 上游请求只发往你在设置里填写的 baseUrl

## 兼容性 / Compatibility

构建针对 DeepSeek Harness `0.1.x` 线（本仓库开发时的本地构建为 `0.1.1-alpha.x`）。插件只使用稳定面：`connection.fetch` 路由、`sidebar.footer.action` / `shell.overlay` / `settings.section` / `conversation.composer.dock` 插槽、`locale` / `timer` 服务。Harness 升级若调整了这些面，需要同步适配。

## 工作原理 / How it works

```
lib/index.js    Node 半区：POST /api/image-studio/generate（服务端 fetch 上游，
                支持 JSON 与 multipart 两种方言）+ GET/POST config（本地 JSON 读写）
lib/client.js   浏览器半区（module-table bundle，手写无构建）：
                sidebar 入口 + 全屏浮层工作台 + 设置分页 + 输入框桥接
```

浏览器半区通过 `ctx.slots` 注册到官方插槽；client→host 调用走本插件自己的 `/api/image-studio/*` 认证路由（`connection.fetch.register`，与会话日志导出插件同一机制）。编辑、压缩、缩放全部在浏览器 Canvas 本地完成，不经过任何服务端。

## License

MIT
