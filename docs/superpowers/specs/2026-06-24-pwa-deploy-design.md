# Zen 消消乐 — PWA 化 + GitHub Pages 部署

> 日期：2026-06-24 | 状态：已确认

## 目标

将现有消消乐网页游戏变为可安装的 PWA 应用，支持桌面/手机离线使用，并通过 GitHub Pages 发布为在线网址。

## 新增文件

| 文件 | 作用 |
|------|------|
| `manifest.json` | PWA 清单：app 名称、图标、主题色、全屏启动 |
| `sw.js` | Service Worker：缓存所有静态资源实现离线可用 |
| `icons/icon-192.png` | 192×192 的 app 图标 |

## 修改文件

| 文件 | 改动 |
|------|------|
| `index.html` | `<head>` 添加 `<link rel="manifest">` 和 `<meta name="theme-color">`；`<body>` 末尾注册 sw.js |

## 不涉及

- 游戏逻辑代码不改
- CSS 不改
- 不上架商店

## 部署

- 推送至 GitHub → 开启 GitHub Pages → 获得 `https://wanganming123456-dev.github.io/zen-match3/`
- 生成游戏图标用于 PWA
