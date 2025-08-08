export class ParticleSystem {
  constructor(ctx) {
    this.ctx = ctx;
    this.particles = [];
  }
  emitBurst(x, y, color, count = 18) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 0.8 + Math.random() * 0.6,
        size: 2 + Math.random() * 3,
        color,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.2,
      });
    }
  }
  update(dt) {
    const g = 9.81 * 0.5;
    this.particles = this.particles.filter(p => (p.life -= dt) > 0);
    for (const p of this.particles) {
      p.vy += g * dt;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.spin;
    }
  }
  draw() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      const alpha = Math.max(0, Math.min(1, p.life));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 2);
      grd.addColorStop(0, 'white');
      grd.addColorStop(1, p.color);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}