// Godsworn Game Map & Terrain Engine
class GameMap {
  constructor() {
    const cfg = typeof CONFIG !== 'undefined' ? CONFIG : window.CONFIG;
    this.cols = cfg.MAP_COLS;
    this.rows = cfg.MAP_ROWS;
    this.tileSize = cfg.TILE_SIZE;
    this.grid = [];
    this.buildingMask = Array(this.rows).fill(0).map(() => Array(this.cols).fill(false));
    // Fog of War Grid: 0 = UNEXPLORED (Black Shroud), 1 = EXPLORED (Fog State), 2 = VISIBLE (Active Vision Bubble)
    this.fogGrid = Array(this.rows).fill(0).map(() => Array(this.cols).fill(0));
    this.initTerrain();
  }

  updateFogOfWar(playerUnits = [], townHall = null, farms = [], barracksList = []) {
    // Step 1: Transition current VISIBLE (2) tiles to EXPLORED (1)
    // EXPLORED (1) permanently removes the pitch black shroud from scouted territory
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.fogGrid[r][c] === 2) {
          this.fogGrid[r][c] = 1; // Scouted terrain permanently unshrouded
        }
      }
    }

    // Step 2: Gather all active player vision sources
    const visionSources = [];

    // Player Units (8 tiles vision radius ~256px for wide, crystal-clear vision around characters)
    if (playerUnits && playerUnits.length > 0) {
      playerUnits.forEach(u => {
        if (u && u.hp > 0 && !u.isEnemy && !u.insideMine) {
          visionSources.push({ col: u.tileCol, row: u.tileRow, radius: 8 });
        }
      });
    }

    // Castle Keep / Town Hall (10 tiles vision radius ~320px)
    if (townHall && townHall.hp > 0) {
      const centerC = townHall.tileCol + Math.floor(townHall.widthTiles / 2);
      const centerR = townHall.tileRow + Math.floor(townHall.heightTiles / 2);
      visionSources.push({ col: centerC, row: centerR, radius: 10 });
    }

    // Farms (8 tiles vision radius)
    if (farms && farms.length > 0) {
      farms.forEach(f => {
        if (f && f.hp > 0) {
          const centerC = f.tileCol + Math.floor(f.widthTiles / 2);
          const centerR = f.tileRow + Math.floor(f.heightTiles / 2);
          visionSources.push({ col: centerC, row: centerR, radius: 8 });
        }
      });
    }

    // Barracks (8 tiles vision radius)
    if (barracksList && barracksList.length > 0) {
      barracksList.forEach(b => {
        if (b && b.hp > 0) {
          const centerC = b.tileCol + Math.floor(b.widthTiles / 2);
          const centerR = b.tileRow + Math.floor(b.heightTiles / 2);
          visionSources.push({ col: centerC, row: centerR, radius: 8 });
        }
      });
    }

    // Step 3: Apply active vision bubbles
    visionSources.forEach(src => {
      const minR = Math.max(0, src.row - src.radius);
      const maxR = Math.min(this.rows - 1, src.row + src.radius);
      const minC = Math.max(0, src.col - src.radius);
      const maxC = Math.min(this.cols - 1, src.col + src.radius);

      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          const dist = Math.hypot(c - src.col, r - src.row);
          if (dist <= src.radius) {
            this.fogGrid[r][c] = 2; // VISIBLE (Bright Active Vision)
          }
        }
      }
    });
  }

  isTileVisible(col, row) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
    return this.fogGrid && this.fogGrid[row] && this.fogGrid[row][col] === 2;
  }

  isTileExplored(col, row) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
    return this.fogGrid && this.fogGrid[row] && this.fogGrid[row][col] >= 1;
  }

  blockBuilding(col, row, widthTiles = 3, heightTiles = 3) {
    for (let r = row; r < row + heightTiles; r++) {
      for (let c = col; c < col + widthTiles; c++) {
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
          this.buildingMask[r][c] = true;
        }
      }
    }
  }

  unblockBuilding(col, row, widthTiles = 3, heightTiles = 3) {
    for (let r = row; r < row + heightTiles; r++) {
      for (let c = col; c < col + widthTiles; c++) {
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
          this.buildingMask[r][c] = false;
        }
      }
    }
  }

  isWalkable(col, row) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
      return false;
    }
    if (this.buildingMask && this.buildingMask[row] && this.buildingMask[row][col]) {
      return false; // Building obstacle
    }
    const terrainType = this.grid[row][col];
    const cfg = typeof CONFIG !== 'undefined' ? CONFIG : window.CONFIG;
    return cfg && cfg.WALKABLE ? cfg.WALKABLE[terrainType] === true : true;
  }

  initTerrain() {
    const cfg = typeof CONFIG !== 'undefined' ? CONFIG : window.CONFIG;
    // Fill base map with grass
    for (let r = 0; r < this.rows; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.cols; c++) {
        this.grid[r][c] = cfg.TERRAIN.GRASS;
      }
    }

    // 1. Generate North & West Dense Forest Borders (Trees)
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (Math.random() < 0.85) this.grid[r][c] = cfg.TERRAIN.TREE;
      }
    }
    for (let r = 5; r < this.rows; r++) {
      for (let c = 0; c < 3; c++) {
        if (Math.random() < 0.8) this.grid[r][c] = cfg.TERRAIN.TREE;
      }
    }

    // 2. Winding River on the East
    for (let r = 0; r < this.rows; r++) {
      const riverCenterX = Math.floor(30 + Math.sin(r / 5) * 2);
      for (let c = riverCenterX; c < riverCenterX + 4; c++) {
        if (c >= 0 && c < this.cols) {
          this.grid[r][c] = cfg.TERRAIN.WATER;
        }
      }
    }

    // Bridge crossing over river at row 20
    for (let c = 28; c <= 34; c++) {
      if (c >= 0 && c < this.cols) {
        this.grid[20][c] = cfg.TERRAIN.DIRT;
        this.grid[21][c] = cfg.TERRAIN.DIRT;
      }
    }

    // 3. Dirt Path leading from base (col 14, row 20) to bridge (col 28, row 20)
    for (let c = 14; c <= 28; c++) {
      this.grid[20][c] = cfg.TERRAIN.DIRT;
      this.grid[21][c] = cfg.TERRAIN.DIRT;
    }

    // 4. Tree Groves outside player area
    this.addTreeCluster(10, 8, 3);
    this.addTreeCluster(38, 8, 4);
    this.addTreeCluster(48, 22, 4);

    // 5. Ensure wide open green meadow around Player Base (col 3..27, row 6..34)
    for (let r = 6; r <= 34; r++) {
      for (let c = 3; c <= 27; c++) {
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
          if (this.grid[r][c] !== cfg.TERRAIN.DIRT) {
            this.grid[r][c] = cfg.TERRAIN.GRASS;
          }
        }
      }
    }
  }

  addTreeCluster(startCol, startRow, radius) {
    const cfg = typeof CONFIG !== 'undefined' ? CONFIG : window.CONFIG;
    for (let r = startRow - radius; r <= startRow + radius; r++) {
      for (let c = startCol - radius; c <= startCol + radius; c++) {
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
          if (Math.hypot(c - startCol, r - startRow) <= radius) {
            this.grid[r][c] = cfg.TERRAIN.TREE;
          }
        }
      }
    }
  }

  setTile(col, row, type) {
    if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
      this.grid[row][col] = type;
    }
  }

  render(ctx, camera) {
    ctx.imageSmoothingEnabled = false;
    const cfg = typeof CONFIG !== 'undefined' ? CONFIG : window.CONFIG;
    const bounds = camera.getVisibleTileBounds();
    const tileset = (typeof AssetManager !== 'undefined') ? AssetManager.get('tileset') : null;

    for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
      for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
        const screenPos = camera.worldToScreen(c * this.tileSize, r * this.tileSize);
        const px = Math.floor(screenPos.x);
        const py = Math.floor(screenPos.y);

        const tileType = this.grid[r][c];

        if (typeof World !== 'undefined' && World.renderTile) {
          World.renderTile(ctx, tileset, tileType, px, py, r, c, this);
        } else {
          // Fallback if World is not present
          ctx.fillStyle = '#2d5a1e';
          ctx.fillRect(px, py, 32, 32);
        }

        // Render Fog of War Overlay over Tile
        const fogState = this.fogGrid ? (this.fogGrid[r] ? this.fogGrid[r][c] : 0) : 2;
        if (fogState === 0) {
          // UNEXPLORED: Absolute Black Pitch Shroud
          ctx.fillStyle = '#000000';
          ctx.fillRect(px, py, 32, 32);
        } else if (fogState === 1) {
          // EXPLORED: Scouted Terrain (Black Shroud permanently removed, subtle light 25% fog tint)
          ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
          ctx.fillRect(px, py, 32, 32);
        }
        // VISIBLE (2): 0% Overlay (100% crystal-clear bright vision around characters)
      }
    }
  }

  renderMinimap(ctx, minimapWidth, minimapHeight) {
    const cfg = typeof CONFIG !== 'undefined' ? CONFIG : window.CONFIG;

    ctx.fillStyle = '#000000'; // Unexplored minimap background
    ctx.fillRect(0, 0, minimapWidth, minimapHeight);

    const cellW = minimapWidth / this.cols;
    const cellH = minimapHeight / this.rows;

    for (let r = 0; r < this.rows; r += 2) {
      for (let c = 0; c < this.cols; c += 2) {
        const fogState = this.fogGrid ? (this.fogGrid[r] ? this.fogGrid[r][c] : 0) : 2;

        if (fogState === 0) {
          // UNEXPLORED (Black Pitch Shroud)
          ctx.fillStyle = '#000000';
        } else if (fogState === 1) {
          // EXPLORED (Permanently Unshrouded Scouted Terrain)
          const type = this.grid[r][c];
          if (type === cfg.TERRAIN.GRASS) ctx.fillStyle = '#214216';
          else if (type === cfg.TERRAIN.DIRT) ctx.fillStyle = '#4a331f';
          else if (type === cfg.TERRAIN.TREE) ctx.fillStyle = '#0e260e';
          else if (type === cfg.TERRAIN.WATER) ctx.fillStyle = '#0f2b45';
          else ctx.fillStyle = '#34383c';
        } else {
          // VISIBLE (Bright Active Terrain Colors)
          const type = this.grid[r][c];
          if (type === cfg.TERRAIN.GRASS) ctx.fillStyle = '#2d5a1e';
          else if (type === cfg.TERRAIN.DIRT) ctx.fillStyle = '#65462a';
          else if (type === cfg.TERRAIN.TREE) ctx.fillStyle = '#133513';
          else if (type === cfg.TERRAIN.WATER) ctx.fillStyle = '#143b5e';
          else ctx.fillStyle = '#4a5056';
        }

        ctx.fillRect(c * cellW, r * cellH, cellW * 2, cellH * 2);
      }
    }
  }
}
window.GameMap = GameMap;
