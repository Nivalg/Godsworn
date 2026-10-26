// Godsworn Barracks Building Class ($3 x 3$ Footprint, Military Production)
class Barracks {
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

    const buildingConfig = fac && fac.HEAVENLY_HOST ? fac.HEAVENLY_HOST.buildings.barracks : null;
    this.name = buildingConfig ? buildingConfig.name : 'Barracks';
    this.hp = buildingConfig ? buildingConfig.hp : 960;
    this.maxHp = buildingConfig ? buildingConfig.maxHp : 960;
    this.selected = false;
    this.isBuilding = true;
    this.team = 1;
    this.hitRadius = Math.max(this.width, this.height) / 2;
    this.floatingTexts = [];
    this.hitEffectTimer = 0;

    // Construction & Production Properties
    this.isConstructed = false;
    this.buildProgress = 0.0; // 0.0 to 1.0
    this.buildQueue = []; // [{ unitType: 'footman', name: 'Footman', icon: '⚔️', totalTime: 15, remainingTime: 15 }]
    this.rallyPoint = null;

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

  queueTrainFootman() {
    if (this.buildQueue.length >= 5) {
      return false; // Queue full! Max 5 items
    }
    this.buildQueue.push({
      unitType: 'footman',
      name: 'Footman',
      icon: '⚔️',
      totalTime: 15,
      remainingTime: 15
    });
    return true;
  }

  hasSawmill(sawmills = []) {
    if (!sawmills) return false;
    return sawmills.some(s => s && s.hp > 0 && s.isConstructed);
  }

  queueTrainArcher(sawmills = []) {
    if (!this.hasSawmill(sawmills)) {
      return false; // Sawmill / Lumber Mill tech requirement missing!
    }
    if (this.buildQueue.length >= 5) {
      return false; // Queue full! Max 5 items
    }
    this.buildQueue.push({
      unitType: 'archer',
      name: 'Archer',
      icon: '🏹',
      totalTime: 16,
      remainingTime: 16
    });
    return true;
  }

  cancelQueueItem(index = 0) {
    if (index >= 0 && index < this.buildQueue.length) {
      this.buildQueue.splice(index, 1);
      return true;
    }
    return false;
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

    if (this.isConstructed && this.buildQueue.length > 0) {
      const current = this.buildQueue[0];
      current.remainingTime -= (1 / 60);

      if (current.remainingTime <= 0) {
        const UnitClass = typeof Unit !== 'undefined' ? Unit : window.Unit;
        if (UnitClass) {
          const spawnCol = this.tileCol + 3;
          const spawnRow = this.tileRow + 1;
          const newSoldier = new UnitClass(spawnCol, spawnRow, current.unitType);
          units.push(newSoldier);

          // Auto-command to active Barracks Rally Point
          if (this.rallyPoint && newSoldier.moveTo) {
            newSoldier.moveTo(this.rallyPoint.col, this.rallyPoint.row, gameMap);
          }
        }
        this.buildQueue.shift();
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
      // 1. Under Construction Scaffolding Frame (96x96)
      ctx.fillStyle = '#1c140a';
      ctx.fillRect(px + 4, py + 86, 88, 8);

      // Scaffolding posts
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

    // 2. Completed Barracks 16-Bit Pixel Art (96x96)
    // Soft rounded foundation shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(px + 48, py + 88, 44, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stone Main Structure
    ctx.fillStyle = '#4a5056';
    ctx.fillRect(px + 8, py + 28, 80, 60);
    ctx.fillStyle = '#33383d';
    ctx.fillRect(px + 8, py + 80, 80, 8);

    // Timber Roof
    ctx.fillStyle = '#82481e';
    ctx.fillRect(px + 4, py + 12, 88, 20);
    ctx.fillStyle = '#a65e28';
    ctx.fillRect(px + 8, py + 16, 80, 12);

    // Entrance Gate
    ctx.fillStyle = '#2b1a0e';
    ctx.fillRect(px + 36, py + 54, 24, 34);
    ctx.fillStyle = '#140c06';
    ctx.fillRect(px + 38, py + 56, 20, 32);

    // Weapon Racks & Target Dummy (Training arena)
    ctx.fillStyle = '#8c5a2b';
    ctx.fillRect(px + 12, py + 48, 16, 4); // Rack frame
    ctx.fillStyle = '#b0bac4';
    ctx.fillRect(px + 14, py + 42, 2, 10); // Swords
    ctx.fillRect(px + 18, py + 40, 2, 12);
    ctx.fillRect(px + 22, py + 42, 2, 10);

    // Target Dummy
    ctx.fillStyle = '#c7a72c';
    ctx.beginPath();
    ctx.arc(px + 76, px ? py + 46 : py + 46, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6b4c2b';
    ctx.fillRect(px + 75, py + 51, 2, 14);

    // Alliance Banner Flag
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(px + 80, py + 0, 2, 24);
    ctx.fillStyle = '#1c69d4';
    ctx.fillRect(px + 82, py + 0, 10, 16);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px + 84, py + 4, 6, 8);

    // Selection highlight
    if (this.selected) {
      const cfg = typeof CONFIG !== 'undefined' ? CONFIG : window.CONFIG;
      ctx.strokeStyle = (cfg && cfg.COLORS) ? cfg.COLORS.SELECTION : '#2ecc71';
      ctx.lineWidth = 2;
      ctx.strokeRect(px - 2, py - 2, this.width + 4, this.height + 4);
    }

    // Overhead training progress bar
    if (this.buildQueue && this.buildQueue.length > 0) {
      const current = this.buildQueue[0];
      const pct = Math.max(0, Math.min(1.0, 1 - (current.remainingTime / current.totalTime)));
      ctx.fillStyle = '#000000';
      ctx.fillRect(px + 8, py - 12, 80, 7);
      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(px + 9, py - 11, Math.floor(78 * pct), 5);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 8, py - 12, 80, 7);
    }

    // Active Rally Point line & flag indicator
    if (this.selected && this.rallyPoint) {
      const startX = this.worldX + this.width / 2;
      const startY = this.worldY + this.height * 0.8;
      const targetX = (this.rallyPoint.col + 0.5) * this.tileSize;
      const targetY = (this.rallyPoint.row + 0.5) * this.tileSize;

      const pStart = camera.worldToScreen(startX, startY);
      const pTarget = camera.worldToScreen(targetX, targetY);

      ctx.save();
      ctx.strokeStyle = '#2ecc71';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(pStart.x, pStart.y);
      ctx.lineTo(pTarget.x, pTarget.y);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      const tx = Math.floor(pTarget.x);
      const ty = Math.floor(pTarget.y);
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(tx - 1, ty - 16, 2, 16);
      ctx.fillStyle = '#2ecc71';
      ctx.beginPath();
      ctx.moveTo(tx + 1, ty - 16);
      ctx.lineTo(tx + 12, ty - 11);
      ctx.lineTo(tx + 1, ty - 6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#2ecc71';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(tx, ty, 8, 4, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
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
window.Barracks = Barracks;
