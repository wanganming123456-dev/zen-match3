/**
 * StorageManager — localStorage 持久化封装
 * 管理游戏成绩的存储和读取
 */
class StorageManager {
  static KEYS = {
    bestChain: 'zen_best_chain',
    bestScore: 'zen_best_score',
    totalCleared: 'zen_total_cleared',
    bestVibe: 'zen_best_vibe',
    achievements: 'zen_achievements'
  };

  /** 获取数值，不存在返回 0 */
  static get(key) {
    try { return parseInt(localStorage.getItem(key)) || 0; }
    catch { return 0; }
  }

  /** 保存数值 */
  static set(key, val) {
    try { localStorage.setItem(key, val); }
    catch { /* 存储满则静默失败 */ }
  }

  /** 如果新值大于已存值则更新，返回是否刷新了记录 */
  static setMax(key, val) {
    const old = StorageManager.get(key);
    if (val > old) { StorageManager.set(key, val); return true; }
    return false;
  }

  /** 累加数值 */
  static add(key, val) {
    StorageManager.set(key, StorageManager.get(key) + val);
  }

  /** 获取所有最佳记录 */
  static getAllRecords() {
    return {
      bestChain: StorageManager.get(StorageManager.KEYS.bestChain),
      bestScore: StorageManager.get(StorageManager.KEYS.bestScore),
      totalCleared: StorageManager.get(StorageManager.KEYS.totalCleared),
      bestVibe: StorageManager.get(StorageManager.KEYS.bestVibe)
    };
  }

  /** 获取已解锁的成就列表 */
  static getAchievements() {
    try { return JSON.parse(localStorage.getItem(StorageManager.KEYS.achievements)) || []; }
    catch { return []; }
  }

  /** 添加已解锁成就 */
  static addAchievement(id) {
    const list = StorageManager.getAchievements();
    if (!list.includes(id)) { list.push(id); StorageManager.set(StorageManager.KEYS.achievements, JSON.stringify(list)); }
    return list;
  }

  /** 检查成就是否已解锁 */
  static hasAchievement(id) {
    return StorageManager.getAchievements().includes(id);
  }
}
