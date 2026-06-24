/**
 * 道具系统 - 负责道具生成、触发和效果执行
 */
class PowerUpSystem {

    /**
     * 根据匹配组判断是否生成道具，并创建对应的道具宝石
     * @param {MatchGroup} group
     * @param {Board} board
     * @returns {Gem|null} 返回生成的道具宝石，或 null
     */
    static createPowerUpForMatch(group, board) {
        const shape = group.shape;
        const gemType = group.gemType;

        // 找到匹配组的中心位置
        const center = this._findCenter(group.cells);

        switch (shape) {
            case '4':
                // 4连消 → 直线消除道具
                return Gem.createPowerUp(gemType, center.r, center.c, 'line');

            case '5_line':
                // 直线5连消 → 全屏同色消除道具
                return Gem.createPowerUp(gemType, center.r, center.c, 'rainbow');

            case 'T':
            case 'L':
                // T型/L型5连消 → 爆炸消除道具
                return Gem.createPowerUp(gemType, center.r, center.c, 'bomb');

            default:
                return null;
        }
    }

    /**
     * 触发道具效果，返回受影响的坐标列表
     * @param {Gem} powerUp
     * @param {Board} board
     * @param {number} targetRow - 道具交换目标行（用于 rainbow 道具）
     * @param {number} targetCol - 道具交换目标列（用于 rainbow 道具）
     * @returns {{r:number,c:number}[]}
     */
    static trigger(powerUp, board, targetRow, targetCol) {
        switch (powerUp.powerUpType) {
            case 'line':
                return this._triggerLine(powerUp, board);
            case 'bomb':
                return this._triggerBomb(powerUp, board);
            case 'rainbow':
                return this._triggerRainbow(powerUp, board, targetRow, targetCol);
            default:
                return [];
        }
    }

    /** 直线消除：消除整行+整列 */
    static _triggerLine(powerUp, board) {
        const affected = [];
        const r = powerUp.row;
        const c = powerUp.col;

        for (let cc = 0; cc < board.cols; cc++) {
            if (board.get(r, cc)) affected.push({ r, c: cc });
        }
        for (let rr = 0; rr < board.rows; rr++) {
            if (board.get(rr, c)) affected.push({ r: rr, c });
        }
        return affected;
    }

    /** 爆炸消除：消除 3×3 范围 */
    static _triggerBomb(powerUp, board) {
        const affected = [];
        const radius = CONFIG.RULES.BOMB_RADIUS;
        const r = powerUp.row;
        const c = powerUp.col;

        for (let dr = -radius; dr <= radius; dr++) {
            for (let dc = -radius; dc <= radius; dc++) {
                const rr = r + dr;
                const cc = c + dc;
                if (board.inBounds(rr, cc) && board.get(rr, cc)) {
                    affected.push({ r: rr, c: cc });
                }
            }
        }
        return affected;
    }

    /** 全屏同色消除：消除所有与目标同色的宝石 */
    static _triggerRainbow(powerUp, board, targetRow, targetCol) {
        const affected = [];
        const targetGem = board.get(targetRow, targetCol);
        const targetType = targetGem ? targetGem.type : -1;

        // 如果目标也是道具，全屏消除
        if (!targetGem || targetGem.isPowerUp) {
            // 全屏消除
            for (let r = 0; r < board.rows; r++) {
                for (let c = 0; c < board.cols; c++) {
                    if (board.get(r, c)) affected.push({ r, c });
                }
            }
        } else {
            // 消除所有同色
            for (let r = 0; r < board.rows; r++) {
                for (let c = 0; c < board.cols; c++) {
                    const g = board.get(r, c);
                    if (g && g.type === targetType) affected.push({ r, c });
                }
            }
        }
        return affected;
    }

    /** 找到匹配组的中心位置 */
    static _findCenter(cells) {
        let sumR = 0, sumC = 0;
        for (const c of cells) {
            sumR += c.r;
            sumC += c.c;
        }
        return {
            r: Math.round(sumR / cells.length),
            c: Math.round(sumC / cells.length)
        };
    }
}
