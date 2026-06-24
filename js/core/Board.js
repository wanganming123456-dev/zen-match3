/**
 * 棋盘数据模型 - 管理网格数据和状态
 * 逻辑层核心，不涉及任何渲染
 */
class Board {
    constructor(rows, cols, gemTypes) {
        this.rows = rows;
        this.cols = cols;
        this.gemTypes = gemTypes;
        /** @type {Array<Array<Gem|null>>} 二维网格，null 表示空格 */
        this.grid = [];
    }

    // ==================== 初始化 ====================

    /** 生成初始棋盘，确保没有初始三连 */
    init() {
        this.grid = [];
        for (let r = 0; r < this.rows; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.cols; c++) {
                let type;
                do {
                    type = Math.floor(Math.random() * this.gemTypes);
                } while (this._wouldMatch(r, c, type));
                this.grid[r][c] = new Gem(type, r, c);
            }
        }
    }

    /**
     * 检查在 (r,c) 放置 type 类型是否会立即形成三连
     * @returns {boolean}
     */
    _wouldMatch(r, c, type) {
        // 检查水平方向左边两个
        if (c >= 2 &&
            this.grid[r][c - 1] && this.grid[r][c - 1].type === type &&
            this.grid[r][c - 2] && this.grid[r][c - 2].type === type) {
            return true;
        }
        // 检查垂直方向上边两个
        if (r >= 2 &&
            this.grid[r - 1] && this.grid[r - 1][c].type === type &&
            this.grid[r - 2] && this.grid[r - 2][c].type === type) {
            return true;
        }
        return false;
    }

    // ==================== 查询 ====================

    /** 安全获取 grid[r][c]，越界返回 null */
    get(r, c) {
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return null;
        return this.grid[r][c];
    }

    /** 设置格子 */
    set(r, c, gem) {
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
            this.grid[r][c] = gem;
            if (gem) {
                gem.row = r;
                gem.col = c;
            }
        }
    }

    /** 判断坐标是否在棋盘内 */
    inBounds(r, c) {
        return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
    }

    /** 遍历所有非空格子 */
    forEach(fn) {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c]) fn(this.grid[r][c], r, c);
            }
        }
    }

    /** 获取所有非空格子的扁平数组 */
    getAllGems() {
        const gems = [];
        this.forEach(g => gems.push(g));
        return gems;
    }

    // ==================== 操作 ====================

    /** 交换两个格子的宝石（只改数据，不做校验） */
    swap(r1, c1, r2, c2) {
        const tmp = this.grid[r1][c1];
        this.set(r1, c1, this.grid[r2][c2]);
        this.set(r2, c2, tmp);
    }

    /** 清除指定位置的宝石 */
    remove(r, c) {
        this.grid[r][c] = null;
    }

    /** 克隆整个棋盘数据 */
    clone() {
        const b = new Board(this.rows, this.cols, this.gemTypes);
        b.grid = [];
        for (let r = 0; r < this.rows; r++) {
            b.grid[r] = [];
            for (let c = 0; c < this.cols; c++) {
                const src = this.grid[r][c];
                b.grid[r][c] = src ? new Gem(src.type, r, c, src.isPowerUp, src.powerUpType) : null;
            }
        }
        return b;
    }
}
