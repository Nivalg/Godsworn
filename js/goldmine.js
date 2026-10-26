// Godsworn Gold Mine Structure Class
class GoldMine {
  constructor(tileCol, tileRow, gameMap, goldAmount = 12500) {
    const cfg = typeof CONFIG !== 'undefined' ? CONFIG : window.CONFIG;

    this.tileCol = tileCol;
    this.tileRow = tileRow;
    this.widthTiles = 2;
    this.heightTiles = 2;
    this.tileSize = cfg ? cfg.TILE_SIZE : 32;

    this.worldX = tileCol * this.tileSize;
    this.worldY = tileRow * this.tileSize;
    this.width = this.widthTiles * this.tileSize;
    this.height = this.heightTiles * this.tileSize;

    this.name = 'Gold Mine';
    this.goldRemaining = goldAmount;
    this.maxGold = goldAmount;
    this.selected = false;

    // Sequential Mining Queue
    this.miningQueue = []; // Array of Serf workers waiting outside mine
    this.currentMiner = null; // Serf currently inside mine
    this.miningTimer = 0; // Ticks counter inside mine (180 ticks = 3.0s)

    // Register 2x2 footprint in game map building mask
    if (gameMap && gameMap.blockBuilding) {
      gameMap.blockBuilding(tileCol, tileRow, this.widthTiles, this.heightTiles);
    }
  }

  requestMineEntry(serf) {
    if (!serf) return;
    if (!this.miningQueue.includes(serf) && this.currentMiner !== serf) {
      this.miningQueue.push(serf);
    }
  }

  removeWorker(serf) {
    this.miningQueue = this.miningQueue.filter(u => u !== serf);
    if (this.currentMiner === serf) {
      if (this.currentMiner) this.currentMiner.insideMine = false;
      this.currentMiner = null;
      this.miningTimer = 0;
    }
  }

  update(townHall = null, gameMap = null) {
    // Clean up inactive queue items
    this.miningQueue = this.miningQueue.filter(u => u && u.harvestState === 'waiting_for_mine');

    // 1. Process Queue -> Next worker enters mine if empty
    if (!this.currentMiner && this.miningQueue.length > 0) {
      this.currentMiner = this.miningQueue.shift();
      this.miningTimer = 0;
      if (this.currentMiner) {
        this.currentMiner.insideMine = true; // Serf DISAPPEARS into mine!
        this.currentMiner.harvestState = 'mining_inside';
        this.currentMiner.path = [];
      }
    }

    // 2. Worker inside mine mining gold for 3 seconds
    if (this.currentMiner) {
      this.miningTimer++;
      this.currentMiner.insideMine = true;

      // Keep position at mine entrance
      this.currentMiner.x = (this.tileCol + 1) * this.tileSize;
      this.currentMiner.y = (this.tileRow + 2) * this.tileSize;

      if (this.miningTimer >= 180) { // 3 SECONDS INSIDE MINE (180 ticks = 3.0s)
        const mined = this.harvestGold(10);
        this.currentMiner.carriedResourceType = 'gold';
        this.currentMiner.carriedAmount = mined;

        // Serf REAPPEARS out of mine carrying gold nuggets!
        this.currentMiner.insideMine = false;
        this.currentMiner.harvestState = 'returning_to_base';

        if (townHall) {
          this.currentMiner.moveTo(townHall.tileCol + 1, townHall.tileRow + 3, gameMap, townHall);
        }

        this.currentMiner = null;
        this.miningTimer = 0;
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

  harvestGold(amount = 10) {
    const extracted = Math.min(amount, this.goldRemaining);
    this.goldRemaining -= extracted;
    return extracted;
  }

  render(ctx, camera) {
    const screenPos = camera.worldToScreen(this.worldX, this.worldY);
    const px = Math.floor(screenPos.x);
    const py = Math.floor(screenPos.y);

    // 1. Rock Mountain Base (64x64 px)
    ctx.fillStyle = '#3a3f44';
    ctx.fillRect(px, py + 8, 64, 56);
    ctx.fillStyle = '#4c535a';
    ctx.fillRect(px + 4, py + 4, 56, 48);

    // Mountain shading & highlights
    ctx.fillStyle = '#656d76';
    ctx.fillRect(px + 6, py + 6, 24, 20);
    ctx.fillRect(px + 32, py + 12, 20, 16);

    // 2. Dark Cave Entrance
    ctx.fillStyle = '#14171a';
    ctx.beginPath();
    ctx.arc(px + 32, py + 48, 16, Math.PI, 0, false);
    ctx.fillRect(px + 16, py + 48, 32, 16);
    ctx.fill();

    // 3. Wooden Support Beams
    ctx.fillStyle = '#5c3a1e';
    ctx.fillRect(px + 14, py + 36, 4, 28);
    ctx.fillRect(px + 46, py + 36, 4, 28);
    ctx.fillRect(px + 14, py + 34, 36, 5);

    // 4. Gold Ore Veins & Sparkling Gold Nuggets
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(px + 8, py + 22, 6, 6);
    ctx.fillRect(px + 48, py + 18, 8, 6);
    ctx.fillRect(px + 22, py + 12, 8, 5);
    ctx.fillRect(px + 26, py + 52, 12, 4);

    // Sparkle highlights
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px + 10, py + 23, 2, 2);
    ctx.fillRect(px + 50, py + 19, 2, 2);
    ctx.fillRect(px + 24, py + 13, 2, 2);

    // 5. Selection ring/box when selected
    if (this.selected) {
      const cfg = typeof CONFIG !== 'undefined' ? CONFIG : window.CONFIG;
      ctx.strokeStyle = (cfg && cfg.COLORS) ? cfg.COLORS.SELECTION : '#2ecc71';
      ctx.lineWidth = 2;
      ctx.strokeRect(px - 2, py - 2, this.width + 4, this.height + 4);
    }
  }
}
window.GoldMine = GoldMine;
