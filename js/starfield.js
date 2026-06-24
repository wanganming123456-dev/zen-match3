/**
 * 星空背景 — 深海夜空飘浮粒子
 */
(function () {
  const canvas = document.getElementById('starfield');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const STARS = 80;
  const stars = [];

  // 生成星星
  for (let i = 0; i < STARS; i++) {
    stars.push({
      x: Math.random(),
      y: Math.random(),
      r: 0.5 + Math.random() * 2,
      twinkle: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.7,
      alpha: 0.2 + Math.random() * 0.6
    });
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  function draw(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const w = canvas.width;
    const h = canvas.height;

    for (const s of stars) {
      // 闪烁
      const pulse = Math.sin(time * s.speed + s.twinkle) * 0.3 + 0.7;
      const alpha = s.alpha * pulse;

      ctx.beginPath();
      const x = s.x * w;
      const y = s.y * h;
      ctx.arc(x, y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(147,197,253,' + alpha.toFixed(2) + ')';
      ctx.fill();

      // 光晕
      if (s.r > 1.5) {
        ctx.beginPath();
        ctx.arc(x, y, s.r * 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(147,197,253,' + (alpha * 0.15).toFixed(2) + ')';
        ctx.fill();
      }
    }

    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
})();
