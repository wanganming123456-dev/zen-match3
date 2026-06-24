/**
 * Zen 消消乐 - 主入口文件
 * 默认启动 Zen 模式，支持 Zen / Challenge 双模式切换
 * 6 合 1 特效事件桥接
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
        gameOverDetail: document.getElementById('gameOverDetail'),
        // v1.3 成绩面板
        recChain: document.getElementById('recChain'),
        recScore: document.getElementById('recScore'),
        recCleared: document.getElementById('recCleared'),
        recVibe: document.getElementById('recVibe')
    };

    // ========== 核心模块初始化 ==========
    const engine = new GameEngine();
    const renderer = new Renderer(canvas, engine);
    const animator = new AnimateManager(engine);
    const inputMgr = new InputManager(canvas, engine);
    const uiSystem = new UISystem(engine, elements);
    const audio = new AudioManager();
    const achievements = AchievementManager;

    // 让 Renderer 可以访问 AnimateManager 的浮字数据
    engine._animatorRef = animator;

    // ========== 游戏主循环 ==========
    let lastTime = performance.now();
    let currentMode = 'zen';

    function gameLoop(timestamp) {
        const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
        lastTime = timestamp;

        // 防护：渲染异常不中断循环
        try {
            animator.update(dt);
            renderer.render(dt);

            // 应用边框辉光到 canvas-wrapper
            if (canvasWrapper) {
                const glowLevel = renderer._borderGlowLevel;
                canvasWrapper.classList.remove('glow-mid', 'glow-hi');
                if (glowLevel >= 5) {
                    canvasWrapper.classList.add('glow-hi');
                } else if (glowLevel >= 3) {
                    canvasWrapper.classList.add('glow-mid');
                }
            }

            // 应用屏幕微震偏移到 canvas-wrapper
            if (canvasWrapper) {
                if (animator._shakeIntensity > 0) {
                    canvasWrapper.style.transform =
                        'translate(' + animator._shakeOffsetX + 'px, ' + animator._shakeOffsetY + 'px)';
                } else {
                    canvasWrapper.style.transform = '';
                }
            }

            // 心跳帧计数器（自动恢复检测）
            window.__frameCount = (window.__frameCount || 0) + 1;
        } catch (e) {
            console.error('[游戏循环异常]', e);
            // 异常不中断循环
        }

        requestAnimationFrame(gameLoop);
    }

    // ========== 启动/重启游戏 ==========
    function startGame(mode) {
        // 保存当前局的成绩（Zen 模式下 gameOver 不会触发，在这里存）
        saveCurrentRecords();

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

    function saveCurrentRecords() {
        if (!engine.scoreMgr) return;
        const s = engine.scoreMgr.getSummary();
        if (s.score > 0 || s.totalEliminated > 0) {
            StorageManager.setMax(StorageManager.KEYS.bestScore, s.score);
            StorageManager.setMax(StorageManager.KEYS.bestChain, s.maxChainEver || 0);
            StorageManager.setMax(StorageManager.KEYS.bestVibe, s.vibe || 0);
            StorageManager.add(StorageManager.KEYS.totalCleared, s.totalEliminated || 0);
            uiSystem.updateRecordsPanel();
        }
    }

    function updateHudVisibility() {
        const isZen = currentMode === 'zen';
        if (elements.zenHud) elements.zenHud.style.display = isZen ? '' : 'none';
        if (elements.challengeHud) elements.challengeHud.style.display = isZen ? 'none' : '';
        if (elements.timePanel) {
            elements.timePanel.style.display =
                (!isZen && currentMode === 'time') ? '' : 'none';
        }
        if (elements.movesPanel) {
            elements.movesPanel.style.display =
                (!isZen && currentMode === 'time') ? 'none' : '';
        }
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

    engine.on('validSwap', () => {
        // 交换已生效，后续特效事件处理
    });

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

    // ========== 6 合 1 特效事件桥接 ==========

    // 1. 连击大字弹出
    engine.on('comboPopup', (data) => {
        if (CONFIG.EFFECTS.COMBO_POPUP) {
            renderer.addComboPopup(data.level);
        }
    });

    // 2. 屏幕微震
    engine.on('shake', (data) => {
        if (CONFIG.EFFECTS.SCREEN_SHAKE && (data.count >= 4 || data.comboLevel >= 3)) {
            animator.triggerShake(
                CONFIG.EFFECT_PARAMS.SHAKE_INTENSITY,
                CONFIG.EFFECT_PARAMS.SHAKE_DURATION
            );
        }
    });

    // 3. 光波扩散
    engine.on('lightBurst', (data) => {
        if (CONFIG.EFFECTS.LIGHT_BURST && data.coords.length > 0) {
            const center = data.coords[Math.floor(data.coords.length / 2)];
            const gemCfg = CONFIG.GEMS[data.gemType] || CONFIG.GEMS[0];
            renderer.addLightBurst(center.r, center.c, gemCfg.glow);
        }
    });

    // 4. 分数飘字
    engine.on('scoreFloat', (data) => {
        if (CONFIG.EFFECTS.SCORE_FLOAT && data.coords.length > 0) {
            const center = data.coords[Math.floor(data.coords.length / 2)];
            const p = CONFIG.CANVAS.PADDING;
            const cs = CONFIG.GRID.CELL_SIZE;
            const cx = p + center.c * cs + cs / 2;
            const cy = p + center.r * cs + cs / 2;
            animator.addFloatText(
                cx, cy,
                `+${data.score}`,
                data.comboLevel >= 3 ? '#FFD700' : '#93C5FD'
            );
        }
    });

    // 5. 边框辉光
    engine.on('borderGlow', (data) => {
        if (CONFIG.EFFECTS.BORDER_GLOW) {
            renderer.setBorderGlowLevel(data.comboLevel);
        }
    });

    // 6. 自动洗牌提示
    engine.on('autoShuffle', (text) => {
        renderer.addShuffleText(text);
    });

    engine.on('boardReset', () => {
        renderer.setBorderGlowLevel(0);
    });

    // ========== v1.3 音效 + 成就事件桥接 ==========

    engine.on('audioSelect', () => audio.select());
    engine.on('audioSwap', () => audio.swap());
    engine.on('invalidSwap', () => audio.invalidSwap());
    engine.on('audioEliminate', (d) => audio.eliminate(d.count));
    engine.on('audioCombo', (d) => audio.combo(d.level));

    engine.on('checkAchievement', (data) => {
        const unlocked = achievements.check(data.chain);
        if (unlocked.length === 0) return;
        const ms = unlocked[0]; // 取最高级别
        const isFirst = !StorageManager.hasAchievement(ms.id);
        StorageManager.addAchievement(ms.id);

        if (isFirst) {
            // 首次达成 → 弹窗庆祝
            showAchievePopup(ms);
            audio.milestone();
        } else {
            // 重复达成 → 横幅
            showAchieveBanner(ms);
        }
        // 更新成绩面板中的成就列表
        uiSystem.updateRecordsPanel();
    });

    function showAchieveBanner(ms) {
        const banner = document.getElementById('achieveBanner');
        const icon = document.getElementById('bannerIcon');
        const text = document.getElementById('bannerText');
        if (!banner || !icon || !text) return;
        icon.textContent = ms.icon;
        text.textContent = ms.title + ' (' + ms.chain + ' 连消)';
        banner.classList.add('show');
        clearTimeout(banner._timeout);
        banner._timeout = setTimeout(() => banner.classList.remove('show'), 2500);
    }

    function showAchievePopup(ms) {
        const overlay = document.getElementById('achieveOverlay');
        if (!overlay) return;
        document.getElementById('achieveIcon').textContent = ms.icon;
        document.getElementById('achieveTitle').textContent = ms.title;
        document.getElementById('achieveDesc').textContent = ms.desc;
        overlay.classList.add('show');
        setTimeout(() => overlay.classList.remove('show'), 2500);
        // 粒子雨效果
        for (let i = 0; i < 40; i++) {
            setTimeout(() => {
                const r = Math.floor(Math.random() * 8);
                const c = Math.floor(Math.random() * 8);
                renderer.spawnParticles(r, c, '#FFD700');
            }, i * 30);
        }
    }

    // ========== 成绩面板事件 ==========
    const btnRecords = document.getElementById('btnRecords');
    const recordsPanel = document.getElementById('recordsPanel');
    const btnRecordsClose = document.getElementById('btnRecordsClose');
    if (btnRecords && recordsPanel) {
        btnRecords.addEventListener('click', () => {
            recordsPanel.classList.toggle('open');
            uiSystem.updateRecordsPanel();
        });
    }
    if (btnRecordsClose && recordsPanel) {
        btnRecordsClose.addEventListener('click', () => recordsPanel.classList.remove('open'));
    }
    // 点击面板外关闭
    document.addEventListener('click', (e) => {
        if (recordsPanel && recordsPanel.classList.contains('open') &&
            !recordsPanel.contains(e.target) && e.target !== btnRecords) {
            recordsPanel.classList.remove('open');
        }
    });

    // 初始化时刷新成绩面板
    uiSystem.updateRecordsPanel();

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

    // 诊断日志
    const dbg = document.getElementById('gameCanvas');
    const dbgRect = dbg.getBoundingClientRect();
    console.log('🧘 Zen 消消乐已启动');
    console.log('   Canvas内部=' + dbg.width + 'x' + dbg.height +
                ' CSS=' + Math.round(dbgRect.width) + 'x' + Math.round(dbgRect.height) +
                ' DPR=' + window.devicePixelRatio);
    console.log('   棋盘: ' + CONFIG.GRID.ROWS + 'x' + CONFIG.GRID.COLS + ' | 深海幽蓝主题');
    console.log('   点击宝石选中 → 点击相邻宝石交换 → 3连消除');
    console.log('   如遇到问题，请截图控制台并反馈');

    // 暴露给全局用于调试
    window.__zen = { engine, renderer, animator, inputMgr, uiSystem, startGame };
})();
