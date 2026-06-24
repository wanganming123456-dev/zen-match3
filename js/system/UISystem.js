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
        if (this.el.zenHud) {
            this.el.zenHud.style.display = isZen ? '' : 'none';
        }
        if (this.el.challengeHud) {
            this.el.challengeHud.style.display = isZen ? 'none' : '';
        }
        if (this.el.btnNew) {
            this.el.btnNew.textContent = isZen ? '🔄 换一局' : '🔄 新游戏';
        }
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
        // 更新 localStorage 记录
        if (summary.score > 0 || summary.totalEliminated > 0) {
            StorageManager.setMax(StorageManager.KEYS.bestScore, summary.score);
            StorageManager.setMax(StorageManager.KEYS.bestChain, summary.maxChainEver || 0);
            StorageManager.setMax(StorageManager.KEYS.bestVibe, summary.vibe || 0);
            StorageManager.add(StorageManager.KEYS.totalCleared, summary.totalEliminated || 0);
            this._updateRecordsPanel();
        }
    }

    /** 更新成绩面板 */
    updateRecordsPanel() { this._updateRecordsPanel(); }

    _updateRecordsPanel() {
        const r = StorageManager.getAllRecords();
        if (this.el.recChain) this.el.recChain.textContent = r.bestChain;
        if (this.el.recScore) this.el.recScore.textContent = r.bestScore;
        if (this.el.recCleared) this.el.recCleared.textContent = r.totalCleared;
        const vibeLabels = ['','calm ✦','nice ✦✦','feeling it ✦✦✦','on fire ✦✦✦✦','transcendent ✦✦✦✦✦'];
        if (this.el.recVibe) this.el.recVibe.textContent = vibeLabels[r.bestVibe] || '-';
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
        this.updateZenIndicators({
            currentChainCount: summary.currentChainCount,
            bestMatch: summary.bestMatch,
            vibeText: summary.vibeText
        });
    }
}
