// Godsworn Grain Farm Building Class ($2 x 2$ Footprint, +5 Food Capacity)
class Farm {
  constructor(tileCol, tileRow, gameMap) {
    const cfg = typeof CONFIG !== 'undefined' ? CONFIG : window.CONFIG;
    const fac = typeof FACTIONS !== 'undefined' ? FACTIONS : window.FACTIONS;

    this.tileCol = tileCol;
    this.tileRow = tileRow;
    this.widthTiles = 2;
    this.heightTiles = 2;
    this.tileSize = cfg ? cfg.TILE_SIZE : 32;

    this.worldX = tileCol * this.tileSize;
    this.worldY = tileRow * this.tileSize;
    this.width = this.widthTiles * this.tileSize;
    this.height = this.heightTiles * this.tileSize;

    const buildingConfig = fac && fac.HEAVENLY_HOST ? fac.HEAVENLY_HOST.buildings.farm : null;
    this.name = buildingConfig ? buildingConfig.name : 'Grain Farm';
    this.hp = buildingConfig ? buildingConfig.hp : 480;
    this.maxHp = buildingConfig ? buildingConfig.maxHp : 480;
    this.selected = false;
    this.isBuilding = true;
    this.team = 1;
    this.hitRadius = Math.max(this.width, this.height) / 2;
    this.floatingTexts = [];
    this.hitEffectTimer = 0;

    // Construction Properties
    this.isConstructed = false;
    this.buildProgress = 0.0; // 0.0 to 1.0
    this.foodApplied = false;

    // Register 2x2 footprint in game map building mask
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
      y: this.worldY + 10,
      alpha: 1.0,
      life: 35
    });
  }

  construct(amount = 0.0011) { // Default ~15 seconds at 60 FPS
    if (this.isConstructed) return;
    this.buildProgress = Math.min(1.0, this.buildProgress + amount);

    if (this.buildProgress >= 1.0 && !this.isConstructed) {
      this.isConstructed = true;
      this.buildProgress = 1.0;
      this.applyFoodCapacity();
    }
  }

  applyFoodCapacity() {
    if (this.foodApplied) return;
    const cfg = typeof CONFIG !== 'undefined' ? CONFIG : window.CONFIG;
    if (cfg && cfg.RESOURCES) {
      cfg.RESOURCES.FOOD_MAX = (cfg.RESOURCES.FOOD_MAX || 10) + 5;
      this.foodApplied = true;
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
      this.applyFoodCapacity();
      if (uiManager && uiManager.updateResources) {
        uiManager.updateResources();
      }
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
      // 1. Under Construction Scaffolding Frame (64x64)
      ctx.fillStyle = '#1c140a';
      ctx.fillRect(px + 4, py + 56, 56, 6);

      // Scaffolding posts
      ctx.fillStyle = '#8c5a2b';
      ctx.fillRect(px + 6, py + 12, 6, 46);
      ctx.fillRect(px + 52, py + 12, 6, 46);
      ctx.fillRect(px + 6, py + 12, 52, 6);
      ctx.fillRect(px + 6, py + 34, 52, 5);

      // Cross braces
      ctx.strokeStyle = '#a6723c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px + 12, py + 18);
      ctx.lineTo(px + 52, py + 34);
      ctx.moveTo(px + 52, py + 18);
      ctx.lineTo(px + 12, py + 34);
      ctx.stroke();

      // Progress bar overhead
      const pct = Math.max(0, Math.min(1.0, this.buildProgress));
      ctx.fillStyle = '#000000';
      ctx.fillRect(px + 4, py - 10, 56, 7);
      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(px + 5, py - 9, Math.floor(54 * pct), 5);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 4, py - 10, 56, 7);

      if (this.selected) {
        ctx.strokeStyle = '#2ecc71';
        ctx.lineWidth = 2;
        ctx.strokeRect(px - 2, py - 2, this.width + 4, this.height + 4);
      }
      return;
    }

    // 2. Completed Grain Farm 16-Bit Pixel Art
    // Soft rounded foundation shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(px + 32, py + 59, 28, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wheat crop patch
    ctx.fillStyle = '#e6c84c';
    ctx.fillRect(px + 4, py + 36, 24, 22);
    ctx.fillStyle = '#c7a72c';
    for (let x = 6; x < 26; x += 6) {
      ctx.fillRect(px + x, py + 38, 2, 18);
    }

    // Farmhouse Main Structure (32x28)
    ctx.fillStyle = '#7a4e28';
    ctx.fillRect(px + 28, py + 24, 32, 32);

    // Shading
    ctx.fillStyle = '#523318';
    ctx.fillRect(px + 28, py + 50, 32, 6);

    // Thatched Straw Roof
    ctx.fillStyle = '#d4ac31';
    ctx.fillRect(px + 24, py + 12, 40, 14);
    ctx.fillStyle = '#eed264';
    ctx.fillRect(px + 28, py + 14, 32, 6);

    // Farm Door & Window
    ctx.fillStyle = '#3a200b';
    ctx.fillRect(px + 40, py + 38, 10, 18);
    ctx.fillStyle = '#fceb9c';
    ctx.fillRect(px + 32, py + 30, 6, 6);

    // Grain Silo Tower (Right side)
    ctx.fillStyle = '#8a949e';
    ctx.fillRect(px + 4, py + 10, 16, 26);
    ctx.fillStyle = '#b0bac4';
    ctx.fillRect(px + 6, py + 12, 8, 22);
    // Dome top
    ctx.fillStyle = '#a83232';
    ctx.fillRect(px + 4, py + 6, 16, 4);

    // Wooden Perimeter Fence
    ctx.fillStyle = '#a6723c';
    ctx.fillRect(px + 2, py + 54, 26, 3);
    ctx.fillRect(px + 2, py + 48, 3, 10);
    ctx.fillRect(px + 14, py + 48, 3, 10);
    ctx.fillRect(px + 26, py + 48, 3, 10);

    // Selection box
    if (this.selected) {
      ctx.strokeStyle = '#2ecc71';
      ctx.lineWidth = 2;
      ctx.strokeRect(px - 2, py - 2, this.width + 4, this.height + 4);
    }

    // Overhead Health Bar
    if (this.hp < this.maxHp || this.selected) {
      const barW = this.width;
      const barH = 5;
      const bx = px;
      const by = py - 14;
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
window.Farm = Farm;
