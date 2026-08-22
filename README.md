# 微博下载助手

保存当前页面中用户可访问微博的正文、图片和视频。

## 项目状态

开发中，尚未上架。请用 Edge / Chrome「加载已解压缩的扩展」打开本目录。改代码后必须重新加载扩展。

样式对齐 YouTube 下载器：右下角用扩展图标作悬浮按钮，面板和工具栏弹窗为黑白灰；面板内有「公告」「开发合作」两个内页。调试日志在面板底部可折叠区域，控制台前缀 `[WEIBODL]` / `[WEIBODL-BG]`。

## 当前行为

- 按**当前地址栏微博 ID** 拉取该条微博，而不是沿用第一次打开页面时的脚本或旧卡片。
- 桌面 `weibo.com`、移动 `m.weibo.cn`、搜索 `s.weibo.com`。
- 正文、图床原图、接口或当前页已暴露的 MP4 / MOV / WebM。
- 页面内读取媒体，失败再走带 Referer 的浏览器下载。
- 不上传微博内容、Cookie 或下载链接。

## 结构

```text
background.js                  配置拉取、CDN Referer、浏览器下载
content/page-agent.js          页面主世界读取媒体
content/platform-adapter.js    当前微博识别
content/media-saver.js         下载准备与本机保存
content/debug.js               面板与控制台调试
content/content.js             面板、路由刷新、下载调度
rules/cdn-headers.json         官方 CDN Referer
```
