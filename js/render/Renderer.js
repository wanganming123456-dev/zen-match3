/**
 * 画布渲染器 - 负责所有视觉绘制 (Zen 增强版)
 * 包含背景、棋盘网格、宝石绘制、光波扩散、边框辉光、连击大字、粒子系统
 */
class Renderer {

    /**
     * @param {HTMLCanvasElement} canvas
     * @param {GameEngine} engine
     */
    constructor(canvas, engine) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.engine = engine;

        // 计算视口尺寸
        this.viewWidth = CONFIG.CANVAS.WIDTH;
        this.viewHeight = CONFIG.CANVAS.HEIGHT;

        // 高 DPI 适配
        this._setupHiDPI();

        // 动画状态
        this._selectedRow = -1;
        this._selectedCol = -1;
        this._dragTargetRow = -1;
        this._dragTargetCol = -1;

        /** 活动粒子 */
        this.particles = [];

        /** 光波扩散环 */
        this.lightBursts = [];

        /** 连击大字弹出 / 洗牌提示 */
        this.comboPopups = [];

        /** 边框辉光级别 */
        this._borderGlowLevel = 0;

        /** 边框辉光脉冲相位 */
        this._borderGlowPhase = 0;

        /** 覆盖层文本 */
        this._overlayText = null;
    }

    /** 高 DPI 适配（恢复原始工作代码） */
    _setupHiDPI() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.viewWidth * dpr;
        this.canvas.height = this.viewHeight * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
    }

    // ==================== 主渲染循环 ====================

    /** 每帧调用（由外部 requestAnimationFrame 驱动） */
    render(dt) {
        const ctx = this.ctx;
        const w = this.viewWidth;
        const h = this.viewHeight;

        ctx.save();
        ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);

        ctx.clearRect(0, 0, w, h);

        this._drawBackground(ctx, w, h);
        this._drawGrid(ctx);
        this._drawGems(ctx, dt);
        this._drawSelection(ctx);
        this._drawLightBursts(ctx, dt);
        this._drawParticles(ctx, dt);
        this._drawFloatTexts(ctx);
        this._drawComboPopups(ctx, dt);
        this._updateBorderGlow(dt);
        this._drawOverlay(ctx, w, h);

        ctx.restore();
    }

    // ==================== 背景绘制 ====================

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

    // ==================== 棋盘绘制 ====================

    _drawGrid(ctx) {
        const p = CONFIG.CANVAS.PADDING;
        const cs = CONFIG.GRID.CELL_SIZE;
        const rows = CONFIG.GRID.ROWS;
        const cols = CONFIG.GRID.COLS;

        const gridW = cols * cs;
        const gridH = rows * cs;
        ctx.fillStyle = CONFIG.THEME.GRID_BG;
        this._roundRect(ctx, p - 4, p - 4, gridW + 8, gridH + 8, 8);
        ctx.fill();

        // 单元格底色（棋盘格交替色 - 海洋主题）
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = p + c * cs;
                const y = p + r * cs;
                const even = (r + c) % 2 === 0;
                ctx.fillStyle = even
                    ? 'rgba(59, 130, 246, 0.04)'
                    : 'rgba(0, 0, 0, 0.15)';
                ctx.fillRect(x, y, cs, cs);
            }
        }

        // 网格线
        ctx.strokeStyle = CONFIG.THEME.GRID_LINE;
        ctx.lineWidth = 0.5;
        for (let r = 0; r <= rows; r++) {
            ctx.beginPath();
            ctx.moveTo(p, p + r * cs);
            ctx.lineTo(p + gridW, p + r * cs);
            ctx.stroke();
        }
        for (let c = 0; c <= cols; c++) {
            ctx.beginPath();
            ctx.moveTo(p + c * cs, p);
            ctx.lineTo(p + c * cs, p + gridH);
            ctx.stroke();
        }
    }

    // ==================== 宝石绘制 ====================

    _drawGems(ctx, dt) {
        const board = this.engine.board;
        if (!board) return;

        const p = CONFIG.CANVAS.PADDING;
        const cs = CONFIG.GRID.CELL_SIZE;

        for (let r = 0; r < board.rows; r++) {
            for (let c = 0; c < board.cols; c++) {
                const gem = board.get(r, c);
                if (!gem) continue;

                const gemCfg = CONFIG.GEMS[gem.type];
                if (!gemCfg) continue;

                const baseX = p + c * cs + cs / 2;
                const baseY = p + r * cs + cs / 2;

                const x = baseX + gem.animX;
                const y = baseY + gem.animY;
                const alpha = Math.max(0, gem.alpha);
                const radius = Math.max(0, gem.scale * cs * 0.42);

                if (alpha <= 0 || radius <= 0 || !isFinite(radius) || !isFinite(alpha)) continue;

                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.translate(x, y);

                // 光晕
                ctx.shadowColor = gemCfg.glow;
                ctx.shadowBlur = 8 * gem.scale;

                // 绘制形状
                ctx.fillStyle = gemCfg.color;
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.lineWidth = 1.5 * gem.scale;

                this._drawGemShape(ctx, gemCfg, radius);

                ctx.shadowBlur = 0;
                ctx.restore();

                // 道具标记
                if (gem.isPowerUp && alpha > 0.3) {
                    this._drawPowerUpBadge(ctx, x, y, gem, cs);
                }
            }
        }
    }

    /** 根据宝石形状绘制 */
    _drawGemShape(ctx, cfg, size) {
        if (!isFinite(size) || size <= 0) return;
        ctx.beginPath();

        switch (cfg.shape) {
            case 'square':
                ctx.rect(-size * 0.72, -size * 0.72, size * 1.44, size * 1.44);
                break;

            case 'circle':
                ctx.arc(0, 0, size * 0.72, 0, Math.PI * 2);
                break;

            case 'triangle':
                for (let i = 0; i < 3; i++) {
                    const angle = -Math.PI / 2 + (Math.PI * 2 / 3) * i;
                    const px = Math.cos(angle) * size * 0.78;
                    const py = Math.sin(angle) * size * 0.78;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                break;

            case 'diamond':
                for (let i = 0; i < 4; i++) {
                    const angle = -Math.PI / 2 + (Math.PI / 2) * i;
                    const px = Math.cos(angle) * size * 0.78;
                    const py = Math.sin(angle) * size * 0.78;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                break;

            case 'hexagon':
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i;
                    const px = Math.cos(angle) * size * 0.68;
                    const py = Math.sin(angle) * size * 0.68;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                break;

            default:
                ctx.arc(0, 0, size * 0.68, 0, Math.PI * 2);
        }

        ctx.fill();
        ctx.stroke();

        // 高光（左上角白色反光）
        const highlightGrad = ctx.createRadialGradient(
            -size * 0.2, -size * 0.25, size * 0.05,
            0, 0, size * 0.7
        );
        highlightGrad.addColorStop(0, 'rgba(255,255,255,0.35)');
        highlightGrad.addColorStop(0.4, 'rgba(255,255,255,0.08)');
        highlightGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = highlightGrad;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.72, 0, Math.PI * 2);
        ctx.fill();
    }

    /** 道具角标 */
    _drawPowerUpBadge(ctx, x, y, gem, cs) {
        const pu = CONFIG.POWER_UPS;
        let cfg = null;
        for (const key of Object.keys(pu)) {
            if (pu[key].id === gem.powerUpType) { cfg = pu[key]; break; }
        }
        if (!cfg) return;

        const badgeR = cs * 0.22;
        const bx = x + cs * 0.3;
        const by = y - cs * 0.3;

        ctx.fillStyle = cfg.color;
        ctx.beginPath();
        ctx.arc(bx, by, badgeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = cfg.color === '#FFF' ? '#333' : '#fff';
        ctx.font = `bold ${badgeR * 1.1}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cfg.icon, bx, by + 0.5);
    }

    // ==================== 选中与高亮 ====================

    _drawSelection(ctx) {
        const p = CONFIG.CANVAS.PADDING;
        const cs = CONFIG.GRID.CELL_SIZE;

        // 当前选中格高亮 - 脉冲金边
        if (this._selectedRow >= 0 && this._selectedCol >= 0) {
            const x = p + this._selectedCol * cs;
            const y = p + this._selectedRow * cs;
            const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 200);
            ctx.save();
            ctx.strokeStyle = CONFIG.THEME.GOLD;
            ctx.lineWidth = 4;
            ctx.shadowColor = CONFIG.THEME.GOLD;
            ctx.shadowBlur = 15 * pulse + 5;
            this._roundRect(ctx, x + 1, y + 1, cs - 2, cs - 2, 6);
            ctx.stroke();
            // 第二层内边
            ctx.strokeStyle = 'rgba(255,255,255,0.6)';
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 0;
            this._roundRect(ctx, x + 4, y + 4, cs - 8, cs - 8, 4);
            ctx.stroke();
            ctx.restore();
        }

        if (this._dragTargetRow >= 0 && this._dragTargetCol >= 0 &&
            (this._dragTargetRow !== this._selectedRow || this._dragTargetCol !== this._selectedCol)) {
            const x = p + this._dragTargetCol * cs;
            const y = p + this._dragTargetRow * cs;
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.45)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(x + 2, y + 2, cs - 4, cs - 4);
            ctx.setLineDash([]);
            ctx.restore();
        }
    }

    // ==================== 粒子系统（强化版） ====================

    /** 在指定位置生成爆炸粒子（数量翻倍 + 旋转） */
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

    _drawParticles(ctx, dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const pt = this.particles[i];
            pt.x += pt.vx * dt;
            pt.y += pt.vy * dt;
            pt.vy += 80 * dt;
            pt.life -= pt.decay * dt;

            if (pt.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = pt.life;
            ctx.fillStyle = pt.color;
            ctx.translate(pt.x, pt.y);
            if (pt.rotation !== undefined) {
                pt.rotation += pt.rotSpeed * dt;
                ctx.rotate(pt.rotation);
            }
            // 方形/圆形混合粒子
            if (i % 2 === 0) {
                ctx.fillRect(-pt.size * pt.life / 2, -pt.size * pt.life / 2,
                              pt.size * pt.life, pt.size * pt.life);
            } else {
                ctx.beginPath();
                ctx.arc(0, 0, pt.size * pt.life, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }

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
        this.comboPopups = this.comboPopups.filter(p => p.type !== 'combo');
        this.comboPopups.push({
            type: 'combo',
            text: `x${level} COMBO!`,
            life: 1,
            duration: CONFIG.EFFECT_PARAMS.COMBO_POP_DURATION / 1000,
            scale: 0
        });
    }

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
                scale = 0.5 + (phase / 0.2) * 0.8;
                alpha = 1;
                offsetY = 0;
            } else if (phase < 0.6) {
                scale = 1.3 - ((phase - 0.2) / 0.4) * 0.3;
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

            if (pop.type === 'shuffle') {
                ctx.font = 'bold 20px "Microsoft YaHei", "PingFang SC", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = 'rgba(99, 102, 241, 0.5)';
                ctx.shadowBlur = 10;
                ctx.fillStyle = CONFIG.THEME.ACCENT_DIM;
            } else {
                ctx.font = 'bold 32px "Microsoft YaHei", "PingFang SC", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = 'rgba(245, 158, 11, 0.7)';
                ctx.shadowBlur = 20;
                ctx.fillStyle = CONFIG.THEME.GOLD;
            }

            ctx.fillText(pop.text, 0, 0);
            ctx.shadowBlur = 0;
            ctx.restore();
        }
    }

    // ==================== 分数飘字渲染 ====================

    _drawFloatTexts(ctx) {
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

    setBorderGlowLevel(level) {
        this._borderGlowLevel = level;
    }

    _updateBorderGlow(dt) {
        this._borderGlowPhase += dt * 3;
    }

    /** 获取外部 CSS 使用的辉光样式 */
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

    // ==================== 覆盖层 ====================

    _drawOverlay(ctx, w, h) {
        if (!this._overlayText) return;

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = CONFIG.THEME.GOLD;
        ctx.font = 'bold 28px "Microsoft YaHei", "PingFang SC", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText(this._overlayText, w / 2, h / 2 - 12);
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ccc';
        ctx.font = '14px "Microsoft YaHei", "PingFang SC", sans-serif';
        ctx.fillText('点击"再来一局"重新开始', w / 2, h / 2 + 28);
        ctx.restore();
    }

    showGameOver(summary) {
        this._overlayText = summary.isWin ? '🎉 恭喜通关！' : '⏰ 游戏结束';
    }

    hideOverlay() {
        this._overlayText = null;
    }

    // ==================== 工具方法 ====================

    setSelection(row, col) {
        this._selectedRow = row;
        this._selectedCol = col;
    }

    setDragTarget(row, col) {
        this._dragTargetRow = row;
        this._dragTargetCol = col;
    }

    _roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
    }
}
