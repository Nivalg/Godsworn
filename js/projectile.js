// Godsworn Ranged Arrow Projectile Engine
class Projectile {
  constructor(startX, startY, targetX, targetY, targetUnit = null, damage = 9, speed = 8, isEnemy = false) {
    this.startX = startX;
    this.startY = startY;
    this.x = startX;
    this.y = startY;

    this.targetUnit = targetUnit;
    this.targetX = targetUnit ? (targetUnit.x || (targetUnit.worldX + (targetUnit.width || 32) / 2)) : targetX;
    this.targetY = targetUnit ? (targetUnit.y || (targetUnit.worldY + (targetUnit.height || 32) / 2)) : targetY;

    this.damage = damage;
    this.speed = speed;
    this.isEnemy = isEnemy;
    this.active = true;

    this.totalDist = Math.hypot(this.targetX - this.startX, this.targetY - this.startY) || 1;
    this.travelDist = 0;
    this.maxArcHeight = Math.min(24, Math.max(8, this.totalDist * 0.15)); // Ballistic curve peak
  }

  update() {
    if (!this.active) return;

    // Track moving target unit if still alive
    if (this.targetUnit && this.targetUnit.hp > 0) {
      if (typeof this.targetUnit.x === 'number' && typeof this.targetUnit.y === 'number') {
        this.targetX = this.targetUnit.x;
        this.targetY = this.targetUnit.y;
      } else if (typeof this.targetUnit.worldX === 'number' && typeof this.targetUnit.worldY === 'number') {
        this.targetX = this.targetUnit.worldX + (this.targetUnit.width || 32) / 2;
        this.targetY = this.targetUnit.worldY + (this.targetUnit.height || 32) / 2;
      }
    }

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= this.speed || this.travelDist >= this.totalDist * 1.2) {
      // Impact! Apply damage to target unit
      if (this.targetUnit && typeof this.targetUnit.takeDamage === 'function' && this.targetUnit.hp > 0) {
        this.targetUnit.takeDamage(this.damage);
      }
      this.active = false;
      return;
    }

    const moveStep = Math.min(dist, this.speed);
    this.x += (dx / dist) * moveStep;
    this.y += (dy / dist) * moveStep;
    this.travelDist += moveStep;
  }

  render(ctx, camera) {
    if (!this.active) return;

    const screenPos = camera.worldToScreen(this.x, this.y);
    const progress = Math.min(1.0, Math.max(0, this.travelDist / this.totalDist));
    const arcOffsetY = Math.sin(progress * Math.PI) * this.maxArcHeight;

    const px = screenPos.x;
    const py = screenPos.y - arcOffsetY;

    // Angle of motion
    const dx = this.targetX - this.startX;
    const dy = (this.targetY - this.startY) - (arcOffsetY * 0.5);
    const angle = Math.atan2(dy, dx);

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);

    // Render Arrow/Bolt 16-Bit Graphic
    // Arrow Shaft
    ctx.strokeStyle = this.isEnemy ? '#8e44ad' : '#8c5a2b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(6, 0);
    ctx.stroke();

    // Iron Arrowhead
    ctx.fillStyle = this.isEnemy ? '#e74c3c' : '#d5dbdb';
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(4, -3);
    ctx.lineTo(4, 3);
    ctx.closePath();
    ctx.fill();

    // Feather Fletching
    ctx.fillStyle = this.isEnemy ? '#9b59b6' : '#f1c40f';
    ctx.beginPath();
    ctx.moveTo(-8, -2);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-8, 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}
window.Projectile = Projectile;
