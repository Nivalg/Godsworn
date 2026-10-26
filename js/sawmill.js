// Godsworn Sawmill / Lumber Mill Building Class (3x3 Footprint, Tech Requirement for Archery)
class Sawmill {
  constructor(tileCol, tileRow, gameMap) {
    const cfg = typeof CONFIG !== 'undefined' ? CONFIG : window.CONFIG;
    const fac = typeof FACTIONS !== 'undefined' ? FACTIONS : window.FACTIONS;

    this.tileCol = tileCol;
    this.tileRow = tileRow;
    this.widthTiles = 3;
    this.heightTiles = 3;
    this.tileSize = cfg ? cfg.TILE_SIZE : 32;

    this.worldX = tileCol * this.tileSize;
    this.worldY = tileRow * this.tileSize;
    this.width = this.widthTiles * this.tileSize;
    this.height = this.heightTiles * this.tileSize;

    const buildingConfig = fac && fac.HEAVENLY_HOST ? fac.HEAVENLY_HOST.buildings.lumberMill : null;
    this.name = buildingConfig ? buildingConfig.name : 'Sawmill';
    this.hp = buildingConfig ? buildingConfig.hp : 720;
    this.maxHp = buildingConfig ? buildingConfig.maxHp : 720;
    this.selected = false;
    this.isBuilding = true;
    this.team = 1;
    this.hitRadius = Math.max(this.width, this.height) / 2;
    this.floatingTexts = [];
    this.hitEffectTimer = 0;

    // Construction Properties
    this.isConstructed = false;
    this.buildProgress = 0.0; // 0.0 to 1.0

    // Register 3x3 footprint in game map building mask
    if (gameMap && gameMap.blockBuilding) {
      gameMap.blockBuilding(tileCol, tileRow, this.widthTiles, this.heightTiles);
    }
  }

  takeDamage(amount, attacker = null) {
    if (this.hp <= 0) return;
    this.hp = Math.max(0, this.hp - amount);
    this.hitEffectTimer = 10;
    if (!this.floatingTexts) this.floatingTexts = [];
    this.floatingTexts.push({
      text: `-${amount}`,
      x: this.worldX + this.width / 2,
      y: this.worldY + 12,
      alpha: 1.0,
      life: 35
    });
  }

  construct(amount = 0.00083) { // ~20 seconds at 60 FPS
    if (this.isConstructed) return;
    this.buildProgress = Math.min(1.0, this.buildProgress + amount);

    if (this.buildProgress >= 1.0 && !this.isConstructed) {
      this.isConstructed = true;
      this.buildProgress = 1.0;
    }
  }

  update(units = [], gameMap = null, uiManager = null) {
    if (this.hp <= 0) return;

    if (this.floatingTexts) {
      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const ft = this.floatingTexts[i];
        ft.y -= 0.5;
        ft.alpha -= 0.028;
        ft.life--;
        if (ft.life <= 0 || ft.alpha <= 0) {
          this.floatingTexts.splice(i, 1);
        }
      }
    }
    if (this.hitEffectTimer > 0) this.hitEffectTimer--;

    if (this.buildProgress >= 1.0 && !this.isConstructed) {
      this.isConstructed = true;
    }
  }

  containsWorldPoint(worldX, worldY) {
    return worldX >= this.worldX && worldX <= this.worldX + this.width &&
           worldY >= this.worldY && worldY <= this.worldY + this.height;
  }

  intersectsBox(box) {
    return !(box.x2 < this.worldX || box.x1 > this.worldX + this.width ||
             box.y2 < this.worldY || box.y1 > this.worldY + this.height);
  }

  render(ctx, camera) {
    const screenPos = camera.worldToScreen(this.worldX, this.worldY);
    const px = Math.floor(screenPos.x);
    const py = Math.floor(screenPos.y);

    if (!this.isConstructed) {
      // 1. Under Construction Scaffolding Frame (96x96)
      ctx.fillStyle = '#1c140a';
      ctx.fillRect(px + 4, py + 86, 88, 8);

      // Scaffolding timber posts
      ctx.fillStyle = '#8c5a2b';
      ctx.fillRect(px + 8, py + 16, 8, 72);
      ctx.fillRect(px + 80, py + 16, 8, 72);
      ctx.fillRect(px + 8, py + 16, 80, 8);
      ctx.fillRect(px + 8, py + 52, 80, 7);

      // Cross braces
      ctx.strokeStyle = '#a6723c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px + 16, py + 24);
      ctx.lineTo(px + 80, py + 52);
      ctx.moveTo(px + 80, py + 24);
      ctx.lineTo(px + 16, py + 52);
      ctx.stroke();

      // Overhead progress bar
      const pct = Math.max(0, Math.min(1.0, this.buildProgress));
      ctx.fillStyle = '#000000';
      ctx.fillRect(px + 8, py - 12, 80, 7);
      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(px + 9, py - 11, Math.floor(78 * pct), 5);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 8, py - 12, 80, 7);

      if (this.selected) {
        ctx.strokeStyle = '#2ecc71';
        ctx.lineWidth = 2;
        ctx.strokeRect(px - 2, py - 2, this.width + 4, this.height + 4);
      }
      return;
    }

    // 2. Completed Sawmill Pixel Art (96x96)
    // Soft rounded foundation shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(px + 48, py + 88, 44, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Heavy Timber Cabin Structure
    ctx.fillStyle = '#65462a';
    ctx.fillRect(px + 8, py + 30, 80, 58);

    // Dark Wooden Planks texture
    ctx.fillStyle = '#4c341e';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(px + 8, py + 38 + (i * 12), 80, 2);
    }

    // Log Cabin Roof
    ctx.fillStyle = '#82481e';
    ctx.beginPath();
    ctx.moveTo(px + 4, py + 30);
    ctx.lineTo(px + 48, py + 8);
    ctx.lineTo(px + 92, py + 30);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#a65e28';
    ctx.beginPath();
    ctx.moveTo(px + 12, py + 28);
    ctx.lineTo(px + 48, py + 14);
    ctx.lineTo(px + 84, py + 28);
    ctx.closePath();
    ctx.fill();

    // Stacked Wood Logs on Side
    ctx.fillStyle = '#9e7343';
    ctx.fillRect(px + 12, py + 64, 24, 18);
    ctx.fillStyle = '#7c5427';
    for (let c = 0; c < 3; c++) {
      ctx.beginPath();
      ctx.arc(px + 16 + (c * 8), py + 70, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px + 16 + (c * 8), py + 76, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Waterwheel / Saw Blade Shaft Housing
    ctx.fillStyle = '#2b1a0e';
    ctx.fillRect(px + 52, py + 50, 28, 36);

    // Circular Saw Blade
    ctx.fillStyle = '#b0bac4';
    ctx.beginPath();
    ctx.arc(px + 66, py + 68, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#525b63';
    ctx.beginPath();
    ctx.arc(px + 66, py + 68, 4, 0, Math.PI * 2);
    ctx.fill();

    // Saw Teeth details
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px + 66 - 12, py + 68);
    ctx.lineTo(px + 66 + 12, py + 68);
    ctx.moveTo(px + 66, py + 68 - 12);
    ctx.lineTo(px + 66, py + 68 + 12);
    ctx.stroke();

    // Selection highlight
    if (this.selected) {
      const cfg = typeof CONFIG !== 'undefined' ? CONFIG : window.CONFIG;
      ctx.strokeStyle = (cfg && cfg.COLORS) ? cfg.COLORS.SELECTION : '#2ecc71';
      ctx.lineWidth = 2;
      ctx.strokeRect(px - 2, py - 2, this.width + 4, this.height + 4);
    }

    // Overhead Health Bar
    if (this.hp < this.maxHp || this.selected) {
      const barW = this.width;
      const barH = 5;
      const bx = px;
      const by = py - 18;
      const pct = Math.max(0, Math.min(1.0, this.hp / this.maxHp));

      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(bx, by, barW, barH);
      ctx.fillStyle = pct > 0.5 ? '#2ecc71' : (pct > 0.25 ? '#f39c12' : '#e74c3c');
      ctx.fillRect(bx, by, Math.floor(barW * pct), barH);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, barW, barH);
    }

    // Floating Damage Text Particles
    if (this.floatingTexts && this.floatingTexts.length > 0) {
      ctx.save();
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      for (const ft of this.floatingTexts) {
        const ftPos = camera.worldToScreen(ft.x, ft.y);
        ctx.fillStyle = `rgba(255, 60, 60, ${ft.alpha})`;
        ctx.strokeStyle = `rgba(0, 0, 0, ${ft.alpha})`;
        ctx.lineWidth = 2;
        ctx.strokeText(ft.text, ftPos.x, ftPos.y);
        ctx.fillText(ft.text, ftPos.x, ftPos.y);
      }
      ctx.restore();
    }
  }
}
window.Sawmill = Sawmill;
