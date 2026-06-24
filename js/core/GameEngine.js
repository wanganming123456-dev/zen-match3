/**
 * 游戏引擎 - 核心调度器 (逻辑层中枢)
 * 协调 Board、Matcher、Gravity、PowerUp、ScoreManager
 * 管理游戏主循环状态机
 */
class GameEngine {

    constructor() {
        /** @type {Board} */
        this.board = null;
        /** @type {ScoreManager} */
        this.scoreMgr = null;

        /** 当前选中的宝石坐标 {r, c} */
        this.selected = null;

        /** 游戏状态机 */
        this.state = 'idle'; // idle | animating | gameOver

        /** 回调列表 */
        this._listeners = {};
    }

    // ==================== 生命周期 ====================

    /** 初始化新游戏 */
    init(mode, maxMoves, maxTime, targetScore) {
        this.board = new Board(CONFIG.GRID.ROWS, CONFIG.GRID.COLS, CONFIG.GRID.GEM_TYPES);
        this.board.init();
        this.scoreMgr = new ScoreManager(mode, maxMoves, maxTime, targetScore);
        this.selected = null;
        this.state = 'idle';
        // 不重置 _listeners，保留已注册的事件监听
        this._emit('init', this.board);
    }

    /** 开始游戏（启动计时器等） */
    start() {
        if (this.scoreMgr.mode === 'time') {
            this.scoreMgr.startTimer(
                (t) => this._emit('tick', t),
                () => this._onGameOver()
            );
        }
        this._emit('start');
    }

    /** 销毁（保留事件监听器） */
    destroy() {
        if (this.scoreMgr) {
            this.scoreMgr.stopTimer();
            this.scoreMgr = null;
        }
        this.board = null;
        // 不重置 _listeners，保留已注册的事件监听
    }

    // ==================== 输入处理 ====================

    /**
     * 选中一个宝石（外部调用）
     * @param {number} row
     * @param {number} col
     */
    selectGem(row, col) {
        if (!this.board || !this.board.inBounds(row, col)) return;
        const gem = this.board.get(row, col);
        if (!gem) return;
        this.selected = { r: row, c: col };
        this._emit('select', row, col);
        this._emit('audioSelect');
    }

    /** 取消选中 */
    deselectGem() {
        this.selected = null;
        this._emit('deselect');
    }

    /**
     * 设置拖拽悬停提示
     * @param {number} row
     * @param {number} col
     */
    setDragHint(row, col) {
        this._emit('dragHint', row, col);
    }

    /**
     * 处理玩家点击尝试交换
     * @param {number} row - 第二个格子的行
     * @param {number} col - 第二个格子的列
     * @returns {object} 操作反馈
     */
    handleClick(row, col) {
        if (this.state !== 'idle') return { action: 'blocked', reason: this.state };
        if (!this.board.inBounds(row, col)) return { action: 'blocked', reason: 'out_of_bounds' };

        const gem = this.board.get(row, col);
        if (!gem) return { action: 'blocked', reason: 'empty' };

        if (!this.selected) {
            this.selectGem(row, col);
            return { action: 'selected', row, col };
        }

        const sel = this.selected;
        this.selected = null;

        // 点击同一个 → 取消选中
        if (sel.r === row && sel.c === col) {
            this.deselectGem();
            return { action: 'deselected' };
        }

        // 不相邻 → 重新选择
        if (!this._isAdjacent(sel.r, sel.c, row, col)) {
            this.selectGem(row, col);
            return { action: 'reselect', row, col };
        }

        // 相邻 → 执行交换
        this._emit('audioSwap');
        this._trySwap(sel.r, sel.c, row, col);
        return { action: 'swap', from: { r: sel.r, c: sel.c }, to: { r: row, c: col } };
    }

    /** 判断两格是否相邻 */
    _isAdjacent(r1, c1, r2, c2) {
        return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
    }

    // ==================== 核心交换逻辑 ====================

    /**
     * 尝试交换两个宝石
     */
    _trySwap(r1, c1, r2, c2) {
        this.state = 'animating';

        // 执行交换（逻辑层先交换）
        this.board.swap(r1, c1, r2, c2);

        // 检测匹配
        const matches = Matcher.findAllMatches(this.board);

        if (matches.length === 0) {
            // 无效交换 → 不消耗步数，播放弹回动画
            this._emit('invalidSwap', r1, c1, r2, c2);
            setTimeout(() => {
                this.board.swap(r1, c1, r2, c2); // 换回来
                this._emit('bounceBack', r1, c1, r2, c2);
                this.state = 'idle';
                this._checkGameOver();
            }, CONFIG.ANIM.BOUNCE_SPEED);
            return;
        }

        // 有效交换
        const isZen = this.scoreMgr.mode === 'zen';
        if (!isZen) {
            this.scoreMgr.useMove();
        }
        this._emit('validSwap', r1, c1, r2, c2);
        this._emit('scoreUpdate', this.scoreMgr.getSummary());
        setTimeout(() => this._processMatches(matches), CONFIG.ANIM.SWAP_SPEED);
    }

    // ==================== 消除处理循环 ====================

    /**
     * 递归处理消除 → 道具 → 掉落 → 再检测的完整循环
     */
    _processMatches(matches) {
        if (matches.length === 0) {
            // 没有更多匹配 → 回到空闲
            this.scoreMgr.currentChainCount = 0;
            this.scoreMgr.resetCombo();
            this._emit('scoreUpdate', this.scoreMgr.getSummary());
            this.state = 'idle';
            this._checkGameOver();
            this._emit('idle');
            return;
        }

        // 连消计数
        this.scoreMgr.incrementCombo();

        // 收集数据：消除坐标、分数、道具
        let roundScore = 0;
        const allCoords = new Set();
        const powerUpsGenerated = [];

        for (const group of matches) {
            roundScore += this.scoreMgr.calcScore(group);
            for (const c of group.cells) {
                allCoords.add(`${c.r},${c.c}`);
            }

            // 检测并触发道具
            for (const c of group.cells) {
                if (c.gem && c.gem.isPowerUp) {
                    const affected = PowerUpSystem.trigger(
                        c.gem, this.board, c.r, c.c
                    );
                    affected.forEach(a => allCoords.add(`${a.r},${a.c}`));
                }
            }

            // 根据匹配形状生成新道具
            const powerUp = PowerUpSystem.createPowerUpForMatch(group, this.board);
            if (powerUp) {
                powerUpsGenerated.push(powerUp);
            }
        }

        this.scoreMgr.addEliminated(allCoords.size);
        this.scoreMgr.recordElimination(allCoords.size);
        this.scoreMgr.addScore(roundScore);
        this._emit('scoreUpdate', this.scoreMgr.getSummary());

        // 发出消除事件（先构建 eliminatedCoords）
        const eliminatedCoords = Array.from(allCoords).map(s => {
            const [r, c] = s.split(',').map(Number);
            return { r, c };
        });
        this._emit('eliminate', eliminatedCoords);

        // 触发特效事件（在 eliminatedCoords 定义之后）
        const comboLevel = this.scoreMgr.comboCount;
        if (comboLevel >= CONFIG.EFFECT_PARAMS.COMBO_POP_MIN_LEVEL) {
            this._emit('comboPopup', { level: comboLevel, coords: eliminatedCoords });
        }
        this._emit('shake', { count: allCoords.size, comboLevel: comboLevel });
        this._emit('lightBurst', { coords: eliminatedCoords, gemType: matches[0]?.gemType ?? 0 });
        this._emit('scoreFloat', { score: roundScore, coords: eliminatedCoords, comboLevel: comboLevel });
        this._emit('borderGlow', { comboLevel: comboLevel });

        // 音效事件
        this._emit('audioEliminate', { count: allCoords.size });
        if (comboLevel >= 2) this._emit('audioCombo', { level: comboLevel });
        this._emit('checkAchievement', { chain: this.scoreMgr.maxChainEver });

        // 从棋盘移除
        for (const coord of eliminatedCoords) {
            this.board.remove(coord.r, coord.c);
        }

        // 等待消除动画 → 放置道具 + 掉落
        setTimeout(() => {
            // 在空位放置新道具
            for (const pu of powerUpsGenerated) {
                const target = this._findEmptyNear(pu.row, pu.col);
                if (target) {
                    pu.row = target.r;
                    pu.col = target.c;
                    this.board.set(target.r, target.c, pu);
                }
            }

            // 执行掉落
            const fallResult = Gravity.apply(this.board);
            this._emit('fall', fallResult);

            // 等待掉落动画 → 再次检测匹配
            const fallTime = fallResult.totalAnimTime() || 50;
            setTimeout(() => {
                const newMatches = Matcher.findAllMatches(this.board);
                this._processMatches(newMatches);
            }, fallTime + 50);
        }, CONFIG.ANIM.EXPLODE_SPEED + 50);
    }

    /** 在目标位置附近找空位 */
    _findEmptyNear(row, col) {
        if (this.board.inBounds(row, col) && !this.board.get(row, col)) {
            return { r: row, c: col };
        }
        // 螺旋搜索最近空位
        for (let d = 1; d < this.board.rows; d++) {
            for (let dr = -d; dr <= d; dr++) {
                for (let dc = -d; dc <= d; dc++) {
                    if (Math.abs(dr) !== d && Math.abs(dc) !== d) continue;
                    const rr = row + dr;
                    const cc = col + dc;
                    if (this.board.inBounds(rr, cc) && !this.board.get(rr, cc)) {
                        return { r: rr, c: cc };
                    }
                }
            }
        }
        return null;
    }

    /** 检查游戏结束条件 */
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
                    this.board.init();
                    this._emit('boardReset');
                    // 确保新棋盘有可行移动
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

    /** 检查棋盘是否还有可行的交换 */
    _hasPossibleMove() {
        for (let r = 0; r < this.board.rows; r++) {
            for (let c = 0; c < this.board.cols; c++) {
                // 尝试水平交换
                if (c + 1 < this.board.cols) {
                    this.board.swap(r, c, r, c + 1);
                    if (Matcher.hasAnyMatch(this.board)) {
                        this.board.swap(r, c, r, c + 1); // 恢复
                        return true;
                    }
                    this.board.swap(r, c, r, c + 1); // 恢复
                }
                // 尝试垂直交换
                if (r + 1 < this.board.rows) {
                    this.board.swap(r, c, r + 1, c);
                    if (Matcher.hasAnyMatch(this.board)) {
                        this.board.swap(r, c, r + 1, c); // 恢复
                        return true;
                    }
                    this.board.swap(r, c, r + 1, c); // 恢复
                }
            }
        }
        return false;
    }

    _onGameOver() {
        this.state = 'gameOver';
        this.scoreMgr.stopTimer();
        this._emit('gameOver', this.scoreMgr.getSummary());
    }

    // ==================== 事件系统 ====================

    on(event, fn) {
        if (!this._listeners[event]) this._listeners[event] = [];
        this._listeners[event].push(fn);
    }

    off(event, fn) {
        if (!this._listeners[event]) return;
        this._listeners[event] = this._listeners[event].filter(f => f !== fn);
    }

    /** 公开的事件触发（供外部模块使用） */
    emit(event, ...args) {
        this._emit(event, ...args);
    }

    _emit(event, ...args) {
        if (!this._listeners[event]) return;
        for (const fn of this._listeners[event]) {
            try { fn(...args); } catch (e) {
                console.error(`[GameEngine] 事件 ${event} 出错:`, e);
            }
        }
    }
}
