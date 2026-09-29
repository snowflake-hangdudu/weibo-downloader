# Microsoft Edge 上架填写参考（微博下载助手 v1.0.0）

隐私 / FAQ（须已部署 GitHub Pages）：

```
https://snowflake-hangdudu.github.io/weibo-downloader/
https://snowflake-hangdudu.github.io/weibo-downloader/faq.html
```

## 提交包

路径：`weibo-downloader-chrome.zip`（运行 `python scripts/pack.py` 生成）

---

## 第一步：注册开发者

1. 打开 https://partner.microsoft.com/dashboard
2. 用 Microsoft 账号登录
3. 注册 **Microsoft Edge 扩展** 开发者（个人账号，免费）
4. 首页 Workspaces → **Edge** → **Create new extension**（与已上架的 YouTube 扩展分开新建）

---

## 第二步：上传 zip

拖拽 `weibo-downloader-chrome.zip` 到上传区，等待验证通过。

---

## 第三步：Availability

| 项 | 建议 |
|----|------|
| Visibility | Public（公开） |
| Markets | **Worldwide** |

---

## 第四步：Privacy

### Single Purpose

```
微博下载助手帮助用户在微博网页（weibo.com / m.weibo.cn / s.weibo.com）保存当前已经能看到的公开微博正文、图片和已暴露视频，供个人备份与学习。仅在用户主动勾选并点击下载时工作；不绕过登录、付费、私密或其他访问限制，不收集用户数据。
```

### Permission justification

**activeTab**
```
仅在用户当前打开的微博标签页中运行，用于识别当前微博并打开下载面板。
```

**downloads**
```
把用户主动选择的正文、图片、视频保存到本机浏览器默认下载目录。
```

**offscreen**
```
在扩展内部为已读取的文件生成本地下载地址。不访问用户页面内容以外的数据。
```

**storage**
```
仅在本地缓存公告 / 合作说明等极少内容；不上传、不用于追踪。
```

**declarativeNetRequest / declarativeNetRequestWithHostAccess**
```
仅为微博官方图床 / 视频 CDN 补上 Referer: https://weibo.com/，以便保存用户当前页已经能看到的媒体。不改写 Cookie，不伪造身份。
```

**https://weibo.com/*** / **https://www.weibo.com/*** / **https://m.weibo.cn/*** / **https://s.weibo.com/***
```
识别当前微博并读取用户已经能在页面上看到的正文与媒体信息。
```

**https://*.sinaimg.cn/*** / **https://*.weibocdn.com/***
```
保存用户主动选择、且当前页已能访问的图片或视频到本机。
```

**配置站点**
```
仅读取公开的公告与合作说明 JSON，不上传微博内容。
```

### Remote code

选择：**No, I am not using remote code**

### Data usage

- 全部 **不勾选**
- 认证勾选：数据不出售、不用于无关目的等

### Privacy Policy URL

```
https://snowflake-hangdudu.github.io/weibo-downloader/
```

---

## 第五步：Store listing

### Extension name

微博下载助手

### Description

```
微博下载助手帮助您在微博网页保存当前已经能看到的公开内容，供个人备份与学习。

功能说明：
• 支持桌面 weibo.com、移动 m.weibo.cn、搜索 s.weibo.com
• 首页 / 搜索页滑到哪条就识别哪条
• 可保存正文、图片和页面已暴露的视频
• 右下角悬浮面板；完全免费，不收集用户数据

使用说明：
1. 打开微博网页并确认能看到目标微博
2. 安装后先按 F5
3. 点击页面右下角悬浮按钮（不要只点工具栏图标）
4. 勾选项目后点「下载所选」

重要说明：
• 仅保存你已经能在页面上看到的内容
• 不绕过登录、付费、私密或其他访问限制
• 纯切片流（m3u8）不会合成单文件
• 下载与使用后果由用户自行承担

反馈邮箱：hangdudu0@agent.qq.com
```

### Search terms

一项一项点 **Add Term** 加进去（最多 7 个，每个不超过 30 字）：

```
微博
微博下载
微博备份
图片下载
视频下载
微博下载助手
weibo download
```

---

## 第六步：商店图片

| 素材 | 尺寸 | 文件 |
|------|------|------|
| Extension logo | 300×300 | `store/logo-300.png` |
| Screenshots（更清晰，优先传） | 640×400 | `store/screenshot-640x400.png` |
| Screenshots | 1280×800 | `store/screenshot-1280x800.png` |

聊天压缩图只有约 1024 宽，拉到 1280×800 会糊。商店也接受 640×400，这张是缩小导出，更清楚。

若要真正清晰的 1280×800：把本机原图（建议 1920×1080 以上）存成 `store/screenshot-source.png`，再运行 `python store/_crop_store_shots.py`。

---

## 第七步：Certification notes（建议粘贴英文）

若表单问 testers 是否需要账号：选 **Yes** 也可以，下面说明里写清「不用账号密码，只用公开搜索页」。

```
IMPORTANT — testers: the primary UI is an orange floating button at the BOTTOM-RIGHT of a Weibo page. The toolbar popup is only a launcher. Do not test on edge://extensions or a blank tab.

No shared account or password is required. Use these public Weibo search pages:

1) 东京爱情故事
https://s.weibo.com/weibo?q=%E4%B8%9C%E4%BA%AC%E7%88%B1%E6%83%85%E6%95%85%E4%BA%8B

2) 星游记
https://s.weibo.com/weibo?q=%E6%98%9F%E6%B8%B8%E8%AE%B0

How to test:
1. Install this package.
2. Open one of the two URLs above.
3. Press F5 AFTER install so content scripts attach.
4. Click the orange rounded button at BOTTOM-RIGHT (not only the toolbar icon). Clicking it again collapses the panel.
5. Scroll so the target post sits in the upper-middle of the screen. The panel should show text / images / exposed videos.
6. Check items and click the black download button. Files save to the browser Downloads folder.

If Weibo shows a login wall, any personal Weibo account is enough. We do not issue a tester password. This extension does NOT bypass login, paywalls, private posts, or other access limits. It only saves content the current page can already show, after an explicit user click.

Manifest V3; no remote code; no analytics; no user data uploaded.
Privacy: https://snowflake-hangdudu.github.io/weibo-downloader/
FAQ: https://snowflake-hangdudu.github.io/weibo-downloader/faq.html
Contact: hangdudu0@agent.qq.com
```

---

## 第八步：Submit for review

检查必填项 → Submit。上架通过后，把商店链接填进配置站 `rating.edge`，再把 `enabled` 设为 `true`。
