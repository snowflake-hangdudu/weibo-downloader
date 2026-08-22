# 微博内容下载与备份助手 · 会话交接

更新时间：2026-08-23

## 当前结论

已按当前地址栏微博重新识别，并加上面板/控制台调试。图片和视频走「页面主世界读取 → 扩展读取 → 带 Referer 的直链」三层保存。请重新加载扩展后在真实页面看面板底部日志。

不要打包、不要上架。不要改 B 站、YouTube、小红书。

## 已知问题与对应改动

- 图片/视频下不了：后台直链会被 CDN 拒。现在先在页面上下文读字节，再 `chrome.downloads` 保存 blob；失败才直链，并为 `sinaimg.cn` / `weibocdn.com` 加 Referer。
- 资源停在第一次打开的微博：不再扫整页初始 script。详情页用当前 URL 的微博 ID 调 `weibo.com/ajax/statuses/show` 或 `m.weibo.cn/statuses/show`。并监听 `pushState` / `replaceState` / `popstate`。

## 调试

- 页面控制台：`[WEIBODL]`
- 扩展后台：`[WEIBODL-BG]`
- 面板底部灰色日志框

## 常用命令

```powershell
Set-Location D:\插件\weibo-downloader
```

用浏览器加载本目录即可，不要依赖已删除的离线测试。
