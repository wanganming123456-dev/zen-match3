/**
 * AchievementManager — 成就里程碑系统
 * 管理连消里程碑、道具组合成就
 */
class AchievementManager {
  static MILESTONES = [
    { id: 'chain_5',  chain: 5,  title: '初露锋芒', icon: '🥉', desc: '单局达成 5 连消' },
    { id: 'chain_10', chain: 10, title: '渐入佳境', icon: '🥈', desc: '单局达成 10 连消' },
    { id: 'chain_15', chain: 15, title: '炉火纯青', icon: '🥇', desc: '单局达成 15 连消' },
    { id: 'chain_20', chain: 20, title: '天人合一', icon: '💎', desc: '单局达成 20 连消' },
  ];

  /** 检查并触发成就 */
  static check(chainLevel) {
    const unlocked = StorageManager.getAchievements();
    const newlyUnlocked = [];

    for (const ms of AchievementManager.MILESTONES) {
      if (chainLevel >= ms.chain && !unlocked.includes(ms.id)) {
        StorageManager.addAchievement(ms.id);
        newlyUnlocked.push(ms);
      }
    }
    return newlyUnlocked;
  }

  /** 获取最高已解锁里程碑 */
  static getHighestUnlocked() {
    const unlocked = StorageManager.getAchievements();
    let highest = null;
    for (const ms of AchievementManager.MILESTONES) {
      if (unlocked.includes(ms.id)) highest = ms;
    }
    return highest;
  }

  /** 获取下一个待解锁里程碑 */
  static getNext() {
    const unlocked = StorageManager.getAchievements();
    for (const ms of AchievementManager.MILESTONES) {
      if (!unlocked.includes(ms.id)) return ms;
    }
    return null;
  }

  /** 是否为首次解锁（用于决定弹窗还是横幅） */
  static isFirstTime(id) {
    return !StorageManager.hasAchievement(id);
  }
}
