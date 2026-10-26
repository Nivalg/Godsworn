// Touch & Pointer Controller Manager for Pan Mode vs Box Select Mode
class TouchController {
  constructor(canvas, camera, gameMap, townHall, goldMine, units, uiManager, farms = [], barracksList = [], sawmills = []) {
    this.canvas = canvas;
    this.camera = camera;
    this.gameMap = gameMap;
    this.townHall = townHall;
    this.goldMine = goldMine;
    this.units = units;
    this.uiManager = uiManager;
    this.farms = farms;
    this.barracksList = barracksList;
    this.sawmills = sawmills;

    // Control Modes: 'PAN' or 'BOX'
    this.mode = 'PAN';
    this.placementMode = null; // null or { buildingType: 'farm'|'barracks'|'sawmill', widthTiles: 2|3, heightTiles: 2|3 }

    // Touch/Pointer State
    this.isPointerDown = false;
    this.startScreenX = 0;
    this.startScreenY = 0;
    this.currentScreenX = 0;
    this.currentScreenY = 0;
    this.lastScreenX = 0;
    this.lastScreenY = 0;

    this.dragDistance = 0;
    this.isDragging = false;
    this.dragThreshold = 8; // Pixels drag threshold to distinguish tap vs drag

    // Single Ground Move Target Marker
    this.moveMarker = null; // { x, y, radius, alpha }

    this.setupListeners();
  }

  setMode(newMode, isUserToggle = false) {
    if (isUserToggle && newMode !== this.mode) {
      this.previousMode = this.mode;
    }
    this.mode = newMode;
    this.isPointerDown = false;
    this.isDragging = false;
  }

  startPlacement(buildingType = 'farm') {
    const widthTiles = (buildingType === 'barracks' || buildingType === 'sawmill') ? 3 : 2;
    const heightTiles = (buildingType === 'barracks' || buildingType === 'sawmill') ? 3 : 2;
    this.placementMode = { buildingType, widthTiles, heightTiles };
    if (this.uiManager && this.uiManager.unitStats) {
      if (buildingType === 'barracks') {
        this.uiManager.unitStats.textContent = '⚔️ Placement Mode: Tap ground to place Barracks (150g, 50l)';
      } else if (buildingType === 'sawmill') {
        this.uiManager.unitStats.textContent = '🪵 Placement Mode: Tap ground to place Sawmill (120g, 100l)';
      } else {
        this.uiManager.unitStats.textContent = '🌾 Placement Mode: Tap ground to place Grain Farm (100g, 25l)';
      }
    }
  }

  cancelPlacement() {
    this.placementMode = null;
  }

  isPlacementValid(tileCol, tileRow, widthTiles = 2, heightTiles = 2) {
    const cfg = typeof CONFIG !== 'undefined' ? CONFIG : window.CONFIG;
    const mapCols = cfg ? cfg.MAP_COLS : 36;
    const mapRows = cfg ? cfg.MAP_ROWS : 54;

    if (tileCol < 0 || tileRow < 0 || tileCol + widthTiles > mapCols || tileRow + heightTiles > mapRows) {
      return false;
    }

    for (let r = tileRow; r < tileRow + heightTiles; r++) {
      for (let c = tileCol; c < tileCol + widthTiles; c++) {
        if (!this.gameMap || !this.gameMap.isWalkable(c, r)) return false;
        if (this.townHall && this.townHall.isTileOccupied && this.townHall.isTileOccupied(c, r)) return false;
        if (this.goldMine && this.goldMine.containsWorldPoint((c + 0.5) * 32, (r + 0.5) * 32)) return false;
        if (this.farms && this.farms.some(f => f.containsWorldPoint((c + 0.5) * 32, (r + 0.5) * 32))) return false;
        if (this.barracksList && this.barracksList.some(b => b.containsWorldPoint((c + 0.5) * 32, (r + 0.5) * 32))) return false;
        if (this.sawmills && this.sawmills.some(s => s.containsWorldPoint((c + 0.5) * 32, (r + 0.5) * 32))) return false;
      }
    }
    return true;
  }

  setupListeners() {
    this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', (e) => this.onPointerUp(e));
    window.addEventListener('pointercancel', (e) => this.onPointerUp(e));
  }

  onPointerDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.isPointerDown = true;
    this.startScreenX = e.clientX - rect.left;
    this.startScreenY = e.clientY - rect.top;
    this.currentScreenX = this.startScreenX;
    this.currentScreenY = this.startScreenY;
    this.lastScreenX = this.startScreenX;
    this.lastScreenY = this.startScreenY;
    this.dragDistance = 0;
    this.isDragging = false;
  }

  onPointerMove(e) {
    if (!this.isPointerDown && !this.placementMode) return;

    const rect = this.canvas.getBoundingClientRect();
    this.currentScreenX = e.clientX - rect.left;
    this.currentScreenY = e.clientY - rect.top;

    if (this.isPointerDown) {
      const dx = this.currentScreenX - this.lastScreenX;
      const dy = this.currentScreenY - this.lastScreenY;

      this.dragDistance += Math.hypot(dx, dy);

      if (this.dragDistance > this.dragThreshold) {
        this.isDragging = true;
      }

      if (this.isDragging && this.mode === 'PAN') {
        // Pan camera by touch drag
        this.camera.pan(dx, dy);
      }
    }

    this.lastScreenX = this.currentScreenX;
    this.lastScreenY = this.currentScreenY;
  }

  onPointerUp(e) {
    if (!this.isPointerDown) return;

    if (!this.isDragging) {
      // Handle Tap Action (Tap Unit / Move Command)
      this.handleTap(this.startScreenX, this.startScreenY);
    } else if (this.mode === 'BOX' && !this.placementMode) {
      // Handle Box Marquee Selection
      this.handleBoxSelect();
    }

    this.isPointerDown = false;
    this.isDragging = false;

    // Auto-revert control mode back to previous mode if user toggled for pan or selection
    if (this.previousMode) {
      const modeToRestore = this.previousMode;
      this.previousMode = null;
      this.mode = modeToRestore;
      if (this.uiManager) {
        this.uiManager.setModeDisplay(modeToRestore);
      }
    }
  }

  handleTap(screenX, screenY) {
    const cfg = typeof CONFIG !== 'undefined' ? CONFIG : window.CONFIG;
    const tileSize = cfg ? cfg.TILE_SIZE : 32;
    const worldPos = this.camera.screenToWorld(screenX, screenY);
    const tileCol = Math.floor(worldPos.x / tileSize);
    const tileRow = Math.floor(worldPos.y / tileSize);

    // 0. Check if Building Placement Mode is active
    if (this.placementMode) {
      const wTiles = this.placementMode.widthTiles || 2;
      const hTiles = this.placementMode.heightTiles || 2;
      const isValid = this.isPlacementValid(tileCol, tileRow, wTiles, hTiles);
      if (!isValid) {
        if (this.uiManager && this.uiManager.unitStats) {
          this.uiManager.unitStats.textContent = '❌ Cannot build here! Location is blocked.';
        }
        return;
      }

      const res = cfg ? cfg.RESOURCES : null;
      if (this.placementMode.buildingType === 'barracks') {
        if (!res || res.GOLD < 150 || res.LUMBER < 50) {
          if (this.uiManager && this.uiManager.unitStats) {
            this.uiManager.unitStats.textContent = '❌ Need 150 Gold and 50 Lumber for Barracks!';
          }
          this.placementMode = null;
          return;
        }

        // Deduct Resources & Spawn Barracks
        res.GOLD -= 150;
        res.LUMBER -= 50;
        if (this.uiManager) this.uiManager.updateResources();

        const BarracksClass = typeof Barracks !== 'undefined' ? Barracks : window.Barracks;
        if (BarracksClass) {
          const barracks = new BarracksClass(tileCol, tileRow, this.gameMap);
          if (this.barracksList) this.barracksList.push(barracks);

          // Command selected workers to construct Barracks
          const selectedWorkers = this.units.filter(u => u.selected && u.isWorker);
          if (selectedWorkers.length > 0) {
            selectedWorkers.forEach(w => w.assignConstructTask(barracks, this.gameMap, this.townHall));
          }

          if (this.uiManager && this.uiManager.unitStats) {
            this.uiManager.unitStats.textContent = '🔨 Barracks placed! Worker constructing...';
          }
        }
      } else if (this.placementMode.buildingType === 'sawmill') {
        if (!res || res.GOLD < 120 || res.LUMBER < 100) {
          if (this.uiManager && this.uiManager.unitStats) {
            this.uiManager.unitStats.textContent = '❌ Need 120 Gold and 100 Lumber for Sawmill!';
          }
          this.placementMode = null;
          return;
        }

        // Deduct Resources & Spawn Sawmill
        res.GOLD -= 120;
        res.LUMBER -= 100;
        if (this.uiManager) this.uiManager.updateResources();

        const SawmillClass = typeof Sawmill !== 'undefined' ? Sawmill : window.Sawmill;
        if (SawmillClass) {
          const sawmill = new SawmillClass(tileCol, tileRow, this.gameMap);
          if (this.sawmills) this.sawmills.push(sawmill);

          // Command selected workers to construct Sawmill
          const selectedWorkers = this.units.filter(u => u.selected && u.isWorker);
          if (selectedWorkers.length > 0) {
            selectedWorkers.forEach(w => w.assignConstructTask(sawmill, this.gameMap, this.townHall));
          }

          if (this.uiManager && this.uiManager.unitStats) {
            this.uiManager.unitStats.textContent = '🔨 Sawmill placed! Worker constructing...';
          }
        }
      } else {
        if (!res || res.GOLD < 100 || res.LUMBER < 25) {
          if (this.uiManager && this.uiManager.unitStats) {
            this.uiManager.unitStats.textContent = '❌ Need 100 Gold and 25 Lumber for Farm!';
          }
          this.placementMode = null;
          return;
        }

        // Deduct Resources & Spawn Farm
        res.GOLD -= 100;
        res.LUMBER -= 25;
        if (this.uiManager) this.uiManager.updateResources();

        const FarmClass = typeof Farm !== 'undefined' ? Farm : window.Farm;
        if (FarmClass) {
          const farm = new FarmClass(tileCol, tileRow, this.gameMap);
          this.farms.push(farm);

          // Command selected workers to construct Farm
          const selectedWorkers = this.units.filter(u => u.selected && u.isWorker);
          if (selectedWorkers.length > 0) {
            selectedWorkers.forEach(w => w.assignConstructTask(farm, this.gameMap, this.townHall));
          }

          if (this.uiManager && this.uiManager.unitStats) {
            this.uiManager.unitStats.textContent = '🔨 Grain Farm placed! Worker constructing...';
          }
        }
      }

      this.placementMode = null;
      return;
    }

    // 1. Check if unit was tapped
    let tappedUnit = null;
    for (const unit of this.units) {
      if (unit.containsWorldPoint(worldPos.x, worldPos.y)) {
        tappedUnit = unit;
        break;
      }
    }

    if (tappedUnit) {
      if (tappedUnit.isEnemy) {
        const selectedSoldiers = this.units.filter(u => u.selected && !u.isWorker && !u.isEnemy);
        if (selectedSoldiers.length > 0) {
          // Direct Attack Command to selected player soldiers
          selectedSoldiers.forEach(s => {
            s.targetEnemy = tappedUnit;
            s.moveTo(tappedUnit.tileCol, tappedUnit.tileRow, this.gameMap, this.townHall);
          });
          if (this.uiManager && this.uiManager.unitStats) {
            this.uiManager.unitStats.textContent = `⚔️ Attacking ${tappedUnit.name}!`;
          }
          return;
        }
      }

      const now = Date.now();
      const isDoubleTap = (now - this.lastTapTime < 380) && (this.lastTappedUnit === tappedUnit);
      this.lastTapTime = now;
      this.lastTappedUnit = tappedUnit;

      if (isDoubleTap) {
        // Double-click: Select up to 5 nearest units of the same type
        this.deselectAll();
        const sameTypeUnits = this.units.filter(u => u.type === tappedUnit.type);
        sameTypeUnits.sort((a, b) => Math.hypot(a.x - tappedUnit.x, a.y - tappedUnit.y) - Math.hypot(b.x - tappedUnit.x, b.y - tappedUnit.y));
        const group = sameTypeUnits.slice(0, 5);
        group.forEach(u => u.selected = true);
        this.uiManager.updateSelection(tappedUnit, group.length);
      } else {
        // Single tap: Select single unit
        this.deselectAll();
        tappedUnit.selected = true;
        this.uiManager.updateSelection(tappedUnit, 1);
      }
      return;
    }

    // 2. Check if Town Hall was tapped
    if (this.townHall && this.townHall.containsWorldPoint(worldPos.x, worldPos.y)) {
      this.deselectAll();
      this.townHall.selected = true;
      this.uiManager.updateSelection(this.townHall);
      return;
    }

    // 3. Check if Farm was tapped
    if (this.farms) {
      const tappedFarm = this.farms.find(f => f.containsWorldPoint(worldPos.x, worldPos.y));
      if (tappedFarm) {
        const selectedWorkers = this.units.filter(u => u.selected && u.isWorker);
        if (selectedWorkers.length > 0 && !tappedFarm.isConstructed) {
          selectedWorkers.forEach(w => w.assignConstructTask(tappedFarm, this.gameMap, this.townHall));
        } else {
          this.deselectAll();
          tappedFarm.selected = true;
          this.uiManager.updateSelection(tappedFarm);
        }
        return;
      }
    }

    // 3b. Check if Barracks was tapped
    if (this.barracksList) {
      const tappedBarracks = this.barracksList.find(b => b.containsWorldPoint(worldPos.x, worldPos.y));
      if (tappedBarracks) {
        const selectedWorkers = this.units.filter(u => u.selected && u.isWorker);
        if (selectedWorkers.length > 0 && !tappedBarracks.isConstructed) {
          selectedWorkers.forEach(w => w.assignConstructTask(tappedBarracks, this.gameMap, this.townHall));
        } else {
          this.deselectAll();
          tappedBarracks.selected = true;
          this.uiManager.updateSelection(tappedBarracks);
        }
        return;
      }
    }

    // 3c. Check if Sawmill was tapped
    if (this.sawmills) {
      const tappedSawmill = this.sawmills.find(s => s.containsWorldPoint(worldPos.x, worldPos.y));
      if (tappedSawmill) {
        const selectedWorkers = this.units.filter(u => u.selected && u.isWorker);
        if (selectedWorkers.length > 0 && !tappedSawmill.isConstructed) {
          selectedWorkers.forEach(w => w.assignConstructTask(tappedSawmill, this.gameMap, this.townHall));
        } else {
          this.deselectAll();
          tappedSawmill.selected = true;
          this.uiManager.updateSelection(tappedSawmill);
        }
        return;
      }
    }

    // 4. Check if Gold Mine was tapped
    if (this.goldMine && this.goldMine.containsWorldPoint(worldPos.x, worldPos.y)) {
      const selectedWorkers = this.units.filter(u => u.selected && u.isWorker);
      if (selectedWorkers.length > 0) {
        selectedWorkers.forEach(w => w.assignHarvestTask({ type: 'goldmine', goldMine: this.goldMine, col: this.goldMine.tileCol + 1, row: this.goldMine.tileRow + 2 }, this.gameMap, this.townHall));
        this.moveMarker = { x: (this.goldMine.tileCol + 1) * tileSize, y: (this.goldMine.tileRow + 2) * tileSize, radius: 16, alpha: 1.0 };
      } else if (this.townHall && this.townHall.selected) {
        this.townHall.rallyPoint = { type: 'goldmine', goldMine: this.goldMine, col: this.goldMine.tileCol + 1, row: this.goldMine.tileRow + 2 };
        this.moveMarker = { x: (this.goldMine.tileCol + 1) * tileSize, y: (this.goldMine.tileRow + 2) * tileSize, radius: 16, alpha: 1.0 };
        this.uiManager.updateSelection(this.townHall);
      } else {
        this.deselectAll();
        this.goldMine.selected = true;
        this.uiManager.updateSelection(this.goldMine);
      }
      return;
    }

    // 5. Check if Tree tile was tapped
    const isTreeTile = this.gameMap && this.gameMap.grid[tileRow] && this.gameMap.grid[tileRow][tileCol] === (cfg ? cfg.TERRAIN.TREE : 2);
    const selectedWorkers = this.units.filter(u => u.selected && u.isWorker);

    if (isTreeTile) {
      if (selectedWorkers.length > 0) {
        selectedWorkers.forEach(w => w.assignHarvestTask({ type: 'tree', col: tileCol, row: tileRow }, this.gameMap, this.townHall));
        this.moveMarker = { x: (tileCol + 0.5) * tileSize, y: (tileRow + 0.5) * tileSize, radius: 16, alpha: 1.0 };
        return;
      } else if (this.townHall && this.townHall.selected) {
        this.townHall.rallyPoint = { type: 'tree', col: tileCol, row: tileRow };
        this.moveMarker = { x: (tileCol + 0.5) * tileSize, y: (tileRow + 0.5) * tileSize, radius: 16, alpha: 1.0 };
        this.uiManager.updateSelection(this.townHall);
        return;
      }
    }

    // 6. Tap on Ground -> Command selected units to move in formation OR set Castle/Barracks Rally Point
    const selectedUnits = this.units.filter(u => u.selected);
    const selectedBarracks = this.barracksList ? this.barracksList.find(b => b.selected) : null;

    if (selectedUnits.length > 0) {
      // Set a SINGLE ground move marker at the exact tapped location
      this.moveMarker = {
        x: (tileCol + 0.5) * tileSize,
        y: (tileRow + 0.5) * tileSize,
        radius: 16,
        alpha: 1.0
      };

      const offsets = [
        { dc: 0, dr: 0 },
        { dc: 1, dr: 0 },
        { dc: -1, dr: 0 },
        { dc: 0, dr: 1 },
        { dc: 0, dr: -1 },
        { dc: 1, dr: 1 },
        { dc: -1, dr: 1 },
        { dc: 1, dr: -1 },
        { dc: -1, dr: -1 }
      ];

      const mapCols = cfg ? cfg.MAP_COLS : 36;
      const mapRows = cfg ? cfg.MAP_ROWS : 54;
      const isAttackMove = this.uiManager ? this.uiManager.movementStance === 'ATTACK' : false;

      selectedUnits.forEach((unit, idx) => {
        const offset = offsets[idx % offsets.length];
        let targetC = Math.max(0, Math.min(mapCols - 1, tileCol + offset.dc));
        let targetR = Math.max(0, Math.min(mapRows - 1, tileRow + offset.dr));

        if (this.gameMap && (!this.gameMap.isWalkable(targetC, targetR) || (this.townHall && this.townHall.isTileOccupied(targetC, targetR)))) {
          targetC = tileCol;
          targetR = tileRow;
        }

        if (isAttackMove) {
          // ATTACK STANCE:
          unit.isPassiveMove = false;

          // Check if unit is ALREADY confronting an active enemy in attack range
          let isConfrontingEnemy = false;
          if (unit.targetEnemy && unit.targetEnemy.hp > 0 && !unit.targetEnemy.insideMine) {
            const enemyX = unit.targetEnemy.worldX !== undefined ? (unit.targetEnemy.worldX + unit.targetEnemy.width / 2) : unit.targetEnemy.x;
            const enemyY = unit.targetEnemy.worldY !== undefined ? (unit.targetEnemy.worldY + unit.targetEnemy.height / 2) : unit.targetEnemy.y;
            const enemyRadius = unit.targetEnemy.hitRadius !== undefined ? unit.targetEnemy.hitRadius : (unit.targetEnemy.width ? Math.max(unit.targetEnemy.width, unit.targetEnemy.height) / 2 : 16);
            const dist = Math.hypot(enemyX - unit.x, enemyY - unit.y);
            if (dist <= unit.attackRange + enemyRadius) {
              isConfrontingEnemy = true;
            }
          }

          if (isConfrontingEnemy) {
            // Stay stationary and continue attacking confronted enemy!
            unit.path = [];
            unit.isAttackMove = false;
            unit.attackMoveDestination = null;
          } else {
            // Check if there is an enemy currently in aggro range
            const nearbyHostile = unit.findClosestOpposingTarget ? unit.findClosestOpposingTarget(this.units, this.townHall, this.farms, this.barracksList) : null;
            if (nearbyHostile) {
              unit.targetEnemy = nearbyHostile;
              unit.isAttackMove = true;
              unit.attackMoveDestination = { col: targetC, row: targetR };
              const tCol = nearbyHostile.tileCol !== undefined ? Math.floor(nearbyHostile.tileCol + (nearbyHostile.widthTiles || 1) / 2) : nearbyHostile.tileCol;
              const tRow = nearbyHostile.tileRow !== undefined ? Math.floor(nearbyHostile.tileRow + (nearbyHostile.heightTiles || 1) / 2) : nearbyHostile.tileRow;
              unit.moveTo(tCol, tRow, this.gameMap, this.townHall);
            } else {
              unit.harvestState = 'idle';
              unit.targetResource = null;
              unit.targetEnemy = null;
              unit.isAttackMove = true;
              unit.attackMoveDestination = { col: targetC, row: targetR };
              unit.moveTo(targetC, targetR, this.gameMap, this.townHall);
            }
          }
        } else {
          // MOVE STANCE (Passive Move - Ignore enemies until reaching destination):
          unit.harvestState = 'idle';
          unit.targetResource = null;
          unit.targetEnemy = null;
          unit.isAttackMove = false;
          unit.attackMoveDestination = null;
          unit.isPassiveMove = true;
          unit.moveTo(targetC, targetR, this.gameMap, this.townHall);
        }
      });
    } else if (this.townHall && this.townHall.selected) {
      this.townHall.rallyPoint = { type: 'ground', col: tileCol, row: tileRow };
      this.moveMarker = { x: (tileCol + 0.5) * tileSize, y: (tileRow + 0.5) * tileSize, radius: 16, alpha: 1.0 };
      this.uiManager.updateSelection(this.townHall);
    } else if (selectedBarracks) {
      selectedBarracks.rallyPoint = { type: 'ground', col: tileCol, row: tileRow };
      this.moveMarker = { x: (tileCol + 0.5) * tileSize, y: (tileRow + 0.5) * tileSize, radius: 16, alpha: 1.0 };
      this.uiManager.updateSelection(selectedBarracks);
    } else {
      this.deselectAll();
      this.uiManager.updateSelection(null);
    }
  }

  handleBoxSelect() {
    const worldStart = this.camera.screenToWorld(this.startScreenX, this.startScreenY);
    const worldEnd = this.camera.screenToWorld(this.currentScreenX, this.currentScreenY);

    const box = {
      x1: Math.min(worldStart.x, worldEnd.x),
      y1: Math.min(worldStart.y, worldEnd.y),
      x2: Math.max(worldStart.x, worldEnd.x),
      y2: Math.max(worldStart.y, worldEnd.y)
    };

    this.deselectAll();
    let countSelected = 0;

    this.units.forEach(unit => {
      if (unit.intersectsBox(box)) {
        unit.selected = true;
        countSelected++;
      }
    });

    if (countSelected > 0) {
      const firstSelected = this.units.find(u => u.selected);
      this.uiManager.updateSelection(firstSelected, countSelected);
    } else {
      this.uiManager.updateSelection(null);
    }
  }

  deselectAll() {
    this.units.forEach(u => u.selected = false);
    if (this.townHall) this.townHall.selected = false;
    if (this.goldMine) this.goldMine.selected = false;
    if (this.farms) this.farms.forEach(f => f.selected = false);
    if (this.barracksList) this.barracksList.forEach(b => b.selected = false);
  }

  update() {
    if (this.moveMarker) {
      this.moveMarker.alpha -= 0.035;
      this.moveMarker.radius = Math.max(6, this.moveMarker.radius - 0.25);
      if (this.moveMarker.alpha <= 0) {
        this.moveMarker = null;
      }
    }
  }

  renderPlacementBlueprint(ctx) {
    if (!this.placementMode) return;

    const cfg = typeof CONFIG !== 'undefined' ? CONFIG : window.CONFIG;
    const tileSize = cfg ? cfg.TILE_SIZE : 32;
    const worldPos = this.camera.screenToWorld(this.currentScreenX, this.currentScreenY);
    const tileCol = Math.floor(worldPos.x / tileSize);
    const tileRow = Math.floor(worldPos.y / tileSize);

    const wTiles = this.placementMode.widthTiles || 2;
    const hTiles = this.placementMode.heightTiles || 2;
    const isValid = this.isPlacementValid(tileCol, tileRow, wTiles, hTiles);
    const pWorld = { x: tileCol * tileSize, y: tileRow * tileSize };
    const screenPos = this.camera.worldToScreen(pWorld.x, pWorld.y);

    const wPx = wTiles * tileSize;
    const hPx = hTiles * tileSize;

    ctx.save();
    const strokeColor = isValid ? '#2ecc71' : '#e74c3c';
    const fillColor = isValid ? 'rgba(46, 204, 113, 0.35)' : 'rgba(231, 76, 60, 0.35)';

    ctx.fillStyle = fillColor;
    ctx.fillRect(Math.floor(screenPos.x), Math.floor(screenPos.y), wPx, hPx);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 2]);
    ctx.strokeRect(Math.floor(screenPos.x), Math.floor(screenPos.y), wPx, hPx);

    // Icon in center of blueprint
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const icon = this.placementMode.buildingType === 'barracks' ? '⚔️' : '🌾';
    ctx.fillText(icon, Math.floor(screenPos.x) + wPx / 2, Math.floor(screenPos.y) + hPx / 2);
    ctx.restore();
  }

  renderMoveMarker(ctx) {
    if (this.moveMarker) {
      const screenPos = this.camera.worldToScreen(this.moveMarker.x, this.moveMarker.y);
      ctx.save();
      ctx.strokeStyle = `rgba(46, 204, 113, ${this.moveMarker.alpha})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = '#2ecc71';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, this.moveMarker.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Animated Crosshair lines
      ctx.beginPath();
      ctx.moveTo(screenPos.x - 6, screenPos.y);
      ctx.lineTo(screenPos.x + 6, screenPos.y);
      ctx.moveTo(screenPos.x, screenPos.y - 6);
      ctx.lineTo(screenPos.x, screenPos.y + 6);
      ctx.stroke();
      ctx.restore();
    }
  }

  renderMarquee(ctx) {
    if (this.isPointerDown && this.isDragging && this.mode === 'BOX') {
      const x = Math.min(this.startScreenX, this.currentScreenX);
      const y = Math.min(this.startScreenY, this.currentScreenY);
      const w = Math.abs(this.currentScreenX - this.startScreenX);
      const h = Math.abs(this.currentScreenY - this.startScreenY);

      ctx.save();
      ctx.fillStyle = 'rgba(46, 204, 113, 0.2)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#2ecc71';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(x, y, w, h);
      ctx.restore();
    }
  }
}
window.TouchController = TouchController;
