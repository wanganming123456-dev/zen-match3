/**
 * 动画管理器 - 控制宝石交换、弹回、掉落等补间动画
 * 在渲染层和逻辑层之间起桥梁作用
 */
class AnimateManager {

    constructor(engine) {
        this.engine = engine;
        this._tweens = [];       // 活动补间列表
        // 屏幕微震状态
        this._shakeIntensity = 0;
        this._shakeElapsed = 0;
        this._shakeDuration = 0;
        this._shakeOffsetX = 0;
        this._shakeOffsetY = 0;
        // 分数飘字列表
        this.floatTexts = [];
    }

    /**
     * 添加补间动画
     * @param {object} target - 要动画的对象 (Gem)
     * @param {object} props - 目标属性 { animX, animY, alpha, scale }
     * @param {number} duration - 时长 (ms)
     * @param {string} [easing='easeOut'] - 缓动函数
     * @param {Function} [onComplete] - 完成回调
     */
    tween(target, props, duration, easing, onComplete) {
        // 防 NaN：确保属性值有效
        const safe = (v, fallback) => (isFinite(v) ? v : fallback);
        const tw = {
            target,
            start: {
                animX: safe(target.animX, 0),
                animY: safe(target.animY, 0),
                alpha: safe(target.alpha, 1),
                scale: safe(target.scale, 1)
            },
            end: {
                animX: 'animX' in props ? safe(props.animX, 0) : safe(target.animX, 0),
                animY: 'animY' in props ? safe(props.animY, 0) : safe(target.animY, 0),
                alpha: 'alpha' in props ? safe(props.alpha, 1) : safe(target.alpha, 1),
                scale: 'scale' in props ? safe(props.scale, 1) : safe(target.scale, 1)
            },
            duration: Math.max(1, duration || 100),
            elapsed: 0,
            easing: easing || 'easeOut',
            onComplete: onComplete || null
        };
        this._tweens.push(tw);
    }

    /**
     * 创建交换动画
     */
    animateSwap(gem1, gem2, onComplete) {
        const cs = CONFIG.GRID.CELL_SIZE;
        const dx = (gem2.col - gem1.col) * cs;
        const dy = (gem2.row - gem1.row) * cs;

        this.tween(gem1, { animX: dx, animY: dy }, CONFIG.ANIM.SWAP_SPEED, 'easeInOut');
        this.tween(gem2, { animX: -dx, animY: -dy }, CONFIG.ANIM.SWAP_SPEED, 'easeInOut', onComplete);
    }

    /**
     * 创建弹回动画（无效交换）
     */
    animateBounceBack(gem1, gem2, onComplete) {
        const cs = CONFIG.GRID.CELL_SIZE;
        const dx = (gem2.col - gem1.col) * cs;
        const dy = (gem2.row - gem1.row) * cs;

        // 先移到交换位置（已由 animateSwap 处理），再弹回
        gem1.animX = dx;
        gem1.animY = dy;
        gem2.animX = -dx;
        gem2.animY = -dy;

        this.tween(gem1, { animX: 0, animY: 0 }, CONFIG.ANIM.BOUNCE_SPEED, 'easeOutBack');
        this.tween(gem2, { animX: 0, animY: 0 }, CONFIG.ANIM.BOUNCE_SPEED, 'easeOutBack', onComplete);
    }

    /**
     * 创建掉落动画
     */
    animateFall(fallResult, onComplete) {
        const cs = CONFIG.GRID.CELL_SIZE;
        let maxDuration = 0;

        for (const drop of fallResult.dropped) {
            const dist = drop.distance * cs;
            drop.gem.animY = -dist;
            const dur = drop.distance * CONFIG.ANIM.FALL_SPEED;
            if (dur > maxDuration) maxDuration = dur;

            this.tween(drop.gem, { animY: 0 }, dur, 'easeInQuad');
        }

        for (const spawn of fallResult.spawned) {
            const dist = Math.abs(spawn.targetRow - spawn.fallFromRow) * cs;
            spawn.gem.animY = -dist;
            spawn.gem.alpha = 0;
            const dur = Math.abs(spawn.targetRow - spawn.fallFromRow) * CONFIG.ANIM.FALL_SPEED;
            if (dur > maxDuration) maxDuration = dur;

            this.tween(spawn.gem, { animY: 0, alpha: 1 }, dur, 'easeInQuad');
        }

        if (onComplete) {
            setTimeout(onComplete, maxDuration + 30);
        }
    }

    /**
     * 消除缩放消失动画
     */
    animateEliminate(coords, board, onComplete) {
        for (const coord of coords) {
            const gem = board.get(coord.r, coord.c);
            if (gem) {
                this.tween(gem, { scale: 0, alpha: 0 }, CONFIG.ANIM.EXPLODE_SPEED, 'easeOut');
            }
        }

        if (onComplete) {
            setTimeout(onComplete, CONFIG.ANIM.EXPLODE_SPEED + 20);
        }
    }

    /**
     * 每帧更新
     * @param {number} dt - 距上帧秒数
     */
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

        // 更新分数飘字
        for (let i = this.floatTexts.length - 1; i >= 0; i--) {
            const ft = this.floatTexts[i];
            ft.life -= dt * (1000 / CONFIG.EFFECT_PARAMS.SCORE_FLOAT_DURATION);
            if (ft.life <= 0) {
                this.floatTexts.splice(i, 1);
                continue;
            }
            ft.y = ft.startY - (1 - ft.life) * CONFIG.EFFECT_PARAMS.SCORE_FLOAT_RISE;
        }

        // 原有 tween 更新逻辑
        for (let i = this._tweens.length - 1; i >= 0; i--) {
            const tw = this._tweens[i];
            tw.elapsed += dt * 1000;

            const progress = Math.min(tw.elapsed / tw.duration, 1);
            const eased = this._ease(progress, tw.easing);

            // 插值（防 NaN）
            if (isFinite(tw.start.animX) && isFinite(tw.end.animX)) tw.target.animX = tw.start.animX + (tw.end.animX - tw.start.animX) * eased;
            if (isFinite(tw.start.animY) && isFinite(tw.end.animY)) tw.target.animY = tw.start.animY + (tw.end.animY - tw.start.animY) * eased;
            if (isFinite(tw.start.alpha) && isFinite(tw.end.alpha)) tw.target.alpha = tw.start.alpha + (tw.end.alpha - tw.start.alpha) * eased;
            if (isFinite(tw.start.scale) && isFinite(tw.end.scale)) tw.target.scale = tw.start.scale + (tw.end.scale - tw.start.scale) * eased;

            // 完成
            if (progress >= 1) {
                tw.target.animX = tw.end.animX;
                tw.target.animY = tw.end.animY;
                tw.target.alpha = tw.end.alpha;
                tw.target.scale = tw.end.scale;
                if (tw.onComplete) tw.onComplete();
                this._tweens.splice(i, 1);
            }
        }
    }

    /** 触发屏幕微震 */
    triggerShake(intensity, duration) {
        this._shakeIntensity = Math.max(this._shakeIntensity, intensity);
        this._shakeDuration = duration || CONFIG.EFFECT_PARAMS.SHAKE_DURATION;
        this._shakeElapsed = 0;
    }

    /** 添加分数飘字 */
    addFloatText(x, y, text, color) {
        this.floatTexts.push({
            x: x + (Math.random() - 0.5) * 40,
            y: y,
            text: text,
            color: color || '#FFD700',
            life: 1,
            startY: y
        });
        if (this.floatTexts.length > 50) {
            this.floatTexts.shift();
        }
    }

    /** 清理所有动画 */
    clear() {
        this._tweens = [];
        this.floatTexts = [];
        this._shakeIntensity = 0;
        this._shakeOffsetX = 0;
        this._shakeOffsetY = 0;
    }

    // ========== 缓动函数 ==========

    _ease(t, type) {
        switch (type) {
            case 'easeInQuad': return t * t;
            case 'easeOut': return 1 - Math.pow(1 - t, 3);
            case 'easeInOut': return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            case 'easeOutBack': {
                const c1 = 1.70158;
                const c3 = c1 + 1;
                return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
            }
            default: return t;
        }
    }
}
