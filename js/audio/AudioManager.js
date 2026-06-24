/**
 * AudioManager — Web Audio API 合成音效引擎
 * 零依赖，纯代码合成所有游戏音效
 */
class AudioManager {
  constructor() {
    this.ctx = null;
    this._initOnGesture();
  }

  /** 首次用户交互时初始化 AudioContext */
  _initOnGesture() {
    const init = () => {
      if (this.ctx) return;
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch(e) { /* 浏览器不支持则静默 */ }
    };
    ['click','touchstart'].forEach(e => document.addEventListener(e, init, { once: true }));
  }

  _ensure() { if (!this.ctx) try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} return this.ctx; }

  /** 播放一个音调 */
  _tone(freq, type, duration, vol = 0.15, ramp = true) {
    const ctx = this._ensure();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    if (ramp) gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    else gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration + 0.05);
  }

  /** 播放和弦（多个音同时） */
  _chord(freqs, type, duration, vol = 0.12) {
    freqs.forEach((f, i) => {
      setTimeout(() => this._tone(f, type, duration, vol), i * 15);
    });
  }

  // ====== 游戏音效 ======

  /** 选中宝石 */
  select() { this._tone(520, 'sine', 0.08, 0.08); }

  /** 交换 */
  swap() { this._tone(400, 'triangle', 0.06, 0.06, false); setTimeout(() => this._tone(600, 'triangle', 0.06, 0.06, false), 40); }

  /** 无效交换弹回 */
  invalidSwap() { this._tone(200, 'triangle', 0.15, 0.08); }

  /** 消除（匹配数越多音调越高） */
  eliminate(count) {
    const base = 500 + count * 30;
    this._tone(base, 'triangle', 0.12, 0.1);
    setTimeout(() => this._tone(base * 1.25, 'triangle', 0.08, 0.08), 50);
  }

  /** 连击（级别越高音调越高） */
  combo(level) {
    const base = 600 + level * 80;
    this._chord([base, base * 1.25, base * 1.5], 'triangle', 0.2, 0.1);
  }

  /** 道具触发 */
  powerUp(type) {
    switch(type) {
    case 'line': this._chord([600, 800, 1000], 'sine', 0.3, 0.12); break;
    case 'bomb': this._chord([300, 400, 500, 600], 'triangle', 0.4, 0.15); break;
    case 'rainbow': this._chord([523, 659, 784, 1047], 'sine', 0.5, 0.18); break;
    default: this._chord([500, 700, 900], 'sine', 0.25, 0.1);
    }
  }

  /** 成就达成 */
  achievement() {
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((f, i) => setTimeout(() => this._tone(f, 'sine', 0.3, 0.12), i * 100));
  }

  /** 里程碑弹窗 */
  milestone() {
    const notes = [784, 988, 1175, 1319, 1568];
    notes.forEach((f, i) => setTimeout(() => this._tone(f, 'sine', 0.25, 0.1), i * 80));
  }

  /** 按钮点击 */
  click() { this._tone(700, 'sine', 0.04, 0.05); }
}
