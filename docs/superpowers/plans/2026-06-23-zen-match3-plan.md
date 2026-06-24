# Zen 消消乐 — 课间解压模式实施计划

> **For agentic workers:** 使用 `executing-plans` 技能按任务逐步实施。步骤使用 checkbox (`- [ ]`) 语法追踪。

**目标:** 将现有宝石消消乐改造为以 Zen 解压模式为主的课间放松游戏（深海幽蓝配色、顶部状态条布局、无限消除无失败、6 合 1 特效系统）

**架构:** 保留核心逻辑层（Board/Matcher/Gravity/PowerUp）不变；重构 UI 层（HTML/CSS）为垂直堆叠布局；改造 GameEngine/ScoreManager 支持双模式；强化 Renderer/AnimateManager 实现全特效套件

**技术栈:** 纯 HTML/CSS/原生 JS（Canvas 2D），无框架，无构建工具

---

## 文件结构总览

```
修改文件:
  js/config.js              — 深海配色 + Zen 配置 + 特效开关
  js/core/ScoreManager.js   — Zen 追踪指标（Chain/Best/Vibe）
  js/core/GameEngine.js     — Zen 模式无限步数、自动洗牌、无失败
  js/render/AnimateManager.js — 屏幕微震、分数飘字、强化粒子
  js/render/Renderer.js     — 光波扩散、边框辉光、连击大字、浮字渲染
  js/system/UISystem.js     — Zen 模式 HUD 指标
  js/main.js                — 双模式入口、事件桥接
  index.html                — UI 重构（Tab + 状态条）
  css/style.css             — 深海幽蓝主题、全动画关键帧
```

---

### Task 1: 配置文件 — 深海幽蓝 + Zen 参数

**文件:** 修改 `js/config.js`

- [ ] **Step 1: 替换 GEMS 配色为深海幽蓝，追加 ZEN 和 EFFECTS 配置块**

将整个 `js/config.js` 替换为：

```js
/**
 * 消消乐游戏 - 全局配置（Zen 解压模式版本）
 * 所有可调参数集中管理
 */
const CONFIG = {
    // ========== 网格配置 ==========
    GRID: {
        ROWS: 8,
        COLS: 8,
        CELL_SIZE: 64,
        GEM_TYPES: 5
    },

    // ========== 画布配置 ==========
    CANVAS: {
        WIDTH: 8 * 64 + 40,
        HEIGHT: 8 * 64 + 40,
        PADDING: 20
    },

    // ========== 游戏规则 ==========
    RULES: {
        MIN_MATCH: 3,
        COMBO_MULTIPLIER: 1,
        BASE_SCORE: 10,
        SPECIAL_4: 4,
        SPECIAL_5: 5,
        BOMB_RADIUS: 1
    },

    // ========== 关卡目标 ==========
    LEVEL: {
        MODE: 'zen',            // 默认模式改为 Zen
        MAX_MOVES: 30,
        MAX_TIME: 60,
        TARGET_SCORE: 5000
    },

    // ========== Zen 模式配置 ==========
    ZEN: {
        INFINITE_MOVES: true,   // 无限步数
        NO_FAILURE: true,       // 永不失败
        AUTO_SHUFFLE: true,     // 无可用交换时自动洗牌
        SHUFFLE_DELAY: 500      // 洗牌延迟(ms)
    },

    // ========== 特效开关 ==========
    EFFECTS: {
        PARTICLES_ENHANCED: true,   // 强化粒子
        SCREEN_SHAKE: true,         // 屏幕微震
        COMBO_POPUP: true,          // 连击大字弹出
        LIGHT_BURST: true,          // 光波扩散
        SCORE_FLOAT: true,          // 分数飘字
        BORDER_GLOW: true           // 边框辉光
    },

    // ========== 特效参数 ==========
    EFFECT_PARAMS: {
        SHAKE_INTENSITY: 4,         // 微震最大偏移(px)
        SHAKE_DURATION: 200,        // 微震持续(ms)
        COMBO_POP_DURATION: 800,    // 连击大字总时长(ms)
        COMBO_POP_MIN_LEVEL: 2,     // 触发连击大字的最低连消级数
        LIGHT_BURST_DURATION: 600,  // 光波扩散时长(ms)
        SCORE_FLOAT_DURATION: 800,  // 分数飘字时长(ms)
        SCORE_FLOAT_RISE: 60,       // 飘字上升距离(px)
        BORDER_GLOW_LO: '0 0 20px rgba(59,130,246,0.15)',
        BORDER_GLOW_MID: '0 0 40px rgba(245,158,11,0.3)',
        BORDER_GLOW_HI: '0 0 60px rgba(245,158,11,0.5)'
    },

    // ========== 动画配置 ==========
    ANIM: {
        SWAP_SPEED: 200,
        FALL_SPEED: 80,
        BOUNCE_SPEED: 300,
        EXPLODE_SPEED: 400,
        PARTICLE_SPEED: 500
    },

    // ========== 深海幽蓝宝石视觉定义 ==========
    GEMS: [
        { id: 0, name: '蓝宝石', color: '#3B82F6', shape: 'circle',   glow: 'rgba(59,130,246,0.45)' },
        { id: 1, name: '青宝石', color: '#06B6D4', shape: 'square',   glow: 'rgba(6,182,212,0.45)' },
        { id: 2, name: '绿宝石', color: '#10B981', shape: 'triangle', glow: 'rgba(16,185,129,0.45)' },
        { id: 3, name: '靛宝石', color: '#6366F1', shape: 'circle',   glow: 'rgba(99,102,241,0.45)' },
        { id: 4, name: '金宝石', color: '#F59E0B', shape: 'diamond',  glow: 'rgba(245,158,11,0.45)' }
    ],

    // ========== 道具视觉定义 ==========
    POWER_UPS: {
        LINE:    { id: 'line',    name: '直线消除', color: '#FF6348', icon: '━' },
        BOMB:    { id: 'bomb',    name: '爆炸消除', color: '#2C3E50', icon: '●' },
        RAINBOW: { id: 'rainbow', name: '全屏同色', color: '#FFF',    icon: '★' }
    },

    // ========== 深海幽蓝主题 ==========
    THEME: {
        BACKGROUND: '#0a1628',
        GRID_BG: '#0f1d35',
        GRID_LINE: 'rgba(59,130,246,0.08)',
        PANEL_BG: 'rgba(15,29,53,0.8)',
        ACCENT: '#60A5FA',
        ACCENT_DIM: '#93C5FD',
        GOLD: '#FFD700',
        ZEN_TAB_ACTIVE: '#6366F1',
        CHALLENGE_TAB_ACTIVE: '#FF4757'
    }
};
```

---

### Task 2: ScoreManager — Zen 模式追踪指标

**文件:** 修改 `js/core/ScoreManager.js`

- [ ] **Step 1: 替换 ScoreManager 为支持 Zen 模式的版本**

将整个 `js/core/ScoreManager.js` 替换为：

```js
/**
 * 分数与统计管理器 — 支持 Zen / Challenge 双模式
 * Zen 模式追踪：连消次数、最大消除、满足度
 * Challenge 模式：原有分数/步数/时间逻辑
 */
class ScoreManager {

    constructor(mode = 'zen', maxMoves = 30, maxTime = 60, targetScore = 5000) {
        this.mode = mode;

        // Challenge 模式参数
        this.maxMoves = maxMoves;
        this.maxTime = maxTime;
        this.targetScore = targetScore;

        // 通用
        this.score = 0;
        this.movesUsed = 0;
        this.timeLeft = maxTime;
        this.comboCount = 0;
        this.totalEliminated = 0;
        this.isGameOver = false;
        this.isWin = false;

        // Zen 专属指标
        this.bestMatch = 0;          // 单次最大消除数
        this.currentChainCount = 0;  // 当前连消波次
        this.maxChainEver = 0;       // 本局最高连消波次

        this._timerId = null;
    }

    /** 计算一组消除得分 */
    calcScore(group) {
        const base = group.cells.length * CONFIG.RULES.BASE_SCORE;
        const multiplier = 1 + (this.comboCount - 1) * CONFIG.RULES.COMBO_MULTIPLIER;
        const bonus = Math.max(1, multiplier);
        group.score = base * bonus;
        return group.score;
    }

    /** 增加连消计数 */
    incrementCombo() {
        this.comboCount++;
        this.currentChainCount++;
        if (this.comboCount > this.maxChainEver) {
            this.maxChainEver = this.comboCount;
        }
    }

    /** 重置连消计数 */
    resetCombo() {
        this.comboCount = 0;
    }

    /** 记录单次消除数量，更新最佳记录 */
    recordElimination(count) {
        if (count > this.bestMatch) {
            this.bestMatch = count;
        }
    }

    /** 获取 Vibe 满足度 (1-5 星) */
    getVibe() {
        const chain = this.maxChainEver;
        if (chain >= 10) return 5;
        if (chain >= 7) return 4;
        if (chain >= 5) return 3;
        if (chain >= 3) return 2;
        return 1;
    }

    /** 获取 Vibe 文字描述 */
    getVibeText() {
        const v = this.getVibe();
        const labels = ['', 'calm ✦', 'nice ✦✦', 'feeling it ✦✦✦', 'on fire ✦✦✦✦', 'transcendent ✦✦✦✦✦'];
        return labels[v];
    }

    /** 消耗一步（Zen 模式不消耗） */
    useMove() {
        if (this.mode === 'zen') return; // Zen 模式无限步数
        this.movesUsed++;
        if (this.mode === 'moves' && this.movesUsed >= this.maxMoves) {
            this.isGameOver = true;
        }
    }

    /** 添加分数并检查胜利条件（Zen 模式不检查） */
    addScore(points) {
        this.score += points;
        if (this.mode !== 'zen' && this.mode !== 'endless') {
            if (this.score >= this.targetScore) {
                this.isWin = true;
                this.isGameOver = true;
            }
        }
    }

    /** 添加消除计数 */
    addEliminated(count) {
        this.totalEliminated += count;
    }

    // ========== 时间模式 ==========

    startTimer(onTick, onTimeUp) {
        if (this.mode !== 'time') return;
        this._timerId = setInterval(() => {
            this.timeLeft--;
            if (onTick) onTick(this.timeLeft);
            if (this.timeLeft <= 0) {
                this.stopTimer();
                this.isGameOver = true;
                if (onTimeUp) onTimeUp();
            }
        }, 1000);
    }

    stopTimer() {
        if (this._timerId) {
            clearInterval(this._timerId);
            this._timerId = null;
        }
    }

    /** 获取状态摘要 */
    getSummary() {
        return {
            score: this.score,
            movesUsed: this.movesUsed,
            movesLeft: this.maxMoves - this.movesUsed,
            timeLeft: this.timeLeft,
            comboCount: this.comboCount,
            totalEliminated: this.totalEliminated,
            isGameOver: this.isGameOver,
            isWin: this.isWin,
            // Zen 专属
            bestMatch: this.bestMatch,
            currentChainCount: this.currentChainCount,
            maxChainEver: this.maxChainEver,
            vibe: this.getVibe(),
            vibeText: this.getVibeText(),
            mode: this.mode
        };
    }

    destroy() {
        this.stopTimer();
    }
}
```

---

### Task 3: GameEngine — Zen 模式核心逻辑

**文件:** 修改 `js/core/GameEngine.js`

- [ ] **Step 1: 修改 `_trySwap` 方法 — Zen 模式不消耗步数且不检查分数胜利**

修改 `_trySwap` 方法（约第 136-161 行），将：

```js
        // 有效交换 → 消耗步数，进入消除流程
        this.scoreMgr.useMove();
        this._emit('validSwap', r1, c1, r2, c2);
        this._emit('scoreUpdate', this.scoreMgr.getSummary());
        setTimeout(() => this._processMatches(matches), CONFIG.ANIM.SWAP_SPEED);
```

替换为：

```js
        // 有效交换
        const isZen = this.scoreMgr.mode === 'zen';
        if (!isZen) {
            this.scoreMgr.useMove();
        }
        this._emit('validSwap', r1, c1, r2, c2);
        this._emit('scoreUpdate', this.scoreMgr.getSummary());
        setTimeout(() => this._processMatches(matches), CONFIG.ANIM.SWAP_SPEED);
```

- [ ] **Step 2: 修改 `_processMatches` — 记录消除数 + 触发特效事件**

在 `_processMatches` 方法中，找到 `this.scoreMgr.addEliminated(allCoords.size);` 这一行（第 211 行），在它之后添加：

```js
        // 记录消除数（Zen 模式用于最佳纪录追踪）
        this.scoreMgr.recordElimination(allCoords.size);

        // 触发特效事件
        const comboLevel = this.scoreMgr.comboCount;
        if (comboLevel >= CONFIG.EFFECT_PARAMS.COMBO_POP_MIN_LEVEL) {
            this._emit('comboPopup', { level: comboLevel, coords: eliminatedCoords });
        }
        this._emit('shake', { count: allCoords.size, comboLevel: comboLevel, coords: eliminatedCoords });
        this._emit('lightBurst', { coords: eliminatedCoords, gemType: matches[0]?.gemType ?? 0 });
        this._emit('scoreFloat', { score: roundScore, coords: eliminatedCoords, comboLevel: comboLevel });
        this._emit('borderGlow', { comboLevel: comboLevel });
```

- [ ] **Step 3: 修改 `_checkGameOver` — Zen 模式下不触发失败**

修改 `_checkGameOver` 方法（约第 273-282 行）为：

```js
    _checkGameOver() {
        if (this.scoreMgr.isWin || this.scoreMgr.isGameOver) {
            this._onGameOver();
            return;
        }
        // 检查是否还有可行的移动
        if (this.state === 'idle' && !this._hasPossibleMove()) {
            if (this.scoreMgr.mode === 'zen') {
                // Zen 模式自动洗牌
                this._emit('autoShuffle', '棋盘已清，重新洗牌...');
                setTimeout(() => {
                    this.board.init(); // 重新生成棋盘
                    this._emit('boardReset');
                    // 验证新棋盘有可行移动
                    while (!this._hasPossibleMove()) {
                        this.board.init();
                    }
                    this._emit('scoreUpdate', this.scoreMgr.getSummary());
                }, CONFIG.ZEN.SHUFFLE_DELAY);
            } else {
                this._onGameOver();
            }
        }
    }
```

- [ ] **Step 4: 修改 `resetCombo` 调用 — Zen 模式重置 currentChain**

在 `_processMatches` 方法开头附近，连消重置逻辑改为：

找到 `this.scoreMgr.resetCombo()` 调用位置（在 matches.length === 0 分支中，第 172 行），在前面一行增加：

```js
            // 记录本波连消结束
            this.scoreMgr.currentChainCount = 0;
```

---

### Task 4: AnimateManager — 屏幕微震 + 分数飘字

**文件:** 修改 `js/render/AnimateManager.js`

- [ ] **Step 1: 添加 shake 效果和 floatText 系统**

在 `AnimateManager` 类的构造函数中添加新状态：

```js
    constructor(engine) {
        this.engine = engine;
        this._tweens = [];
        // 微震状态
        this._shakeIntensity = 0;
        this._shakeElapsed = 0;
        this._shakeDuration = 0;
        this._shakeOffsetX = 0;
        this._shakeOffsetY = 0;
        // 飘字列表
        this.floatTexts = [];
    }
```

在 `clear()` 方法中添加清理：

```js
    clear() {
        this._tweens = [];
        this.floatTexts = [];
        this._shakeIntensity = 0;
        this._shakeOffsetX = 0;
        this._shakeOffsetY = 0;
    }
```

- [ ] **Step 2: 添加 `triggerShake` 方法**

在 AnimateManager 类中添加：

```js
    /** 触发屏幕微震 */
    triggerShake(intensity, duration) {
        this._shakeIntensity = Math.max(this._shakeIntensity, intensity);
        this._shakeDuration = duration || CONFIG.EFFECT_PARAMS.SHAKE_DURATION;
        this._shakeElapsed = 0;
    }
```

- [ ] **Step 3: 添加 `addFloatText` 方法**

```js
    /** 添加分数飘字 */
    addFloatText(x, y, text, color) {
        this.floatTexts.push({
            x: x + (Math.random() - 0.5) * 40, // 随机 x 偏移 ±20px
            y: y,
            text: text,
            color: color || '#FFD700',
            life: 1,
            startY: y
        });
        // 限制最多 50 个飘字同时存在
        if (this.floatTexts.length > 50) {
            this.floatTexts.shift();
        }
    }
```

- [ ] **Step 4: 修改 `update` 方法 — 加入微震和飘字更新**

在 `update(dt)` 方法的开头（约第 114 行 `for` 循环之前）添加：

```js
    update(dt) {
        // 更新屏幕微震
        if (this._shakeIntensity > 0) {
            this._shakeElapsed += dt * 1000;
            const progress = this._shakeElapsed / this._shakeDuration;
            if (progress >= 1) {
                this._shakeIntensity = 0;
                this._shakeOffsetX = 0;
                this._shakeOffsetY = 0;
            } else {
                const decay = 1 - progress;
                const intensity = this._shakeIntensity * decay;
                this._shakeOffsetX = (Math.random() - 0.5) * 2 * intensity;
                this._shakeOffsetY = (Math.random() - 0.5) * 2 * intensity;
            }
        }

        // 更新飘字
        for (let i = this.floatTexts.length - 1; i >= 0; i--) {
            const ft = this.floatTexts[i];
            ft.life -= dt * (1000 / CONFIG.EFFECT_PARAMS.SCORE_FLOAT_DURATION);
            if (ft.life <= 0) {
                this.floatTexts.splice(i, 1);
                continue;
            }
            ft.y = ft.startY - (1 - ft.life) * CONFIG.EFFECT_PARAMS.SCORE_FLOAT_RISE;
        }

        // === 原有 tween 更新逻辑 ===
        for (let i = this._tweens.length - 1; i >= 0; i--) {
            // ... 不变
```

---

### Task 5: Renderer — 光波扩散 + 边框辉光 + 连击大字 + 飘字渲染

**文件:** 修改 `js/render/Renderer.js`

- [ ] **Step 1: 添加新渲染状态到构造函数**

在 `constructor` 中添加：

```js
        /** 光波扩散环 */
        this.lightBursts = [];
        /** 连击大字弹出 */
        this.comboPopups = [];
        /** 边框辉光级别 */
        this._borderGlowLevel = 0;
        /** 边框辉光脉冲相位 */
        this._borderGlowPhase = 0;
```

- [ ] **Step 2: 修改 `_drawBackground` — 适配深海主题**

将 `_drawBackground` 方法中的装饰光晕渐变色改为：

```js
    _drawBackground(ctx, w, h) {
        ctx.fillStyle = CONFIG.THEME.BACKGROUND;
        ctx.fillRect(0, 0, w, h);

        // 深海幽蓝装饰光晕
        const gradient = ctx.createRadialGradient(w * 0.3, h * 0.3, 0, w * 0.5, h * 0.5, w * 0.7);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.08)');
        gradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.05)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
    }
```

- [ ] **Step 3: 修改 `_drawGrid` — 使用海洋主题格子颜色**

将 `_drawGrid` 方法中交替格颜色改为：

```js
                const even = (r + c) % 2 === 0;
                ctx.fillStyle = even
                    ? 'rgba(59, 130, 246, 0.04)'
                    : 'rgba(0, 0, 0, 0.15)';
```

- [ ] **Step 4: 修改 `spawnParticles` — 强化粒子（数量 ×2）**

将 `spawnParticles` 方法改为：

```js
    spawnParticles(row, col, color) {
        const p = CONFIG.CANVAS.PADDING;
        const cs = CONFIG.GRID.CELL_SIZE;
        const cx = p + col * cs + cs / 2;
        const cy = p + row * cs + cs / 2;

        // 强化：粒子数量翻倍 (12-24)
        const count = 12 + Math.floor(Math.random() * 13);
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 180;
            const size = 1.5 + Math.random() * 5;
            this.particles.push({
                x: cx + (Math.random() - 0.5) * 10,
                y: cy + (Math.random() - 0.5) * 10,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 40,
                life: 1,
                decay: 1.0 + Math.random() * 2.2,
                color: color,
                size: size,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 10
            });
        }
    }
```

- [ ] **Step 5: 修改 `_drawParticles` — 粒子绘制添加旋转支持**

在粒子绘制循环中，将 `ctx.arc(...)` 替换为：

```js
            ctx.save();
            ctx.globalAlpha = pt.life;
            ctx.fillStyle = pt.color;
            ctx.translate(pt.x, pt.y);
            if (pt.rotation !== undefined) {
                pt.rotation += pt.rotSpeed * dt;
                ctx.rotate(pt.rotation);
            }
            // 方形/圆形混合
            if (Math.random() < 0.5) {
                ctx.fillRect(-pt.size * pt.life / 2, -pt.size * pt.life / 2,
                              pt.size * pt.life, pt.size * pt.life);
            } else {
                ctx.beginPath();
                ctx.arc(0, 0, pt.size * pt.life, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
```

- [ ] **Step 6: 添加光波扩散、连击大字、浮字、边框辉光渲染方法**

在 `render(dt)` 方法中，在 `this._drawOverlay(ctx, w, h);` 之前插入：

```js
        this._drawLightBursts(ctx, dt);
        this._drawFloatTexts(ctx, dt);
        this._drawComboPopups(ctx, dt);
        this._updateBorderGlow(dt);
```

然后添加这些方法：

```js
    // ==================== 光波扩散 ====================

    addLightBurst(row, col, color) {
        const p = CONFIG.CANVAS.PADDING;
        const cs = CONFIG.GRID.CELL_SIZE;
        this.lightBursts.push({
            x: p + col * cs + cs / 2,
            y: p + row * cs + cs / 2,
            radius: 0,
            maxRadius: this.viewWidth * 0.8,
            life: 1,
            duration: CONFIG.EFFECT_PARAMS.LIGHT_BURST_DURATION / 1000,
            color: color
        });
        if (this.lightBursts.length > 10) this.lightBursts.shift();
    }

    _drawLightBursts(ctx, dt) {
        for (let i = this.lightBursts.length - 1; i >= 0; i--) {
            const lb = this.lightBursts[i];
            lb.life -= dt / lb.duration;
            if (lb.life <= 0) {
                this.lightBursts.splice(i, 1);
                continue;
            }
            lb.radius = (1 - lb.life) * lb.maxRadius;
            const alpha = lb.life * 0.3;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = lb.color;
            ctx.lineWidth = 2 * lb.life;
            ctx.beginPath();
            ctx.arc(lb.x, lb.y, lb.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    // ==================== 连击大字弹出 ====================

    addComboPopup(level) {
        // 移除旧的同类型弹出
        this.comboPopups = this.comboPopups.filter(p => p.type !== 'combo');
        this.comboPopups.push({
            type: 'combo',
            text: `x${level} COMBO!`,
            life: 1,
            duration: CONFIG.EFFECT_PARAMS.COMBO_POP_DURATION / 1000,
            scale: 0
        });
    }

    _drawComboPopups(ctx, dt) {
        const w = this.viewWidth;
        const h = this.viewHeight;
        const cx = w / 2;
        const cy = h / 2;

        for (let i = this.comboPopups.length - 1; i >= 0; i--) {
            const pop = this.comboPopups[i];
            pop.life -= dt / pop.duration;
            if (pop.life <= 0) {
                this.comboPopups.splice(i, 1);
                continue;
            }

            // 动画阶段：0-0.2 弹入放大, 0.2-0.6 停留, 0.6-1 向上飘+渐隐
            let scale, alpha, offsetY;
            const phase = 1 - pop.life;
            if (phase < 0.2) {
                scale = 0.5 + (phase / 0.2) * 0.8; // 0.5 → 1.3
                alpha = 1;
                offsetY = 0;
            } else if (phase < 0.6) {
                scale = 1.3 - ((phase - 0.2) / 0.4) * 0.3; // 1.3 → 1.0
                alpha = 1;
                offsetY = 0;
            } else {
                const fadePhase = (phase - 0.6) / 0.4;
                scale = 1.0;
                alpha = 1 - fadePhase;
                offsetY = -30 * fadePhase;
            }

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(cx, cy + offsetY);
            ctx.scale(scale, scale);
            ctx.font = 'bold 32px "Microsoft YaHei", "PingFang SC", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(245, 158, 11, 0.7)';
            ctx.shadowBlur = 20;
            ctx.fillStyle = '#FFD700';
            ctx.fillText(pop.text, 0, 0);
            ctx.shadowBlur = 0;
            ctx.restore();
        }
    }

    // ==================== 分数飘字渲染 ====================

    _drawFloatTexts(ctx, dt) {
        // 从 AnimateManager 读取浮字数据
        const animator = this.engine._animatorRef;
        if (!animator || !animator.floatTexts) return;

        for (const ft of animator.floatTexts) {
            ctx.save();
            ctx.globalAlpha = ft.life;
            ctx.font = 'bold 16px "Microsoft YaHei", "PingFang SC", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 3;
            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.shadowBlur = 0;
            ctx.restore();
        }
    }

    // ==================== 边框辉光 ====================

    /** 更新边框辉光级别（由事件驱动） */
    setBorderGlowLevel(level) {
        this._borderGlowLevel = level;
    }

    _updateBorderGlow(dt) {
        this._borderGlowPhase += dt * 3; // 呼吸周期约 2s
    }

    /** 获取棋盘容器的当前辉光样式（由 CSS 使用） */
    getBorderGlowStyle() {
        if (this._borderGlowLevel >= 5) {
            const pulse = 0.5 + 0.5 * Math.sin(this._borderGlowPhase);
            const alpha = 0.3 + pulse * 0.4;
            return `0 0 ${40 + 30 * pulse}px rgba(245,158,11,${alpha.toFixed(2)})`;
        } else if (this._borderGlowLevel >= 3) {
            return CONFIG.EFFECT_PARAMS.BORDER_GLOW_MID;
        } else {
            return CONFIG.EFFECT_PARAMS.BORDER_GLOW_LO;
        }
    }
```

- [ ] **Step 6: 添加 `addShuffleText` 方法用于自动洗牌提示**

```js
    /** 显示自动洗牌提示 */
    addShuffleText(text) {
        this.comboPopups = this.comboPopups.filter(p => p.type !== 'shuffle');
        this.comboPopups.push({
            type: 'shuffle',
            text: text,
            life: 1,
            duration: 1.5,
            scale: 0
        });
    }
```

---

### Task 6: UISystem — Zen 模式 HUD 指标

**文件:** 修改 `js/system/UISystem.js`

- [ ] **Step 1: 替换 UISystem 为支持双模式的版本**

将整个文件替换为：

```js
/**
 * UI 系统 — 支持 Zen / Challenge 双模式
 * Zen 模式显示：Chain / Best / Vibe
 * Challenge 模式显示：分数 / 步数 / 时间 / Combo
 */
class UISystem {

    constructor(engine, elements) {
        this.engine = engine;
        this.el = elements;
        this._currentMode = 'zen';
        this._bindEvents();
    }

    _bindEvents() {
        if (this.el.btnNew) {
            this.el.btnNew.addEventListener('click', () => {
                this._restartCurrentMode();
            });
        }
    }

    /** 由外部调用，初始化游戏后更新 UI */
    init() {
        this.updateScore(0);
        this.updateMoves(CONFIG.LEVEL.MAX_MOVES);
        this.updateTime(CONFIG.LEVEL.MAX_TIME);
        this.updateCombo(0);
        this.updateZenIndicators({ currentChainCount: 0, bestMatch: 0, vibeText: 'calm ✦' });
        this.hideGameOver();
        this._updateModeUI();
    }

    /** 设置当前模式并更新 UI 显示 */
    setMode(mode) {
        this._currentMode = mode;
        this._updateModeUI();
    }

    _updateModeUI() {
        const isZen = this._currentMode === 'zen';
        // 切换 HUD 区域显示
        if (this.el.zenHud) {
            this.el.zenHud.style.display = isZen ? '' : 'none';
        }
        if (this.el.challengeHud) {
            this.el.challengeHud.style.display = isZen ? 'none' : '';
        }
        if (this.el.btnNew) {
            this.el.btnNew.textContent = isZen ? '🔄 换一局' : '🔄 新游戏';
        }
        // 更新 Tab 激活状态
        if (this.el.tabZen) {
            this.el.tabZen.classList.toggle('active', isZen);
        }
        if (this.el.tabChallenge) {
            this.el.tabChallenge.classList.toggle('active', !isZen);
        }
    }

    _restartCurrentMode() {
        const mode = this._currentMode;
        const maxMoves = CONFIG.LEVEL.MAX_MOVES;
        const maxTime = CONFIG.LEVEL.MAX_TIME;
        const targetScore = CONFIG.LEVEL.TARGET_SCORE;
        this.engine.destroy();
        this.engine.init(mode, maxMoves, maxTime, targetScore);
        this.engine.start();
        this.init();
    }

    /** 启动一个指定模式的新游戏 */
    startNewGame(mode) {
        this._currentMode = mode;
        this._restartCurrentMode();
    }

    // ========== Challenge HUD 更新 ==========

    updateScore(score) {
        if (this.el.score) this.el.score.textContent = score;
    }

    updateMoves(left) {
        if (this.el.moves) this.el.moves.textContent = left;
    }

    updateTime(seconds) {
        if (this.el.time) this.el.time.textContent = seconds;
    }

    updateCombo(combo) {
        if (this.el.combo) {
            if (combo > 1) {
                this.el.combo.textContent = `Combo x${combo}!`;
                this.el.combo.style.display = 'block';
            } else {
                this.el.combo.style.display = 'none';
            }
        }
    }

    // ========== Zen HUD 更新 ==========

    updateZenIndicators(zenData) {
        if (this.el.zenChain) {
            this.el.zenChain.textContent = zenData.currentChainCount || 0;
        }
        if (this.el.zenBest) {
            this.el.zenBest.textContent = zenData.bestMatch || 0;
        }
        if (this.el.zenVibe) {
            this.el.zenVibe.textContent = zenData.vibeText || 'calm ✦';
        }
    }

    // ========== 通用 ==========

    showGameOver(summary) {
        if (this.el.gameOverPanel) {
            const title = summary.isWin ? '🎉 胜利!' : '⏰ 游戏结束';
            const detail = `得分: ${summary.score} | 消除: ${summary.totalEliminated} 个`;
            if (this.el.gameOverTitle) this.el.gameOverTitle.textContent = title;
            if (this.el.gameOverDetail) this.el.gameOverDetail.textContent = detail;
            this.el.gameOverPanel.style.display = 'flex';
        }
    }

    hideGameOver() {
        if (this.el.gameOverPanel) {
            this.el.gameOverPanel.style.display = 'none';
        }
    }

    update(summary) {
        this.updateScore(summary.score);
        if (summary.movesLeft !== undefined) this.updateMoves(summary.movesLeft);
        if (summary.comboCount !== undefined) this.updateCombo(summary.comboCount);
        // Zen 指标
        this.updateZenIndicators({
            currentChainCount: summary.currentChainCount,
            bestMatch: summary.bestMatch,
            vibeText: summary.vibeText
        });
    }
}
```

---

### Task 7: index.html — UI 重构（Tab + 状态条）

**文件:** 修改 `index.html`

- [ ] **Step 1: 替换 HTML 为新的 Zen 布局**

将整个 `index.html` 替换为：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>🧘 Zen 消消乐</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>

    <div class="game-container">
        <!-- 顶部模式切换 Tab -->
        <div class="tab-bar">
            <button class="tab-btn active" id="tabZen">🧘 Zen</button>
            <button class="tab-btn" id="tabChallenge">⚔ Challenge</button>
        </div>

        <!-- Zen 模式状态条 -->
        <div class="zen-hud" id="zenHud">
            <div class="hud-item">
                <span class="hud-label">🔥 连消次数</span>
                <span class="hud-value" id="zenChain">0</span>
            </div>
            <div class="hud-divider"></div>
            <div class="hud-item">
                <span class="hud-label">💥 最大消除</span>
                <span class="hud-value" id="zenBest">0</span>
            </div>
            <div class="hud-divider"></div>
            <div class="hud-item">
                <span class="hud-label">✨ 满足度</span>
                <span class="hud-value vibe" id="zenVibe">calm ✦</span>
            </div>
        </div>

        <!-- Challenge 模式状态条 -->
        <div class="challenge-hud" id="challengeHud" style="display:none;">
            <div class="hud-item">
                <span class="hud-label">🏆 分数</span>
                <span class="hud-value" id="scoreValue">0</span>
            </div>
            <div class="hud-divider"></div>
            <div class="hud-item" id="movesPanel">
                <span class="hud-label">👣 剩余步数</span>
                <span class="hud-value" id="movesValue">30</span>
            </div>
            <div class="hud-divider"></div>
            <div class="hud-item">
                <span class="hud-label">🔥 连击</span>
                <span class="hud-value combo" id="comboValue" style="display:none;">-</span>
            </div>
        </div>

        <!-- 时间模式计时（Challenge 专属） -->
        <div class="time-bar" id="timePanel" style="display:none;">
            <span>⏱️ 剩余时间: <strong id="timeValue">60</strong>s</span>
        </div>

        <!-- 画布区域 -->
        <div class="canvas-wrapper" id="canvasWrapper">
            <canvas id="gameCanvas" width="552" height="552"></canvas>

            <!-- 游戏结束弹窗（Challenge 模式用） -->
            <div class="game-over-overlay" id="gameOverPanel">
                <h2 id="gameOverTitle">游戏结束</h2>
                <p id="gameOverDetail"></p>
                <button class="btn btn-primary" id="btnRestart">再来一局</button>
            </div>
        </div>

        <!-- 底部操作按钮 -->
        <div class="bottom-bar">
            <button class="btn btn-primary" id="btnNewGame">🔄 换一局</button>
        </div>
    </div>

    <!-- JS 加载顺序 -->
    <script src="js/config.js"></script>

    <!-- 核心逻辑层 -->
    <script src="js/core/Gem.js"></script>
    <script src="js/core/Board.js"></script>
    <script src="js/core/Matcher.js"></script>
    <script src="js/core/Gravity.js"></script>
    <script src="js/core/PowerUp.js"></script>
    <script src="js/core/ScoreManager.js"></script>
    <script src="js/core/GameEngine.js"></script>

    <!-- 渲染层 -->
    <script src="js/render/AnimateManager.js"></script>
    <script src="js/render/Renderer.js"></script>

    <!-- 输入层 -->
    <script src="js/input/InputManager.js"></script>

    <!-- UI 系统 -->
    <script src="js/system/UISystem.js"></script>

    <!-- 主入口 -->
    <script src="js/main.js"></script>
</body>
</html>
```

---

### Task 8: style.css — 深海幽蓝主题 + 全动画关键帧

**文件:** 修改 `css/style.css`

- [ ] **Step 1: 替换整个 CSS 为深海幽蓝主题**

将整个 `css/style.css` 替换为：

```css
/* ================================================
   Zen 消消乐 — 深海幽蓝主题
   深蓝调 + 辉光 + 全动画关键帧
   ================================================ */

/* ========== 基础重置 ========== */
*, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

:root {
    --bg-deep: #0a1628;
    --bg-panel: #0f1d35;
    --bg-card: rgba(15, 29, 53, 0.8);
    --text-primary: #e0e8f0;
    --text-accent: #FFD700;
    --text-muted: #7b8ca8;
    --accent: #60A5FA;
    --accent-dim: #93C5FD;
    --zen-active: #6366F1;
    --challenge-active: #FF4757;
    --border: rgba(59, 130, 246, 0.12);
    --radius: 12px;
    --shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
}

html, body {
    width: 100%;
    height: 100%;
    overflow: hidden;
    font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
    background: var(--bg-deep);
    color: var(--text-primary);
}

/* ========== 主容器（垂直堆叠） ========== */
.game-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    max-width: 600px;
    height: 100%;
    margin: 0 auto;
    padding: 12px 16px;
}

/* ========== Tab 栏 ========== */
.tab-bar {
    display: flex;
    gap: 4px;
    background: var(--bg-panel);
    border-radius: 10px;
    padding: 4px;
    width: 100%;
    max-width: 280px;
}

.tab-btn {
    flex: 1;
    padding: 8px 16px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.25s ease;
    background: transparent;
    color: var(--text-muted);
    outline: none;
}

.tab-btn.active {
    color: #fff;
}

.tab-btn#tabZen.active {
    background: linear-gradient(135deg, var(--zen-active), #4F46E5);
    box-shadow: 0 2px 12px rgba(99, 102, 241, 0.35);
}

.tab-btn#tabChallenge.active {
    background: linear-gradient(135deg, var(--challenge-active), #DC2626);
    box-shadow: 0 2px 12px rgba(255, 71, 87, 0.35);
}

.tab-btn:not(.active):hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.04);
}

/* ========== 状态条（HUD） ========== */
.zen-hud, .challenge-hud {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0;
    background: var(--bg-card);
    border-radius: var(--radius);
    border: 1px solid var(--border);
    padding: 8px 16px;
    width: 100%;
    max-width: 552px;
}

.hud-item {
    flex: 1;
    text-align: center;
}

.hud-label {
    display: block;
    font-size: 10px;
    font-weight: 600;
    color: var(--accent-dim);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 2px;
}

.hud-value {
    font-size: 22px;
    font-weight: 700;
    color: var(--text-accent);
    font-variant-numeric: tabular-nums;
}

.hud-value.vibe {
    font-size: 16px;
    letter-spacing: 2px;
}

.hud-value.combo {
    font-size: 16px;
    color: #FF6348;
}

.hud-divider {
    width: 1px;
    height: 32px;
    background: var(--border);
    margin: 0 12px;
}

/* ========== 时间条（Challenge 模式） ========== */
.time-bar {
    text-align: center;
    font-size: 13px;
    color: var(--text-muted);
    padding: 4px 0;
}

.time-bar strong {
    color: var(--challenge-active);
}

/* ========== 画布区域 ========== */
.canvas-wrapper {
    position: relative;
    flex-shrink: 0;
    border-radius: var(--radius);
    overflow: hidden;
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.15);
    transition: box-shadow 0.3s ease;
}

.canvas-wrapper.glow-mid {
    box-shadow: 0 0 40px rgba(245, 158, 11, 0.3);
}

.canvas-wrapper.glow-hi {
    box-shadow: 0 0 60px rgba(245, 158, 11, 0.5);
    animation: borderGlowPulse 2s ease-in-out infinite;
}

.canvas-wrapper.shaking {
    /* 偏移由 JS 动态设置 */
}

canvas#gameCanvas {
    display: block;
    width: 552px;
    height: 552px;
    cursor: pointer;
}

/* ========== 底部操作栏 ========== */
.bottom-bar {
    width: 100%;
    max-width: 552px;
}

.btn {
    width: 100%;
    padding: 10px 16px;
    border-radius: 10px;
    border: none;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    letter-spacing: 0.5px;
}

.btn-primary {
    background: linear-gradient(135deg, var(--zen-active), #4F46E5);
    color: #fff;
}

.btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.45);
}

.btn-primary:active {
    transform: translateY(0);
}

/* ========== 游戏结束弹窗 ========== */
.game-over-overlay {
    display: none;
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 12px;
    border-radius: var(--radius);
    z-index: 10;
}

.game-over-overlay h2 {
    font-size: 36px;
    font-weight: 800;
}

.game-over-overlay p {
    font-size: 16px;
    color: var(--text-muted);
    margin-bottom: 8px;
}

.game-over-overlay .btn {
    width: auto;
    padding: 12px 32px;
}

/* ========== 动画关键帧 ========== */

@keyframes borderGlowPulse {
    0%, 100% { box-shadow: 0 0 40px rgba(245, 158, 11, 0.3); }
    50%      { box-shadow: 0 0 70px rgba(245, 158, 11, 0.55); }
}

@keyframes comboPulse {
    0%   { transform: scale(1.4); }
    100% { transform: scale(1); }
}

@keyframes floatUp {
    0%   { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-60px); }
}

/* ========== 响应式：移动端 ========== */
@media (max-width: 600px) {
    .game-container {
        gap: 8px;
        padding: 8px;
    }

    canvas#gameCanvas {
        width: 100vw;
        height: auto;
        max-width: 552px;
    }

    .canvas-wrapper {
        width: 100%;
        max-width: 552px;
    }

    .zen-hud, .challenge-hud {
        max-width: 100%;
        padding: 6px 10px;
    }

    .hud-value {
        font-size: 18px;
    }

    .hud-label {
        font-size: 9px;
    }

    .hud-divider {
        margin: 0 8px;
        height: 24px;
    }

    .bottom-bar {
        max-width: 100%;
    }

    .tab-bar {
        max-width: 240px;
    }
}
```

---

### Task 9: main.js — 双模式入口 + 事件桥接

**文件:** 修改 `js/main.js`

- [ ] **Step 1: 替换 main.js 为 Zen 优先的双模式版本**

将整个 `js/main.js` 替换为：

```js
/**
 * Zen 消消乐 - 主入口文件
 * 默认启动 Zen 模式，支持 Zen / Challenge 双模式切换
 */
(function () {
    'use strict';

    // ========== DOM 引用 ==========
    const canvas = document.getElementById('gameCanvas');
    const canvasWrapper = document.getElementById('canvasWrapper');
    const elements = {
        // Challenge HUD
        score: document.getElementById('scoreValue'),
        moves: document.getElementById('movesValue'),
        movesPanel: document.getElementById('movesPanel'),
        time: document.getElementById('timeValue'),
        timePanel: document.getElementById('timePanel'),
        combo: document.getElementById('comboValue'),
        // Zen HUD
        zenHud: document.getElementById('zenHud'),
        zenChain: document.getElementById('zenChain'),
        zenBest: document.getElementById('zenBest'),
        zenVibe: document.getElementById('zenVibe'),
        challengeHud: document.getElementById('challengeHud'),
        // Tab
        tabZen: document.getElementById('tabZen'),
        tabChallenge: document.getElementById('tabChallenge'),
        // 按钮
        btnNew: document.getElementById('btnNewGame'),
        btnRestart: document.getElementById('btnRestart'),
        // 弹窗
        gameOverPanel: document.getElementById('gameOverPanel'),
        gameOverTitle: document.getElementById('gameOverTitle'),
        gameOverDetail: document.getElementById('gameOverDetail')
    };

    // ========== 核心模块初始化 ==========
    const engine = new GameEngine();
    const renderer = new Renderer(canvas, engine);
    const animator = new AnimateManager(engine);
    const inputMgr = new InputManager(canvas, engine);
    const uiSystem = new UISystem(engine, elements);

    // 让 Renderer 可以访问 AnimateManager 的浮字
    engine._animatorRef = animator;

    // ========== 游戏主循环 ==========
    let lastTime = performance.now();
    let currentMode = 'zen';

    function gameLoop(timestamp) {
        const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
        lastTime = timestamp;

        animator.update(dt);
        renderer.render(dt);

        // 应用边框辉光
        if (canvasWrapper) {
            const glowLevel = renderer._borderGlowLevel;
            canvasWrapper.classList.remove('glow-mid', 'glow-hi');
            if (glowLevel >= 5) {
                canvasWrapper.classList.add('glow-hi');
            } else if (glowLevel >= 3) {
                canvasWrapper.classList.add('glow-mid');
            }
        }

        // 应用屏幕微震偏移
        if (canvasWrapper && animator._shakeIntensity > 0) {
            canvasWrapper.style.transform =
                `translate(${animator._shakeOffsetX}px, ${animator._shakeOffsetY}px)`;
        } else if (canvasWrapper) {
            canvasWrapper.style.transform = '';
        }

        requestAnimationFrame(gameLoop);
    }

    // ========== 启动/重启游戏 ==========
    function startGame(mode) {
        currentMode = mode || 'zen';
        engine.destroy();
        animator.clear();
        renderer.hideOverlay();
        renderer.setSelection(-1, -1);
        renderer.setDragTarget(-1, -1);
        renderer._borderGlowLevel = 0;

        const maxMoves = CONFIG.LEVEL.MAX_MOVES;
        const maxTime = CONFIG.LEVEL.MAX_TIME;
        const targetScore = CONFIG.LEVEL.TARGET_SCORE;

        engine.init(currentMode, maxMoves, maxTime, targetScore);
        engine.start();
        uiSystem.setMode(currentMode);
        uiSystem.init();
        updateHudVisibility();
    }

    function updateHudVisibility() {
        const isZen = currentMode === 'zen';
        if (elements.zenHud) elements.zenHud.style.display = isZen ? '' : 'none';
        if (elements.challengeHud) elements.challengeHud.style.display = isZen ? 'none' : '';
        if (elements.timePanel) elements.timePanel.style.display =
            (!isZen && currentMode === 'time') ? '' : 'none';
        if (elements.movesPanel) elements.movesPanel.style.display =
            (!isZen && currentMode === 'time') ? 'none' : '';
        if (elements.btnNew) elements.btnNew.textContent = isZen ? '🔄 换一局' : '🔄 新游戏';
    }

    // ========== 事件桥接：Engine → Renderer + UI ==========

    engine.on('init', () => {
        renderer.hideOverlay();
        uiSystem.init();
        animator.clear();
        renderer._borderGlowLevel = 0;
    });

    engine.on('select', (row, col) => {
        renderer.setSelection(row, col);
        renderer.setDragTarget(-1, -1);
    });

    engine.on('deselect', () => {
        renderer.setSelection(-1, -1);
    });

    engine.on('dragHint', (row, col) => {
        renderer.setDragTarget(row, col);
    });

    engine.on('validSwap', () => {});

    engine.on('invalidSwap', (r1, c1, r2, c2) => {
        renderer.setSelection(-1, -1);
        const gem1 = engine.board.get(r1, c1);
        const gem2 = engine.board.get(r2, c2);
        if (gem1 && gem2) {
            const cs = CONFIG.GRID.CELL_SIZE;
            gem1.animX = (c2 - c1) * cs;
            gem1.animY = (r2 - r1) * cs;
            gem2.animX = (c1 - c2) * cs;
            gem2.animY = (r1 - r2) * cs;
            animator.tween(gem1, { animX: 0, animY: 0 }, CONFIG.ANIM.BOUNCE_SPEED, 'easeOutBack');
            animator.tween(gem2, { animX: 0, animY: 0 }, CONFIG.ANIM.BOUNCE_SPEED, 'easeOutBack');
        }
    });

    engine.on('eliminate', (coords) => {
        const board = engine.board;
        for (const coord of coords) {
            const gem = board.get(coord.r, coord.c);
            const gemCfg = gem ? CONFIG.GEMS[gem.type] : CONFIG.GEMS[0];
            renderer.spawnParticles(coord.r, coord.c, gemCfg.color);
        }
        animator.animateEliminate(coords, board);
    });

    engine.on('fall', (fallResult) => {
        if (fallResult.hasAny()) {
            animator.animateFall(fallResult);
        }
    });

    engine.on('scoreUpdate', (summary) => {
        uiSystem.update(summary);
    });

    engine.on('gameOver', (summary) => {
        // Zen 模式不会触发此事件
        uiSystem.showGameOver(summary);
        renderer.showGameOver(summary);
    });

    engine.on('tick', (timeLeft) => {
        uiSystem.updateTime(timeLeft);
    });

    // ========== 特效事件桥接 ==========

    engine.on('comboPopup', (data) => {
        if (CONFIG.EFFECTS.COMBO_POPUP) {
            renderer.addComboPopup(data.level);
        }
    });

    engine.on('shake', (data) => {
        if (CONFIG.EFFECTS.SCREEN_SHAKE && (data.count >= 4 || data.comboLevel >= 3)) {
            animator.triggerShake(CONFIG.EFFECT_PARAMS.SHAKE_INTENSITY, CONFIG.EFFECT_PARAMS.SHAKE_DURATION);
        }
    });

    engine.on('lightBurst', (data) => {
        if (CONFIG.EFFECTS.LIGHT_BURST && data.coords.length > 0) {
            const center = data.coords[Math.floor(data.coords.length / 2)];
            const gemCfg = CONFIG.GEMS[data.gemType] || CONFIG.GEMS[0];
            renderer.addLightBurst(center.r, center.c, gemCfg.glow);
        }
    });

    engine.on('scoreFloat', (data) => {
        if (CONFIG.EFFECTS.SCORE_FLOAT && data.coords.length > 0) {
            const center = data.coords[Math.floor(data.coords.length / 2)];
            const p = CONFIG.CANVAS.PADDING;
            const cs = CONFIG.GRID.CELL_SIZE;
            const cx = p + center.c * cs + cs / 2;
            const cy = p + center.r * cs + cs / 2;
            animator.addFloatText(cx, cy, `+${data.score}`,
                data.comboLevel >= 3 ? '#FFD700' : '#93C5FD');
        }
    });

    engine.on('borderGlow', (data) => {
        if (CONFIG.EFFECTS.BORDER_GLOW) {
            renderer.setBorderGlowLevel(data.comboLevel);
        }
    });

    engine.on('autoShuffle', (text) => {
        renderer.addShuffleText(text);
    });

    engine.on('boardReset', () => {
        renderer.setBorderGlowLevel(0);
    });

    // ========== Tab 切换事件 ==========
    if (elements.tabZen) {
        elements.tabZen.addEventListener('click', () => {
            if (currentMode !== 'zen') {
                startGame('zen');
            }
        });
    }

    if (elements.tabChallenge) {
        elements.tabChallenge.addEventListener('click', () => {
            if (currentMode !== 'moves') {
                startGame('moves');
            }
        });
    }

    // ========== 按钮事件 ==========
    if (elements.btnRestart) {
        elements.btnRestart.addEventListener('click', () => {
            startGame(currentMode);
        });
    }

    if (elements.btnNew) {
        elements.btnNew.addEventListener('click', () => {
            startGame(currentMode);
        });
    }

    // ========== 启动 ==========
    startGame('zen');
    requestAnimationFrame(gameLoop);

    console.log('🧘 Zen 消消乐已启动');
    console.log('   无限消除 | 永不失败 | 越消越爽');
    console.log(`   棋盘: ${CONFIG.GRID.ROWS}x${CONFIG.GRID.COLS} | 深海幽蓝主题`);
})();
```

---

## 自审清单

1. **Spec 覆盖:**
   - 深海幽蓝配色 → Task 1 (config.js)
   - 顶部状态条布局 → Task 7 (HTML) + Task 8 (CSS)
   - Zen 无失败/无限步数 → Task 3 (GameEngine)
   - 自动洗牌 → Task 3 (GameEngine)
   - Zen 追踪指标 → Task 2 (ScoreManager)
   - 6 合 1 特效 → Task 4 (AnimateManager) + Task 5 (Renderer)
   - 双模式共存 → Task 6 (UISystem) + Task 9 (main.js)
   - 响应式 → Task 8 (CSS media queries)

2. **占位符扫描:** 无 TBD/TODO/占位符，所有代码完整可执行

3. **类型一致性:**
   - `ScoreManager.getSummary()` 返回的 `currentChainCount`/`bestMatch`/`vibeText` → UISystem.updateZenIndicators() 消费 ✅
   - GameEngine 发出的事件名 `comboPopup`/`shake`/`lightBurst`/`scoreFloat`/`borderGlow`/`autoShuffle` → main.js 中 on() 监听 ✅
   - `engine._animatorRef` → Renderer 读取 `floatTexts` ✅
   - `CONFIG.EFFECTS.*` / `CONFIG.EFFECT_PARAMS.*` / `CONFIG.ZEN.*` → 各模块引用一致 ✅

---

## 执行顺序

任务按数字顺序执行（1→9），每个任务完成后文件即可独立工作。Task 1 必须先完成（所有依赖 CONFIG），Task 9 最后（聚合所有模块）。
