// Town Hall / Castle Building Class
class TownHall {
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

    const factionBuilding = fac && fac.HEAVENLY_HOST ? fac.HEAVENLY_HOST.buildings.townHall : null;
    this.name = factionBuilding ? factionBuilding.name : 'Castle Keep';
    this.hp = factionBuilding ? factionBuilding.hp : 1440;
    this.maxHp = factionBuilding ? factionBuilding.maxHp : 1440;
    this.selected = false;
    this.isBuilding = true;
    this.team = 1;
    this.hitRadius = Math.max(this.width, this.height) / 2;
    this.buildQueue = []; // Training queue [{ unitType, name, totalTime: 20, remainingTime: 20 }]
    this.rallyPoint = null; // { type: 'goldmine' | 'tree' | 'ground', col, row, goldMine }
    this.floatingTexts = [];
    this.hitEffectTimer = 0;

    // Register 3x3 footprint as non-walkable obstacle in game map
    gameMap.blockBuilding(tileCol, tileRow, this.widthTiles, this.heightTiles);
  }

  takeDamage(amount, attacker = null) {
    if (this.hp <= 0) return;
    this.hp = Math.max(0, this.hp - amount);
    this.hitEffectTimer = 10;
    if (!this.floatingTexts) this.floatingTexts = [];
    this.floatingTexts.push({
      text: `-${amount}`,
      x: this.worldX + this.width / 2,
      y: this.worldY + 15,
      alpha: 1.0,
      life: 35
    });
  }

  queueTrainSerf() {
    if (this.buildQueue.length >= 5) {
      return false; // Queue full! Max 5 items allowed
    }
    this.buildQueue.push({
      unitType: 'peasant',
      name: 'Serf',
      icon: '👨‍🌾',
      totalTime: 20,
      remainingTime: 20
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

    if (this.buildQueue.length > 0) {
      const current = this.buildQueue[0];
      current.remainingTime -= (1 / 60);

      if (current.remainingTime <= 0) {
        const UnitClass = typeof Unit !== 'undefined' ? Unit : window.Unit;
        if (UnitClass) {
          const spawnCol = this.tileCol + 3;
          const spawnRow = this.tileRow + 1;
          const newUnit = new UnitClass(spawnCol, spawnRow, current.unitType);
          units.push(newUnit);

          // Auto-command newly trained unit to active Rally Point!
          if (this.rallyPoint) {
            if ((this.rallyPoint.type === 'goldmine' || this.rallyPoint.type === 'tree') && newUnit.assignHarvestTask) {
              newUnit.assignHarvestTask(this.rallyPoint, gameMap, this);
            } else if (this.rallyPoint.type === 'ground' && newUnit.moveTo) {
              newUnit.moveTo(this.rallyPoint.col, this.rallyPoint.row, gameMap, this);
            }
          }
        }
        this.buildQueue.shift();
      }
    }
  }

  isTileOccupied(col, row) {
    return col >= this.tileCol && col < this.tileCol + this.widthTiles &&
           row >= this.tileRow && row < this.tileRow + this.heightTiles;
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

    // Render Town Hall Castle Keep directly with solid pixel art
    // 1. Soft rounded foundation shadow (sits directly on grass layer)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(px + 48, py + 88, 44, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Stone Main Walls (Castle Keep 80x64)
    ctx.fillStyle = '#5c646c';
    ctx.fillRect(px + 8, py + 24, 80, 64);

    // 3. Wall shading & brick texture
    ctx.fillStyle = '#3f454b';
    ctx.fillRect(px + 8, py + 80, 80, 8);
    ctx.fillRect(px + 80, py + 24, 8, 64);

    ctx.fillStyle = '#7a848e';
    for (let y = 30; y < 80; y += 10) {
      for (let x = 12; x < 76; x += 16) {
        ctx.fillRect(px + x + ((y / 10) % 2 * 8), py + y, 12, 6);
      }
    }

    // 4. Twin Corner Towers
    const towers = [
      { x: 4, y: 16, w: 20, h: 72 },
      { x: 72, y: 16, w: 20, h: 72 }
    ];

    towers.forEach(t => {
      ctx.fillStyle = '#4a5056';
      ctx.fillRect(px + t.x, py + t.y, t.w, t.h);
      ctx.fillStyle = '#78828c';
      ctx.fillRect(px + t.x + 2, py + t.y + 4, t.w - 4, 10);
      // Tower Crenellations
      ctx.fillStyle = '#33383d';
      ctx.fillRect(px + t.x, py + t.y, 4, 6);
      ctx.fillRect(px + t.x + 8, py + t.y, 4, 6);
      ctx.fillRect(px + t.x + 16, py + t.y, 4, 6);
    });

    // 5. Wooden Gable Roof Structure
    ctx.fillStyle = '#82481e';
    ctx.fillRect(px + 28, py + 12, 40, 28);
    ctx.fillStyle = '#a65e28';
    ctx.fillRect(px + 32, py + 16, 32, 20);

    // 6. Entrance Gate / Arched Doorway
    ctx.fillStyle = '#2b1a0e';
    ctx.fillRect(px + 38, py + 60, 20, 28);
    ctx.fillStyle = '#140c06';
    ctx.fillRect(px + 40, py + 62, 16, 26);
    ctx.fillRect(px + 42, py + 58, 12, 4);

    // 7. Royal Blue Alliance Banner Flag
    ctx.fillStyle = '#d4af37'; // Flag pole
    ctx.fillRect(px + 80, py + 0, 2, 24);
    ctx.fillStyle = '#1c69d4'; // Banner
    ctx.fillRect(px + 82, py + 0, 10, 16);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px + 84, py + 4, 6, 8);

    // 8. Selection highlight box when building is selected
    if (this.selected) {
      const cfg = typeof CONFIG !== 'undefined' ? CONFIG : window.CONFIG;
      ctx.strokeStyle = (cfg && cfg.COLORS) ? cfg.COLORS.SELECTION : '#2ecc71';
      ctx.lineWidth = 2;
      ctx.strokeRect(px - 2, py - 2, this.width + 4, this.height + 4);
    }

    // 9. Build Progress Bar Overhead
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

    // 10. Render active Rally Point line & flag indicator
    if (this.selected && this.rallyPoint) {
      const startX = this.worldX + this.width / 2;
      const startY = this.worldY + this.height * 0.8;
      const targetX = (this.rallyPoint.col + 0.5) * this.tileSize;
      const targetY = (this.rallyPoint.row + 0.5) * this.tileSize;

      const pStart = camera.worldToScreen(startX, startY);
      const pTarget = camera.worldToScreen(targetX, targetY);

      // Dashed line
      ctx.save();
      ctx.strokeStyle = '#2ecc71';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(pStart.x, pStart.y);
      ctx.lineTo(pTarget.x, pTarget.y);
      ctx.stroke();
      ctx.restore();

      // Rally Flag
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
window.TownHall = TownHall;
