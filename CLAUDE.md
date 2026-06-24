# Zen 消消乐 — 项目档案

## 项目概况

深海幽蓝主题的课间解压 Match-3 消除游戏。纯 HTML/CSS/JS，零框架零依赖，Canvas 2D 渲染。支持 Zen（无限消除永不失败）和 Challenge（步数/时间限制）双模式。

**在线地址：** https://wanganming123456-dev.github.io/zen-match3/
**GitHub：** https://github.com/wanganming123456-dev/zen-match3
**本地启动：** `python -m http.server 8765` → http://localhost:8765

## 技术架构

```
js/
├── config.js                  # 全局配置：配色/特效参数/开关
├── main.js                    # 入口：模块初始化 + 事件桥接 + 游戏循环
├── starfield.js               # 星空背景粒子系统
├── core/                      # 逻辑层（纯数据，不涉及渲染）
│   ├── Gem.js                 # 宝石数据模型
│   ├── Board.js               # 棋盘 8×8 网格
│   ├── Matcher.js             # 三连匹配检测
│   ├── Gravity.js             # 重力掉落 + 新宝石生成
│   ├── PowerUp.js             # 道具生成/触发
│   ├── ScoreManager.js        # 分数/连消/满足度（Zen+Challenge 双模式）
│   ├── GameEngine.js          # 核心调度器（状态机 + 事件发射）
│   └── AchievementManager.js  # 连消成就里程碑
├── render/                    # 渲染层（Canvas 2D）
│   ├── Renderer.js            # 主渲染：背景/棋盘/宝石/粒子/光波/大字/辉光
│   └── AnimateManager.js      # 补间动画/微震/飘字
├── input/
│   └── InputManager.js        # 鼠标+触摸事件 → 棋盘坐标映射
├── system/
│   └── UISystem.js            # DOM HUD 更新（Zen/Challenge 双模式）
├── audio/
│   └── AudioManager.js        # Web Audio API 合成音效
└── storage/
    └── StorageManager.js      # localStorage 成绩持久化
```

## 关键设计决策

1. **HiDPI 渲染**：canvas.width = 552×DPR，`setTransform(dpr,...)` 绘制，InputManager 用 `CONFIG.CANVAS.WIDTH/rect.width` 比例转换坐标
2. **事件驱动**：GameEngine 通过 `_emit()` 发射事件，main.js 桥接到 Renderer/AnimateManager/UISystem/AudioManager
3. **事件监听器保留**：`init()` 和 `destroy()` 不再清空 `_listeners`，避免重复注册
4. **NaN 防护**：AnimateManager.tween/update 和 Renderer._drawGemShape 三层 `isFinite()` 守卫
5. **按钮事件**：统一由 main.js 管理，UISystem 不绑定按钮（避免重复绑定导致记录不保存）

## 版本历史

| Tag | 内容 |
|-----|------|
| v1.0 | 深海幽蓝主题 + Zen 模式 + 6合1特效 + Bug 修复（坐标映射/NaN崩溃/事件监听器丢失） |
| v1.1 | PWA 化（manifest.json + sw.js + 图标 + GitHub Pages） |
| v1.2 | 星空粒子背景 + 渐变光晕 + SW 缓存策略修复 |
| v1.3 | 音效系统（Web Audio API）+ 成就里程碑 + localStorage 成绩持久化 |

## 已知问题与注意事项

- 成就里程碑的首次弹窗/横幅标记有 bug：已解锁的成就 ID 存入了 localStorage 但当次检测用 `hasAchievement` 判断时已经存过，导致首次也不弹窗。`check()` 返回 `newlyUnlocked` 但调用方用了 `StorageManager.hasAchievement` 再次判断。
- `file://` 协议下 Service Worker 无法注册，需通过 HTTP 服务器使用
- 本地打包版本见 `消消乐安装/` 文件夹，双击 `启动游戏.bat` 启动

## 消消乐安装文件夹

```
消消乐安装/
├── QR-code.png                     # 扫一扫即玩
├── 游戏安装指南.docx               # 三种方式说明
└── 游戏源文件-双击即玩/
    ├── 启动游戏.bat                # 双击启动
    └── index.html + css/ js/ icons/
```

## 开发常用命令

```powershell
# 启动本地服务
python -m http.server 8765
# 启动发布版测试
python -m http.server 8888 --directory "消消乐安装\游戏源文件-双击即玩"
# 提交推送
git add -A; git commit -m "描述"; git push; git push --tags
```

## CC API 代理（重要）

Claude Code 通过本地 DeepSeek 代理连接 API，地址为 `http://127.0.0.1:3456`。

**禁止** 使用 `taskkill /F /IM node.exe` 等命令重启服务，会误杀 CC 代理。

若 CC 无法连接 API，运行：
```
C:\Users\Administrator\.claude\deepseek-proxy\restart-proxy.bat
```

## 端口分配

| 服务 | 端口 |
|---|---|
| CC DeepSeek 代理 | 3456 |
| 视频解析器 | 3457 |
| 消消乐本地服务 | 8765 |
