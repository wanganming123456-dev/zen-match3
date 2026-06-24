/**
 * 输入管理器 - 处理鼠标和触摸事件
 */
class InputManager {

    constructor(canvas, engine) {
        this.canvas = canvas;
        this.engine = engine;
        this._dragStart = null;
        this._isDragging = false;
        this._bound = {};
        this._bind();
    }

    _bind() {
        this._bound.md = (e) => this._onDown(e);
        this._bound.mu = (e) => this._onUp(e);
        this._bound.mm = (e) => this._onMove(e);
        this.canvas.addEventListener('mousedown', this._bound.md);
        this.canvas.addEventListener('mouseup', this._bound.mu);
        this.canvas.addEventListener('mousemove', this._bound.mm);
        this.canvas.addEventListener('mouseleave', this._bound.mu);

        this._bound.ts = (e) => { if (e.touches.length !== 1) return; const t = e.touches[0]; const p = this._toGrid(t.clientX, t.clientY); if (!this.engine.board || !this.engine.board.inBounds(p.row, p.col)) return; this._dragStart = p; this._isDragging = false; e.preventDefault(); };
        this._bound.te = (e) => { if (!this._dragStart) return; if (!this._isDragging) { this.engine.handleClick(this._dragStart.row, this._dragStart.col); } else { const t = e.changedTouches[0]; const p = t ? this._toGrid(t.clientX, t.clientY) : this._dragStart; if (this.engine.board && this.engine.board.inBounds(p.row, p.col)) { this.engine.selectGem(this._dragStart.row, this._dragStart.col); this.engine.handleClick(p.row, p.col); } } this._dragStart = null; this._isDragging = false; this.engine.setDragHint(-1, -1); };
        this._bound.tm = (e) => { if (!this._dragStart || e.touches.length !== 1) return; const t = e.touches[0]; const dx = t.clientX - this._dragStart.x; const dy = t.clientY - this._dragStart.y; if (!this._isDragging && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) this._isDragging = true; if (this._isDragging) { e.preventDefault(); let dr = 0, dc = 0; if (Math.abs(dx) > CONFIG.GRID.CELL_SIZE * 0.4) dc = dx > 0 ? 1 : -1; if (Math.abs(dy) > CONFIG.GRID.CELL_SIZE * 0.4) dr = dy > 0 ? 1 : -1; this.engine.setDragHint(this._dragStart.row + dr, this._dragStart.col + dc); } };

        this.canvas.addEventListener('touchstart', this._bound.ts, { passive: false });
        this.canvas.addEventListener('touchend', this._bound.te);
        this.canvas.addEventListener('touchmove', this._bound.tm, { passive: false });
        this.canvas.addEventListener('touchcancel', this._bound.te);
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    }

    // 坐标转换：clientX/Y → {row, col, x, y}
    _toGrid(cx, cy) {
        const r = this.canvas.getBoundingClientRect();
        // canvas.width 已含 DPR，CSS 尺寸 = rect.width
        // Renderer 用 setTransform(dpr,...) 在逻辑 552×552 空间绘制
        // 所以坐标也要用逻辑空间：CSS px / CSS宽 × 552
        const sx = CONFIG.CANVAS.WIDTH / r.width;
        const sy = CONFIG.CANVAS.HEIGHT / r.height;
        const x = (cx - r.left) * sx;
        const y = (cy - r.top) * sy;
        const col = Math.floor((x - CONFIG.CANVAS.PADDING) / CONFIG.GRID.CELL_SIZE);
        const row = Math.floor((y - CONFIG.CANVAS.PADDING) / CONFIG.GRID.CELL_SIZE);
        return { row, col, x, y };
    }

    _onDown(e) {
        const p = this._toGrid(e.clientX, e.clientY);
        if (!this.engine.board || !this.engine.board.inBounds(p.row, p.col)) return;
        this._dragStart = p;
        this._isDragging = false;
    }

    _onUp(e) {
        if (!this._dragStart) return;
        if (this._isDragging) {
            const p = this._toGrid(e.clientX, e.clientY);
            if (this.engine.board && this.engine.board.inBounds(p.row, p.col)) {
                this.engine.selectGem(this._dragStart.row, this._dragStart.col);
                this.engine.handleClick(p.row, p.col);
            } else {
                this.engine.handleClick(this._dragStart.row, this._dragStart.col);
            }
        } else {
            this.engine.handleClick(this._dragStart.row, this._dragStart.col);
        }
        this._dragStart = null;
        this._isDragging = false;
        this.engine.setDragHint(-1, -1);
    }

    _onMove(e) {
        if (!this._dragStart) return;
        // 拖拽距离判断（_toGrid 返回的 x 是逻辑坐标，
        // 需要与 clientX 统一坐标系，直接用原始 clientX 差值）
        const rawStart = {
            cx: this.canvas.getBoundingClientRect().left + CONFIG.CANVAS.PADDING + this._dragStart.c * CONFIG.GRID.CELL_SIZE + CONFIG.GRID.CELL_SIZE / 2
        };
        // 用 canvas-relative 坐标比较更简单
        const r = this.canvas.getBoundingClientRect();
        const dx = e.clientX - (r.left + CONFIG.CANVAS.PADDING + this._dragStart.c * CONFIG.GRID.CELL_SIZE + CONFIG.GRID.CELL_SIZE / 2);
        const dy = e.clientY - (r.top + CONFIG.CANVAS.PADDING + this._dragStart.r * CONFIG.GRID.CELL_SIZE + CONFIG.GRID.CELL_SIZE / 2);
        if (!this._isDragging && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) this._isDragging = true;
        if (this._isDragging) {
            let dr = 0, dc = 0;
            if (Math.abs(dx) > CONFIG.GRID.CELL_SIZE * 0.4) dc = dx > 0 ? 1 : -1;
            if (Math.abs(dy) > CONFIG.GRID.CELL_SIZE * 0.4) dr = dy > 0 ? 1 : -1;
            this.engine.setDragHint(this._dragStart.row + dr, this._dragStart.col + dc);
        }
    }

    destroy() {
        this.canvas.removeEventListener('mousedown', this._bound.md);
        this.canvas.removeEventListener('mouseup', this._bound.mu);
        this.canvas.removeEventListener('mousemove', this._bound.mm);
        this.canvas.removeEventListener('mouseleave', this._bound.mu);
        this.canvas.removeEventListener('touchstart', this._bound.ts);
        this.canvas.removeEventListener('touchend', this._bound.te);
        this.canvas.removeEventListener('touchmove', this._bound.tm);
        this.canvas.removeEventListener('touchcancel', this._bound.te);
    }
}
