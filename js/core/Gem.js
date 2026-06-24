/**
 * 宝石数据模型 - 单个宝石实体的数据结构
 * 纯数据对象，不包含渲染逻辑
 */
class Gem {
    /**
     * @param {number} type   - 基础类型 0-4
     * @param {number} row    - 所在行
     * @param {number} col    - 所在列
     * @param {boolean} [isPowerUp=false]
     * @param {string|null} [powerUpType=null] - 'line'|'bomb'|'rainbow'
     */
    constructor(type, row, col, isPowerUp = false, powerUpType = null) {
        this.type = type;
        this.row = row;
        this.col = col;
        this.isPowerUp = isPowerUp;
        this.powerUpType = powerUpType;

        // 动画相关偏移（渲染层使用）
        this.animX = 0;       // X 方向偏移（像素）
        this.animY = 0;       // Y 方向偏移（像素）
        this.alpha = 1;       // 透明度
        this.scale = 1;       // 缩放
    }

    /** 创建普通宝石 */
    static createNormal(type, row, col) {
        return new Gem(type, row, col, false, null);
    }

    /** 创建道具宝石 */
    static createPowerUp(type, row, col, powerUpType) {
        return new Gem(type, row, col, true, powerUpType);
    }

    /** 深拷贝 */
    clone() {
        const g = new Gem(this.type, this.row, this.col, this.isPowerUp, this.powerUpType);
        g.animX = this.animX;
        g.animY = this.animY;
        g.alpha = this.alpha;
        g.scale = this.scale;
        return g;
    }

    /** 重置动画状态 */
    resetAnim() {
        this.animX = 0;
        this.animY = 0;
        this.alpha = 1;
        this.scale = 1;
    }
}
