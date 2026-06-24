/**
 * 消消乐游戏 - 全局配置（Zen 解压模式版本）
 * 所有可调参数集中管理
 */
const CONFIG = {
    // ========== 网格配置 ==========
    GRID: {
        ROWS: 8,
        COLS: 8,
        CELL_SIZE: 64,
        GEM_TYPES: 5
    },

    // ========== 画布配置 ==========
    CANVAS: {
        WIDTH: 8 * 64 + 40,
        HEIGHT: 8 * 64 + 40,
        PADDING: 20
    },

    // ========== 游戏规则 ==========
    RULES: {
        MIN_MATCH: 3,
        COMBO_MULTIPLIER: 1,
        BASE_SCORE: 10,
        SPECIAL_4: 4,
        SPECIAL_5: 5,
        BOMB_RADIUS: 1
    },

    // ========== 关卡目标 ==========
    LEVEL: {
        MODE: 'zen',            // 默认模式改为 Zen
        MAX_MOVES: 30,
        MAX_TIME: 60,
        TARGET_SCORE: 5000
    },

    // ========== Zen 模式配置 ==========
    ZEN: {
        INFINITE_MOVES: true,   // 无限步数
        NO_FAILURE: true,       // 永不失败
        AUTO_SHUFFLE: true,     // 无可用交换时自动洗牌
        SHUFFLE_DELAY: 500      // 洗牌延迟(ms)
    },

    // ========== 特效开关 ==========
    EFFECTS: {
        PARTICLES_ENHANCED: true,   // 强化粒子
        SCREEN_SHAKE: true,         // 屏幕微震
        COMBO_POPUP: true,          // 连击大字弹出
        LIGHT_BURST: true,          // 光波扩散
        SCORE_FLOAT: true,          // 分数飘字
        BORDER_GLOW: true           // 边框辉光
    },

    // ========== 特效参数 ==========
    EFFECT_PARAMS: {
        SHAKE_INTENSITY: 4,         // 微震最大偏移(px)
        SHAKE_DURATION: 200,        // 微震持续(ms)
        COMBO_POP_DURATION: 800,    // 连击大字总时长(ms)
        COMBO_POP_MIN_LEVEL: 2,     // 触发连击大字的最低连消级数
        LIGHT_BURST_DURATION: 600,  // 光波扩散时长(ms)
        SCORE_FLOAT_DURATION: 800,  // 分数飘字时长(ms)
        SCORE_FLOAT_RISE: 60,       // 飘字上升距离(px)
        BORDER_GLOW_LO: '0 0 20px rgba(59,130,246,0.15)',
        BORDER_GLOW_MID: '0 0 40px rgba(245,158,11,0.3)',
        BORDER_GLOW_HI: '0 0 60px rgba(245,158,11,0.5)'
    },

    // ========== 动画配置 ==========
    ANIM: {
        SWAP_SPEED: 200,
        FALL_SPEED: 80,
        BOUNCE_SPEED: 300,
        EXPLODE_SPEED: 400,
        PARTICLE_SPEED: 500
    },

    // ========== 深海幽蓝宝石视觉定义 ==========
    GEMS: [
        { id: 0, name: '蓝宝石', color: '#3B82F6', shape: 'circle',   glow: 'rgba(59,130,246,0.45)' },
        { id: 1, name: '青宝石', color: '#06B6D4', shape: 'square',   glow: 'rgba(6,182,212,0.45)' },
        { id: 2, name: '绿宝石', color: '#10B981', shape: 'triangle', glow: 'rgba(16,185,129,0.45)' },
        { id: 3, name: '靛宝石', color: '#6366F1', shape: 'circle',   glow: 'rgba(99,102,241,0.45)' },
        { id: 4, name: '金宝石', color: '#F59E0B', shape: 'diamond',  glow: 'rgba(245,158,11,0.45)' }
    ],

    // ========== 道具视觉定义 ==========
    POWER_UPS: {
        LINE:    { id: 'line',    name: '直线消除', color: '#FF6348', icon: '━' },
        BOMB:    { id: 'bomb',    name: '爆炸消除', color: '#2C3E50', icon: '●' },
        RAINBOW: { id: 'rainbow', name: '全屏同色', color: '#FFF',    icon: '★' }
    },

    // ========== 深海幽蓝主题 ==========
    THEME: {
        BACKGROUND: '#0a1628',
        GRID_BG: '#0f1d35',
        GRID_LINE: 'rgba(59,130,246,0.08)',
        PANEL_BG: 'rgba(15,29,53,0.8)',
        ACCENT: '#60A5FA',
        ACCENT_DIM: '#93C5FD',
        GOLD: '#FFD700',
        ZEN_TAB_ACTIVE: '#6366F1',
        CHALLENGE_TAB_ACTIVE: '#FF4757'
    }
};
