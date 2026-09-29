# Firefox 上架填写参考（微博下载助手 v1.0.0）

开发者后台：https://addons.mozilla.org/developers/

打包：`python scripts/pack_firefox.py`  
生成：`weibo-downloader-firefox.xpi`  
Gecko ID：`weibo-downloader@hangdudu.local`  
最低版本：`121.0`（无 `offscreen`，图/视频可能不如 Edge 稳）

隐私 / FAQ：

```
https://snowflake-hangdudu.github.io/weibo-downloader/
https://snowflake-hangdudu.github.io/weibo-downloader/faq.html
```

---

## Describe add-on

### 名称

微博下载助手

### 附加组件网址（slug）

建议改成英文：`weibo-downloader`  
完整地址类似：`https://addons.mozilla.org/firefox/addon/weibo-downloader/`

### 概述（Summary）

```
在微博网页保存当前已经能看到的公开正文、图片和已暴露视频，供个人备份。不绕过登录或访问限制，不收集用户数据。
```

### 描述（Description，建议 250 字以上）

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
• Firefox 版没有 offscreen，部分图片 / 视频保存可能不如 Edge 稳定
• 下载与使用后果由用户自行承担

测试页：
https://s.weibo.com/weibo?q=%E4%B8%9C%E4%BA%AC%E7%88%B1%E6%83%85%E6%95%85%E4%BA%8B
https://s.weibo.com/weibo?q=%E6%98%9F%E6%B8%B8%E8%AE%B0

反馈邮箱：hangdudu0@agent.qq.com
```

### 分类

- 主分类：**下载管理**
- 次分类：**社交和通信**（或「照片、音乐和视频」）

### 复选框

- 「这个附加组件为实验性」：**不勾**
- 「此附加组件需要付费」：**不勾**

### 支持 / 隐私（后面几栏）

| 项 | 填写 |
|----|------|
| Support email | `hangdudu0@agent.qq.com` |
| Support website | `https://snowflake-hangdudu.github.io/weibo-downloader/faq.html` |
| Homepage | `https://snowflake-hangdudu.github.io/weibo-downloader/` |
| Privacy policy | `https://snowflake-hangdudu.github.io/weibo-downloader/` |
| License | MPL 2.0（AMO 默认即可） |
| Data collection | 不收集（none） |

### 截图 / 图标

- 图标：`icons/icon128.png` 或 `store/logo-300.png`
- 截图优先：`store/screenshot-640x400.png`

---

## 审核备注（Notes for reviewers，英文）

```
Primary UI is an orange floating button at the BOTTOM-RIGHT of a Weibo page. Toolbar popup is only a launcher. Press F5 after install.

Test pages (no shared password):
https://s.weibo.com/weibo?q=%E4%B8%9C%E4%BA%AC%E7%88%B1%E6%83%85%E6%95%85%E4%BA%8B
https://s.weibo.com/weibo?q=%E6%98%9F%E6%B8%B8%E8%AE%B0

Does not bypass login or access limits. Saves only content the current page already shows. Manifest V3; no remote code; no user data uploaded.
Contact: hangdudu0@agent.qq.com
```
