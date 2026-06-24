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
        if (this.currentChainCount > this.maxChainEver) {
            this.maxChainEver = this.currentChainCount;
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
