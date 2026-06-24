/**
 * 重力掉落与填充管理器 - 纯逻辑层
 * 处理消除后的掉落补位和新元素生成
 */
class Gravity {

    /**
     * 执行一次完整的掉落与填充周期
     * @param {Board} board
     * @returns {FallResult} 包含掉落和生成的所有动作
     */
    static apply(board) {
        const result = new FallResult();
        const rows = board.rows;
        const cols = board.cols;

        // 逐列处理
        for (let c = 0; c < cols; c++) {
            // 1. 收集该列所有非空宝石（从顶部到底部）
            const gems = [];
            for (let r = 0; r < rows; r++) {
                const gem = board.get(r, c);
                if (gem) gems.push(gem);
            }

            // 2. 从底部填充
            const newCol = [];
            let emptyCount = rows - gems.length;

            // 顶部先放 null
            for (let i = 0; i < emptyCount; i++) newCol.push(null);
            // 下方放置原有宝石
            for (const gem of gems) newCol.push(gem);

            // 3. 记录每个宝石的移动信息
            const moveMap = []; // 每行放什么
            for (let r = 0; r < rows; r++) {
                const gem = newCol[r];
                if (!gem) {
                    // 生成新宝石
                    const type = Math.floor(Math.random() * board.gemTypes);
                    const newGem = Gem.createNormal(type, r, c);
                    moveMap.push(newGem);
                    result.spawned.push({
                        gem: newGem,
                        targetRow: r,
                        targetCol: c,
                        fallFromRow: r - emptyCount // 从棋盘上方掉入
                    });
                } else {
                    const oldRow = gem.row;
                    gem.row = r;
                    gem.col = c;
                    moveMap.push(gem);
                    if (oldRow !== r) {
                        result.dropped.push({
                            gem: gem,
                            fromRow: oldRow,
                            toRow: r,
                            col: c,
                            distance: r - oldRow
                        });
                    }
                }
            }

            // 4. 写回棋盘
            for (let r = 0; r < rows; r++) {
                board.grid[r][c] = moveMap[r];
            }
        }

        return result;
    }

    /**
     * 检查棋盘是否还存在空格
     * @returns {boolean}
     */
    static hasEmpty(board) {
        for (let r = 0; r < board.rows; r++) {
            for (let c = 0; c < board.cols; c++) {
                if (!board.grid[r][c]) return true;
            }
        }
        return false;
    }
}

/**
 * 掉落结果数据结构
 */
class FallResult {
    constructor() {
        /** @type {Array<{gem:Gem, fromRow:number, toRow:number, col:number, distance:number}>} */
        this.dropped = [];
        /** @type {Array<{gem:Gem, targetRow:number, targetCol:number, fallFromRow:number}>} */
        this.spawned = [];
    }

    /** 是否有掉落或生成 */
    hasAny() {
        return this.dropped.length > 0 || this.spawned.length > 0;
    }

    /** 总动画时长估算 (ms) */
    totalAnimTime() {
        let maxDist = 0;
        for (const d of this.dropped) {
            if (d.distance > maxDist) maxDist = d.distance;
        }
        for (const s of this.spawned) {
            const dist = Math.abs(s.targetRow - s.fallFromRow);
            if (dist > maxDist) maxDist = dist;
        }
        return maxDist * CONFIG.ANIM.FALL_SPEED + 50;
    }
}
