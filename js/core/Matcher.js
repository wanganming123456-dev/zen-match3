/**
 * 匹配检测器 - 纯逻辑层
 * 负责检测棋盘上的所有消除匹配，以及特殊匹配形状识别
 */
class Matcher {

    /**
     * 扫描整个棋盘，返回所有可消除的匹配组
     * @param {Board} board
     * @returns {MatchGroup[]} 每个 MatchGroup 包含匹配类型和坐标列表
     */
    static findAllMatches(board) {
        const matched = new Set();   // "r,c" 字符串集合，防重复
        const groups = [];

        // 水平扫描
        for (let r = 0; r < board.rows; r++) {
            let c = 0;
            while (c < board.cols) {
                const gem = board.get(r, c);
                if (!gem) { c++; continue; }
                // 收集连续同色（忽略道具差异）
                const run = [{ r, c, gem }];
                while (c + 1 < board.cols) {
                    const next = board.get(r, c + 1);
                    if (next && this._sameColor(gem, next)) {
                        run.push({ r, c: c + 1, gem: next });
                        c++;
                    } else break;
                }
                if (run.length >= CONFIG.RULES.MIN_MATCH) {
                    const shape = this._analyzeShape(run, board);
                    groups.push(new MatchGroup(run, 'horizontal', shape));
                    run.forEach(m => matched.add(`${m.r},${m.c}`));
                }
                c++;
            }
        }

        // 垂直扫描
        for (let c = 0; c < board.cols; c++) {
            let r = 0;
            while (r < board.rows) {
                const gem = board.get(r, c);
                if (!gem) { r++; continue; }
                const run = [{ r, c, gem }];
                while (r + 1 < board.rows) {
                    const next = board.get(r + 1, c);
                    if (next && this._sameColor(gem, next)) {
                        run.push({ r: r + 1, c, gem: next });
                        r++;
                    } else break;
                }
                if (run.length >= CONFIG.RULES.MIN_MATCH) {
                    const shape = this._analyzeShape(run, board);
                    groups.push(new MatchGroup(run, 'vertical', shape));
                    run.forEach(m => matched.add(`${m.r},${m.c}`));
                }
                r++;
            }
        }

        // 合并重叠的匹配组（T型/L型合并为一个大组）
        return this._mergeOverlapping(groups);
    }

    /** 判断两个宝石是否为同色（道具也算同色） */
    static _sameColor(a, b) {
        if (!a || !b) return false;
        return a.type === b.type;
    }

    /**
     * 分析匹配形状，判断是否能生成道具
     * @returns {'3'|'4'|'5'|'T'|'L'}
     */
    static _analyzeShape(run, board) {
        const len = run.length;
        if (len === 4) return '4';
        if (len >= 5) return '5';
        // 检测 T 型或 L 型（3个水平 + 某个位置上下扩展）
        // 这里简化：3连不产生道具
        return '3';
    }

    /**
     * 合并重叠的匹配组
     * 当水平匹配和垂直匹配共享坐标时，合并为更大的形状
     */
    static _mergeOverlapping(groups) {
        // 合并有重叠坐标的匹配组
        const merged = [];
        const used = new Set();

        for (let i = 0; i < groups.length; i++) {
            if (used.has(i)) continue;
            let current = groups[i];
            used.add(i);

            // 尝试与后续组合并
            for (let j = i + 1; j < groups.length; j++) {
                if (used.has(j)) continue;
                if (current.overlapsWith(groups[j])) {
                    current = current.merge(groups[j]);
                    used.add(j);
                    j = i; // 重新扫描
                }
            }
            // 重新评估合并后的形状
            current.recalcShape();
            merged.push(current);
        }
        return merged;
    }

    /**
     * 检查是否有任何可消除的匹配
     * @param {Board} board
     * @returns {boolean}
     */
    static hasAnyMatch(board) {
        const matches = this.findAllMatches(board);
        return matches.length > 0;
    }
}

/**
 * 匹配组 - 一组可消除的坐标
 */
class MatchGroup {
    /**
     * @param {Array<{r:number,c:number,gem:Gem}>} cells
     * @param {'horizontal'|'vertical'|'mixed'} direction
     * @param {'3'|'4'|'5'|'T'|'L'} shape
     */
    constructor(cells, direction, shape = '3') {
        this.cells = cells;
        this.direction = direction;
        this.shape = shape;
        this.gemType = cells[0]?.gem?.type ?? 0;
        this.score = 0; // 由 ScoreManager 计算
    }

    /** 获取所有坐标 */
    getCoords() {
        return this.cells.map(c => ({ r: c.r, c: c.c }));
    }

    /** 获取唯一坐标集合 */
    getCoordSet() {
        return new Set(this.cells.map(c => `${c.r},${c.c}`));
    }

    /** 判断是否与另一组有重叠 */
    overlapsWith(other) {
        for (const c of other.cells) {
            if (this.getCoordSet().has(`${c.r},${c.c}`)) return true;
        }
        return false;
    }

    /** 合并两个匹配组 */
    merge(other) {
        const coordMap = new Map();
        for (const c of this.cells) coordMap.set(`${c.r},${c.c}`, c);
        for (const c of other.cells) {
            if (!coordMap.has(`${c.r},${c.c}`)) coordMap.set(`${c.r},${c.c}`, c);
        }
        return new MatchGroup(Array.from(coordMap.values()), 'mixed', this.shape);
    }

    /** 根据合并后的大小重新判断形状 */
    recalcShape() {
        const len = this.cells.length;
        if (len === 4) this.shape = '4';
        else if (len >= 5) {
            // 分析具体形状：T型 / L型 / 直线5
            this.shape = this._detectComplexShape();
        }
    }

    _detectComplexShape() {
        const coords = this.cells.map(c => ({ r: c.r, c: c.c }));
        const rows = new Set(coords.map(c => c.r));
        const cols = new Set(coords.map(c => c.c));
        // 如果只占一行或一列 -> 直线5
        if (rows.size === 1 || cols.size === 1) return '5_line';
        // 否则为 T 或 L 型
        if (rows.size === 2 || cols.size === 2) return 'L';
        return 'T';
    }
}
