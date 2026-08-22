# GitHub Pages 托管隐私政策与常见问题

Edge / Chrome 商店都要填 **Privacy Policy URL**，必须是公网可打开的 HTTPS 页面。用 GitHub Pages 托管 `docs/` 即可。

## 要不要先建 GitHub 仓库？

**要。** 顺序是：

1. 建一个 **公开** GitHub 仓库（免费账号才能开 Pages）
2. 把本项目推上去
3. 在仓库 Settings → Pages 里选 `main` + `/docs`
4. 把生成的网址填进商店

不想公开全部源码时，可以另建一个只放 `docs/` 的小仓库。

## 创建仓库并推送

在 `weibo-downloader` 目录下执行（先安装 [GitHub CLI](https://cli.github.com/) 或用网页手动建仓）：

```bash
cd weibo-downloader

git init
git add .
git commit -m "Initial commit: 微博内容下载与备份助手 v1.0.0"

# 方式 A：用 gh 创建公开仓库
gh repo create weibo-downloader --public --source=. --push

# 方式 B：已在网页建好空仓库后
# git remote add origin https://github.com/你的用户名/weibo-downloader.git
# git branch -M main
# git push -u origin main
```

仓库必须是 **Public（公开）**。

## 开启 GitHub Pages

1. 打开 `https://github.com/你的用户名/weibo-downloader`
2. **Settings** → **Pages**
3. Source：**Deploy from a branch**
4. Branch：**main** → 文件夹选 **/docs** → **Save**
5. 等 1～3 分钟，顶部会出现：

```
https://你的用户名.github.io/weibo-downloader/
```

## 填到商店

**Privacy Policy URL：**

```
https://你的用户名.github.io/weibo-downloader/
```

**常见问题（可选，给商店说明或扩展内链）：**

```
https://你的用户名.github.io/weibo-downloader/faq.html
```

若你已有 `snowflake-hangdudu.github.io` 这类站点，也可以把 `docs/` 拷进该仓库的 `/weibo-downloader/` 子目录，URL 会变成对应子路径。

## 更新页面

同时改 `docs/index.html`、`docs/faq.html` 和 `store/` 下同名文件，然后 `git push`。Pages 会自动重新部署。
