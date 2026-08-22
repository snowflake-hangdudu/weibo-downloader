# Firefox 上架清单（微博下载助手）

## 入口

- 开发者后台：https://addons.mozilla.org/developers/

## 打包

```bash
python scripts/pack_firefox.py
```

生成：`weibo-downloader-firefox.xpi`

## 当前包内关键设置

- Manifest V3
- Firefox 后台使用 `background.scripts`
- Gecko ID：`weibo-downloader@hangdudu.local`
- 最低版本：`121.0`
- 未声明 `offscreen`（Firefox 无此 API）

## 建议填写

**名称**

微博下载助手

**简介**

Save public Weibo posts you can already view as text, images, and exposed videos. Local-only. No login/paywall bypass. No user data collected.

## 上架前说明

Firefox 没有 Chrome/Edge 的 offscreen。图/视频本地下载可能不如 Edge 稳定，正文 TXT 不受影响。建议先上 Edge，Firefox 作为后续适配。
