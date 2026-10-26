// UI Manager for top resource bar, bottom HUD stats card, and Mode Toggle button
class UIManager {
  constructor(gameMap, camera, units, townHall, sawmills = []) {
    this.gameMap = gameMap;
    this.camera = camera;
    this.units = units;
    this.townHall = townHall;
    this.sawmills = sawmills;
    this.movementStance = 'MOVE';

    this.resGold = document.getElementById('res-gold');
    this.resLumber = document.getElementById('res-lumber');
    this.resFood = document.getElementById('res-food');
    this.resTime = document.getElementById('res-time');

    this.unitPortrait = document.getElementById('unit-portrait');
    this.unitName = document.getElementById('unit-name');
    this.unitHpBar = document.getElementById('unit-hp-bar');
    this.unitStats = document.getElementById('unit-stats');

    this.modeToggleBtn = document.getElementById('mode-toggle-btn');
    this.modeIconSymbol = document.getElementById('mode-icon-symbol');
    this.modeText = document.getElementById('mode-text');

    this.cmdStopBtn = document.getElementById('cmd-stop');
    this.cmdMoveBtn = document.getElementById('cmd-move');

    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas.getContext('2d');

    this.startTime = Date.now();
    this.setupListeners();
  }

  setupListeners() {
    // Command Stop
    if (this.cmdStopBtn) {
      this.cmdStopBtn.addEventListener('click', () => {
        this.units.filter(u => u.selected).forEach(u => u.stop());
      });
    }

    // Minimap Click / Drag Camera Pan
    if (this.minimapCanvas) {
      const handleMinimapNav = (e) => {
        const rect = this.minimapCanvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const cfg = typeof CONFIG !== 'undefined' ? CONFIG : window.CONFIG;
        const tileSize = cfg ? cfg.TILE_SIZE : 32;
        const mapCols = cfg ? cfg.MAP_COLS : 36;
        const mapRows = cfg ? cfg.MAP_ROWS : 54;

        const mapWorldW = mapCols * tileSize;
        const mapWorldH = mapRows * tileSize;

        const targetWorldX = (clickX / rect.width) * mapWorldW;
        const targetWorldY = (clickY / rect.height) * mapWorldH;

        this.camera.centerOn(targetWorldX, targetWorldY);
      };

      let isMinimapDragging = false;
      this.minimapCanvas.addEventListener('pointerdown', (e) => {
        isMinimapDragging = true;
        handleMinimapNav(e);
      });
      window.addEventListener('pointermove', (e) => {
        if (isMinimapDragging) handleMinimapNav(e);
      });
      window.addEventListener('pointerup', () => isMinimapDragging = false);
    }
  }

  setModeToggleCallback(callback) {
    if (this.modeToggleBtn) {
      this.modeToggleBtn.addEventListener('click', () => {
        const isCurrentlyPan = this.modeToggleBtn.classList.contains('mode-pan');
        if (isCurrentlyPan) {
          this.modeToggleBtn.classList.remove('mode-pan');
          this.modeToggleBtn.classList.add('mode-box');
          this.modeIconSymbol.textContent = '📐';
          this.modeText.textContent = 'BOX SELECT';
          callback('BOX', true);
        } else {
          this.modeToggleBtn.classList.remove('mode-box');
          this.modeToggleBtn.classList.add('mode-pan');
          this.modeIconSymbol.textContent = '✋';
          this.modeText.textContent = 'PAN MODE';
          callback('PAN', true);
        }
      });
    }
  }

  setModeDisplay(mode) {
    if (!this.modeToggleBtn) return;
    if (mode === 'PAN') {
      this.modeToggleBtn.classList.remove('mode-box');
      this.modeToggleBtn.classList.add('mode-pan');
      if (this.modeIconSymbol) this.modeIconSymbol.textContent = '✋';
      if (this.modeText) this.modeText.textContent = 'PAN MODE';
    } else {
      this.modeToggleBtn.classList.remove('mode-pan');
      this.modeToggleBtn.classList.add('mode-box');
      if (this.modeIconSymbol) this.modeIconSymbol.textContent = '📐';
      if (this.modeText) this.modeText.textContent = 'BOX SELECT';
    }
  }

  updateResources() {
    const cfg = typeof CONFIG !== 'undefined' ? CONFIG : window.CONFIG;
    if (cfg && cfg.RESOURCES) {
      if (this.resGold) this.resGold.textContent = cfg.RESOURCES.GOLD;
      if (this.resLumber) this.resLumber.textContent = cfg.RESOURCES.LUMBER;
      if (this.resFood) this.resFood.textContent = `${cfg.RESOURCES.FOOD_USED}/${cfg.RESOURCES.FOOD_MAX}`;
    }
  }

  renderQueueIcons(targetBuilding = null) {
    const queueView = document.getElementById('queue-view');
    const unitPortrait = document.getElementById('unit-portrait');
    const unitInfo = document.getElementById('unit-info');

    if (!queueView) return;

    const building = targetBuilding || (this.townHall && this.townHall.selected ? this.townHall : null);

    if (!building || !building.selected || !building.buildQueue || building.buildQueue.length === 0) {
      queueView.style.display = 'none';
      if (unitPortrait) unitPortrait.style.display = 'flex';
      if (unitInfo) unitInfo.style.display = 'flex';
      queueView.innerHTML = '';
      return;
    }

    // Hide building portrait and HP info card while units are being trained
    if (unitPortrait) unitPortrait.style.display = 'none';
    if (unitInfo) unitInfo.style.display = 'none';
    queueView.style.display = 'flex';

    queueView.innerHTML = '';
    building.buildQueue.forEach((item, idx) => {
      const slot = document.createElement('div');
      slot.className = idx === 0 ? 'queue-card-slot active' : 'queue-card-slot';
      slot.title = `Queued ${item.name} #${idx + 1} (Tap to cancel)`;

      const iconDiv = document.createElement('div');
      iconDiv.className = 'queue-card-icon';
      iconDiv.textContent = item.icon || (item.unitType === 'footman' ? '⚔️' : '👨‍🌾');
      slot.appendChild(iconDiv);

      if (idx === 0) {
        const secs = Math.ceil(item.remainingTime);
        const pct = Math.max(0, Math.min(100, ((item.totalTime - item.remainingTime) / item.totalTime) * 100));

        const timerDiv = document.createElement('div');
        timerDiv.className = 'queue-card-timer';
        timerDiv.textContent = `${secs}s`;

        const barDiv = document.createElement('div');
        barDiv.className = 'queue-card-progress';
        const fillDiv = document.createElement('div');
        fillDiv.className = 'queue-card-progress-fill';
        fillDiv.style.width = `${pct}%`;
        barDiv.appendChild(fillDiv);

        slot.appendChild(timerDiv);
        slot.appendChild(barDiv);
      } else {
        const timerDiv = document.createElement('div');
        timerDiv.className = 'queue-card-timer';
        timerDiv.style.color = '#b5a48b';
        timerDiv.textContent = `#${idx + 1}`;
        slot.appendChild(timerDiv);
      }

      slot.addEventListener('click', (e) => {
        e.stopPropagation();
        const cfg = typeof CONFIG !== 'undefined' ? CONFIG : window.CONFIG;
        if (cfg && cfg.RESOURCES) {
          const refundGold = item.unitType === 'footman' ? 135 : 50;
          cfg.RESOURCES.GOLD += refundGold;
          cfg.RESOURCES.FOOD_USED = Math.max(0, cfg.RESOURCES.FOOD_USED - 1);
          this.updateResources();
        }
        if (building.cancelQueueItem) {
          building.cancelQueueItem(idx);
        }
        this.renderQueueIcons(building);
      });

      queueView.appendChild(slot);
    });
  }

  trainSerf() {
    const cfg = typeof CONFIG !== 'undefined' ? CONFIG : window.CONFIG;

    if (!cfg || !cfg.RESOURCES) return;

    if (this.townHall && this.townHall.buildQueue && this.townHall.buildQueue.length >= 5) {
      if (this.unitStats) this.unitStats.textContent = '❌ Queue full! (Max 5 items)';
      return;
    }

    if (cfg.RESOURCES.GOLD < 50) {
      if (this.unitStats) this.unitStats.textContent = '❌ Need 50 Gold to train Serf!';
      return;
    }

    if (cfg.RESOURCES.FOOD_USED >= cfg.RESOURCES.FOOD_MAX) {
      if (this.unitStats) this.unitStats.textContent = '❌ Need Farm for Food capacity!';
      return;
    }

    if (this.townHall && this.townHall.queueTrainSerf) {
      const success = this.townHall.queueTrainSerf();
      if (success) {
        // Deduct Gold & Increase Food Count
        cfg.RESOURCES.GOLD -= 50;
        cfg.RESOURCES.FOOD_USED += 1;
        this.updateResources();
        this.renderQueueIcons(this.townHall);
      }
    }
  }

  trainFootman(barracks) {
    const cfg = typeof CONFIG !== 'undefined' ? CONFIG : window.CONFIG;
    if (!cfg || !cfg.RESOURCES) return;

    if (!barracks || !barracks.isConstructed) {
      if (this.unitStats) this.unitStats.textContent = '❌ Barracks must complete construction first!';
      return;
    }

    if (barracks.buildQueue && barracks.buildQueue.length >= 5) {
      if (this.unitStats) this.unitStats.textContent = '❌ Queue full! (Max 5 items)';
      return;
    }

    if (cfg.RESOURCES.GOLD < 135) {
      if (this.unitStats) this.unitStats.textContent = '❌ Need 135 Gold to train Footman!';
      return;
    }

    if (cfg.RESOURCES.FOOD_USED >= cfg.RESOURCES.FOOD_MAX) {
      if (this.unitStats) this.unitStats.textContent = '❌ Need Farm for Food capacity!';
      return;
    }

    if (barracks.queueTrainFootman) {
      const success = barracks.queueTrainFootman();
      if (success) {
        cfg.RESOURCES.GOLD -= 135;
        cfg.RESOURCES.FOOD_USED += 1;
        this.updateResources();
        this.renderQueueIcons(barracks);
      }
    }
  }

  trainArcher(barracks) {
    const cfg = typeof CONFIG !== 'undefined' ? CONFIG : window.CONFIG;
    if (!cfg || !cfg.RESOURCES) return;

    if (!barracks || !barracks.isConstructed) {
      if (this.unitStats) this.unitStats.textContent = '❌ Barracks must complete construction first!';
      return;
    }

    if (barracks.hasSawmill && !barracks.hasSawmill(this.sawmills)) {
      if (this.unitStats) this.unitStats.textContent = '🔒 Archer locked! Requires completed Sawmill / Lumber Mill!';
      return;
    }

    if (barracks.buildQueue && barracks.buildQueue.length >= 5) {
      if (this.unitStats) this.unitStats.textContent = '❌ Queue full! (Max 5 items)';
      return;
    }

    if (cfg.RESOURCES.GOLD < 120 || cfg.RESOURCES.LUMBER < 40) {
      if (this.unitStats) this.unitStats.textContent = '❌ Need 120 Gold and 40 Lumber for Archer!';
      return;
    }

    if (cfg.RESOURCES.FOOD_USED >= cfg.RESOURCES.FOOD_MAX) {
      if (this.unitStats) this.unitStats.textContent = '❌ Need Farm for Food capacity!';
      return;
    }

    if (barracks.queueTrainArcher) {
      const success = barracks.queueTrainArcher(this.sawmills);
      if (success) {
        cfg.RESOURCES.GOLD -= 120;
        cfg.RESOURCES.LUMBER -= 40;
        cfg.RESOURCES.FOOD_USED += 1;
        this.updateResources();
        this.renderQueueIcons(barracks);
      }
    }
  }

  updateSelection(target, count = 1) {
    const queueView = document.getElementById('queue-view');
    const unitPortrait = document.getElementById('unit-portrait');
    const unitInfo = document.getElementById('unit-info');

    const resetLayout = () => {
      if (queueView) { queueView.style.display = 'none'; queueView.innerHTML = ''; }
      if (unitPortrait) unitPortrait.style.display = 'flex';
      if (unitInfo) unitInfo.style.display = 'flex';
    };

    if (!target) {
      resetLayout();
      this.unitPortrait.textContent = '🛡️';
      this.unitName.textContent = 'No Selection';
      this.unitHpBar.style.width = '0%';
      this.unitStats.textContent = 'Tap unit or drag box';
      this.renderUnitCommandGrid();
      return;
    }

    if (count > 1) {
      resetLayout();
      this.unitPortrait.textContent = '⚔️';
      this.unitName.textContent = `${count} Units Selected`;
      this.unitHpBar.style.width = '100%';
      this.unitStats.textContent = `Group Command Active`;
      this.renderUnitCommandGrid();
      return;
    }

    const UnitClass = typeof Unit !== 'undefined' ? Unit : window.Unit;
    const TownHallClass = typeof TownHall !== 'undefined' ? TownHall : window.TownHall;
    const GoldMineClass = typeof GoldMine !== 'undefined' ? GoldMine : window.GoldMine;
    const FarmClass = typeof Farm !== 'undefined' ? Farm : window.Farm;
    const BarracksClass = typeof Barracks !== 'undefined' ? Barracks : window.Barracks;
    const SawmillClass = typeof Sawmill !== 'undefined' ? Sawmill : window.Sawmill;

    if (UnitClass && target instanceof UnitClass) {
      resetLayout();
      const isSerf = target.isWorker || target.type === 'peasant';
      const isArcher = target.type === 'archer';
      if (target.isEnemy) {
        this.unitPortrait.textContent = target.isHero ? '👹' : '👺';
        this.unitName.textContent = `${target.name} (Hostile Enemy)`;
      } else {
        this.unitPortrait.textContent = target.isHero ? '👑' : (isSerf ? '👨‍🌾' : (isArcher ? '🏹' : '⚔️'));
        this.unitName.textContent = `${target.name} (Lvl ${target.level})`;
      }
      const hpPct = Math.max(0, Math.min(100, (target.hp / target.maxHp) * 100));
      this.unitHpBar.style.width = `${hpPct}%`;
      const roleStr = target.isEnemy ? `Atk: ${target.attack} | Arm: ${target.armor} | Hostile` : (isSerf ? (target.harvestState !== 'idle' ? `Gathering ${target.carriedResourceType || 'resources'}...` : 'Tap tree/mine to harvest') : `Atk: ${target.attack} | Arm: ${target.armor}`);
      this.unitStats.textContent = `HP: ${target.hp}/${target.maxHp} | ${roleStr}`;
      this.renderUnitCommandGrid();
    } else if (TownHallClass && target instanceof TownHallClass) {
      this.unitPortrait.textContent = '🏰';
      this.unitName.textContent = target.name;
      const hpPct = Math.max(0, Math.min(100, (target.hp / target.maxHp) * 100));
      this.unitHpBar.style.width = `${hpPct}%`;

      if (target.buildQueue && target.buildQueue.length > 0) {
        const current = target.buildQueue[0];
        const secs = Math.ceil(current.remainingTime);
        this.unitStats.textContent = `⏳ Training Serf: ${secs}s remaining (${target.buildQueue.length}/5 queued)`;
      } else {
        this.unitStats.textContent = `HP: ${target.hp}/${target.maxHp} | Train Workers`;
      }
      this.renderCastleCommandGrid();
      this.renderQueueIcons(target);
    } else if (BarracksClass && target instanceof BarracksClass) {
      this.unitPortrait.textContent = '⚔️';
      this.unitName.textContent = target.isConstructed ? target.name : `${target.name} (Building...)`;
      const hpPct = Math.max(0, Math.min(100, (target.hp / target.maxHp) * 100));
      this.unitHpBar.style.width = `${hpPct}%`;

      if (target.isConstructed) {
        if (target.buildQueue && target.buildQueue.length > 0) {
          const current = target.buildQueue[0];
          const secs = Math.ceil(current.remainingTime);
          this.unitStats.textContent = `⏳ Training ${current.name}: ${secs}s remaining (${target.buildQueue.length}/5 queued)`;
        } else {
          this.unitStats.textContent = `HP: ${target.hp}/${target.maxHp} | Train Soldiers`;
        }
      } else {
        const pct = Math.floor(target.buildProgress * 100);
        this.unitStats.textContent = `⏳ Under Construction: ${pct}%`;
      }
      this.renderBarracksCommandGrid(target);
      this.renderQueueIcons(target);
    } else if (FarmClass && target instanceof FarmClass) {
      resetLayout();
      this.unitPortrait.textContent = '🌾';
      this.unitName.textContent = target.isConstructed ? target.name : `${target.name} (Building...)`;
      const pct = target.isConstructed ? 100 : Math.floor(target.buildProgress * 100);
      this.unitHpBar.style.width = `${pct}%`;
      const statusText = target.isConstructed ? `HP: ${target.hp}/${target.maxHp} | 🌾 Provides +5 Food` : `⏳ Under Construction: ${pct}%`;
      this.unitStats.textContent = statusText;
      this.renderUnitCommandGrid();
    } else if (SawmillClass && target instanceof SawmillClass) {
      resetLayout();
      this.unitPortrait.textContent = '🪵';
      this.unitName.textContent = target.isConstructed ? target.name : `${target.name} (Building...)`;
      const pct = target.isConstructed ? 100 : Math.floor(target.buildProgress * 100);
      this.unitHpBar.style.width = `${pct}%`;
      const statusText = target.isConstructed ? `HP: ${target.hp}/${target.maxHp} | 🪵 Unlocks Archery Tech` : `⏳ Under Construction: ${pct}%`;
      this.unitStats.textContent = statusText;
      this.renderUnitCommandGrid();
    } else if (GoldMineClass && target instanceof GoldMineClass) {
      resetLayout();
      this.unitPortrait.textContent = '⛏️';
      this.unitName.textContent = 'Gold Mine';
      this.unitHpBar.style.width = '100%';
      this.unitStats.textContent = `Gold Remaining: ${target.goldRemaining} Gold`;
      this.renderUnitCommandGrid();
    }
  }

  renderCastleCommandGrid() {
    const grid = document.getElementById('command-grid');
    if (!grid) return;
    grid.innerHTML = `
      <button class="cmd-btn active" id="cmd-train-serf" title="Train Serf (50 Gold)">
        <span class="cmd-icon">👨‍🌾</span>
        <span class="cmd-label">Serf (50g)</span>
      </button>
      <button class="cmd-btn" id="cmd-rally" title="Set Rally Point (Tap Gold Mine / Tree / Ground)">
        <span class="cmd-icon">🚩</span>
        <span class="cmd-label">Rally</span>
      </button>
      <button class="cmd-btn" id="cmd-cancel" title="Cancel Last Queued Serf">
        <span class="cmd-icon">🛑</span>
        <span class="cmd-label">Cancel</span>
      </button>
      <button class="cmd-btn disabled" title="Requires Barracks">
        <span class="cmd-icon">⚔️</span>
        <span class="cmd-label">Footman</span>
      </button>
    `;

    const trainBtn = document.getElementById('cmd-train-serf');
    if (trainBtn) {
      trainBtn.addEventListener('click', () => this.trainSerf());
    }

    const rallyBtn = document.getElementById('cmd-rally');
    if (rallyBtn) {
      rallyBtn.addEventListener('click', () => {
        if (this.townHall) {
          if (this.townHall.rallyPoint) {
            this.townHall.rallyPoint = null;
            if (this.unitStats) this.unitStats.textContent = '🚩 Rally Point Cleared!';
          } else {
            if (this.unitStats) this.unitStats.textContent = '🚩 Tap Gold Mine, Tree or Ground to set Rally!';
          }
        }
      });
    }

    const cancelBtn = document.getElementById('cmd-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (this.townHall && this.townHall.buildQueue && this.townHall.buildQueue.length > 0) {
          const cfg = typeof CONFIG !== 'undefined' ? CONFIG : window.CONFIG;
          if (cfg && cfg.RESOURCES) {
            cfg.RESOURCES.GOLD += 50;
            cfg.RESOURCES.FOOD_USED = Math.max(0, cfg.RESOURCES.FOOD_USED - 1);
            this.updateResources();
          }
          this.townHall.cancelQueueItem(this.townHall.buildQueue.length - 1);
          this.renderQueueIcons(this.townHall);
        }
      });
    }
  }

  renderBarracksCommandGrid(barracks) {
    const grid = document.getElementById('command-grid');
    if (!grid) return;

    const hasTech = barracks && barracks.hasSawmill ? barracks.hasSawmill(this.sawmills) : false;
    const archerBtnClass = hasTech ? 'cmd-btn' : 'cmd-btn disabled';
    const archerBtnTitle = hasTech ? 'Train Archer (120 Gold, 40 Lumber, 1 Food)' : '🔒 Locked: Requires completed Sawmill / Lumber Mill';
    const archerBtnLabel = hasTech ? 'Archer (120g)' : '🔒 Archer (Req Sawmill)';

    grid.innerHTML = `
      <button class="cmd-btn active" id="cmd-train-footman" title="Train Footman (135 Gold, 1 Food)">
        <span class="cmd-icon">⚔️</span>
        <span class="cmd-label">Footman (135g)</span>
      </button>
      <button class="${archerBtnClass}" id="cmd-train-archer" title="${archerBtnTitle}">
        <span class="cmd-icon">🏹</span>
        <span class="cmd-label">${archerBtnLabel}</span>
      </button>
      <button class="cmd-btn" id="cmd-barracks-rally" title="Set Rally Point (Tap Ground)">
        <span class="cmd-icon">🚩</span>
        <span class="cmd-label">Rally</span>
      </button>
      <button class="cmd-btn" id="cmd-barracks-cancel" title="Cancel Last Queued Item">
        <span class="cmd-icon">🛑</span>
        <span class="cmd-label">Cancel</span>
      </button>
    `;

    const trainBtn = document.getElementById('cmd-train-footman');
    if (trainBtn) {
      trainBtn.addEventListener('click', () => this.trainFootman(barracks));
    }

    const trainArcherBtn = document.getElementById('cmd-train-archer');
    if (trainArcherBtn) {
      trainArcherBtn.addEventListener('click', () => this.trainArcher(barracks));
    }

    const rallyBtn = document.getElementById('cmd-barracks-rally');
    if (rallyBtn) {
      rallyBtn.addEventListener('click', () => {
        if (barracks) {
          if (barracks.rallyPoint) {
            barracks.rallyPoint = null;
            if (this.unitStats) this.unitStats.textContent = '🚩 Rally Point Cleared!';
          } else {
            if (this.unitStats) this.unitStats.textContent = '🚩 Tap Ground to set Barracks Rally!';
          }
        }
      });
    }

    const cancelBtn = document.getElementById('cmd-barracks-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (barracks && barracks.buildQueue && barracks.buildQueue.length > 0) {
          const cfg = typeof CONFIG !== 'undefined' ? CONFIG : window.CONFIG;
          const lastItem = barracks.buildQueue[barracks.buildQueue.length - 1];
          if (cfg && cfg.RESOURCES && lastItem) {
            const refundGold = lastItem.unitType === 'archer' ? 120 : 135;
            const refundLumber = lastItem.unitType === 'archer' ? 40 : 0;
            cfg.RESOURCES.GOLD += refundGold;
            cfg.RESOURCES.LUMBER += refundLumber;
            cfg.RESOURCES.FOOD_USED = Math.max(0, cfg.RESOURCES.FOOD_USED - 1);
            this.updateResources();
          }
          barracks.cancelQueueItem(barracks.buildQueue.length - 1);
          this.renderQueueIcons(barracks);
        }
      });
    }
  }

  setTouchController(touchController) {
    this.touchController = touchController;
  }

  renderUnitCommandGrid() {
    const grid = document.getElementById('command-grid');
    if (!grid) return;

    if (!this.movementStance) this.movementStance = 'MOVE';

    const selectedUnits = this.units.filter(u => u.selected);
    const hasWorker = selectedUnits.some(u => u.isWorker || u.type === 'peasant');
    const hasSoldier = selectedUnits.some(u => !u.isWorker && !u.isEnemy);
    const buildBtnClass = hasWorker ? 'cmd-btn' : 'cmd-btn disabled';
    const attackBtnClass = hasSoldier ? (this.movementStance === 'ATTACK' ? 'cmd-btn active' : 'cmd-btn') : 'cmd-btn disabled';
    const moveBtnClass = this.movementStance === 'MOVE' ? 'cmd-btn active' : 'cmd-btn';

    grid.innerHTML = `
      <button class="${moveBtnClass}" id="cmd-move" title="Move Mode (Passive Move - Ignore Enemies)">
        <span class="cmd-icon">👟</span>
        <span class="cmd-label">Move</span>
      </button>
      <button class="cmd-btn" id="cmd-stop" title="Stop">
        <span class="cmd-icon">🛑</span>
        <span class="cmd-label">Stop</span>
      </button>
      <button class="${attackBtnClass}" id="cmd-attack" title="Attack Mode (Auto-Aggro Enemies)">
        <span class="cmd-icon">⚔️</span>
        <span class="cmd-label">Attack</span>
      </button>
      <button class="${buildBtnClass}" id="cmd-build" title="Build Options">
        <span class="cmd-icon">🔨</span>
        <span class="cmd-label">Build</span>
      </button>
    `;

    const moveBtn = document.getElementById('cmd-move');
    if (moveBtn) {
      moveBtn.addEventListener('click', () => {
        this.movementStance = 'MOVE';
        this.renderUnitCommandGrid();
        if (this.unitStats) {
          this.unitStats.textContent = '👟 Move Mode Active: Units ignore enemies until reaching destination.';
        }
      });
    }

    const stopBtn = document.getElementById('cmd-stop');
    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        this.units.filter(u => u.selected).forEach(u => {
          u.stop();
          u.targetEnemy = null;
        });
      });
    }

    const attackBtn = document.getElementById('cmd-attack');
    if (attackBtn && hasSoldier) {
      attackBtn.addEventListener('click', () => {
        this.movementStance = 'ATTACK';
        this.renderUnitCommandGrid();
        if (this.unitStats) {
          this.unitStats.textContent = '⚔️ Attack Mode Active: Units auto-aggro enemies while moving!';
        }
      });
    }

    const buildBtn = document.getElementById('cmd-build');
    if (buildBtn && hasWorker) {
      buildBtn.addEventListener('click', () => {
        this.renderWorkerBuildGrid();
      });
    }
  }

  renderWorkerBuildGrid() {
    const grid = document.getElementById('command-grid');
    if (!grid) return;
    grid.innerHTML = `
      <button class="cmd-btn active" id="cmd-build-farm" title="Grain Farm (100 Gold, 25 Lumber)">
        <span class="cmd-icon">🌾</span>
        <span class="cmd-label">Farm (100g)</span>
      </button>
      <button class="cmd-btn" id="cmd-build-barracks" title="Barracks (150 Gold, 50 Lumber)">
        <span class="cmd-icon">⚔️</span>
        <span class="cmd-label">Barracks</span>
      </button>
      <button class="cmd-btn" id="cmd-build-sawmill" title="Sawmill (120 Gold, 100 Lumber)">
        <span class="cmd-icon">🪵</span>
        <span class="cmd-label">Sawmill</span>
      </button>
      <button class="cmd-btn" id="cmd-build-back" title="Back to Commands">
        <span class="cmd-icon">🛑</span>
        <span class="cmd-label">Back</span>
      </button>
    `;

    const farmBtn = document.getElementById('cmd-build-farm');
    if (farmBtn) {
      farmBtn.addEventListener('click', () => {
        if (this.touchController && this.touchController.startPlacement) {
          this.touchController.startPlacement('farm');
        }
      });
    }

    const barracksBtn = document.getElementById('cmd-build-barracks');
    if (barracksBtn) {
      barracksBtn.addEventListener('click', () => {
        if (this.touchController && this.touchController.startPlacement) {
          this.touchController.startPlacement('barracks');
        }
      });
    }

    const sawmillBtn = document.getElementById('cmd-build-sawmill');
    if (sawmillBtn) {
      sawmillBtn.addEventListener('click', () => {
        if (this.touchController && this.touchController.startPlacement) {
          this.touchController.startPlacement('sawmill');
        }
      });
    }

    const backBtn = document.getElementById('cmd-build-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (this.touchController && this.touchController.cancelPlacement) {
          this.touchController.cancelPlacement();
        }
        this.renderUnitCommandGrid();
      });
    }
  }

  update() {
    // Update Game Clock
    const elapsedSec = Math.floor((Date.now() - this.startTime) / 1000);
    const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
    const secs = String(elapsedSec % 60).padStart(2, '0');
    this.resTime.textContent = `${mins}:${secs}`;

    // Sync Resource Bar Values
    this.updateResources();

    // Live update HUD card for selected building (Castle or Barracks)
    let activeBuilding = null;
    if (this.townHall && this.townHall.selected) {
      activeBuilding = this.townHall;
    } else if (this.touchController && this.touchController.barracksList) {
      activeBuilding = this.touchController.barracksList.find(b => b.selected);
    }

    if (activeBuilding) {
      if (activeBuilding.buildQueue && activeBuilding.buildQueue.length > 0) {
        const current = activeBuilding.buildQueue[0];
        const secs = Math.ceil(current.remainingTime);
        const itemLabel = current.unitType === 'footman' ? 'Footman' : 'Serf';
        this.unitStats.textContent = `⏳ Training ${itemLabel}: ${secs}s remaining (${activeBuilding.buildQueue.length}/5 queued)`;
      } else {
        const TownHallClass = typeof TownHall !== 'undefined' ? TownHall : window.TownHall;
        const labelStr = (TownHallClass && activeBuilding instanceof TownHallClass) ? 'Train Workers' : (activeBuilding.isConstructed ? 'Train Soldiers' : `Under Construction: ${Math.floor(activeBuilding.buildProgress * 100)}%`);
        this.unitStats.textContent = `HP: ${activeBuilding.hp}/${activeBuilding.maxHp} | ${labelStr}`;
      }
      this.renderQueueIcons(activeBuilding);
    } else {
      const queueView = document.getElementById('queue-view');
      if (queueView && queueView.style.display !== 'none') {
        queueView.style.display = 'none';
        queueView.innerHTML = '';
        const unitPortrait = document.getElementById('unit-portrait');
        const unitInfo = document.getElementById('unit-info');
        if (unitPortrait) unitPortrait.style.display = 'flex';
        if (unitInfo) unitInfo.style.display = 'flex';
      }
    }

    // Render Minimap Frame & Camera View Box
    this.renderMinimap();
  }

  renderMinimap() {
    if (!this.minimapCanvas) return;
    const cfg = typeof CONFIG !== 'undefined' ? CONFIG : window.CONFIG;
    const tileSize = cfg ? cfg.TILE_SIZE : 32;
    const mapCols = cfg ? cfg.MAP_COLS : 36;
    const mapRows = cfg ? cfg.MAP_ROWS : 54;

    const w = this.minimapCanvas.clientWidth || 116;
    const h = this.minimapCanvas.clientHeight || 106;

    if (this.minimapCanvas.width !== w || this.minimapCanvas.height !== h) {
      this.minimapCanvas.width = w;
      this.minimapCanvas.height = h;
    }

    // Render terrain minimap
    this.gameMap.renderMinimap(this.minimapCtx, w, h);

    const mapWorldW = mapCols * tileSize;
    const mapWorldH = mapRows * tileSize;

    // Draw Town Hall dot on minimap
    const thX = (this.townHall.worldX / mapWorldW) * w;
    const thY = (this.townHall.worldY / mapWorldH) * h;
    this.minimapCtx.fillStyle = '#3498db';
    this.minimapCtx.fillRect(thX, thY, 6, 6);

    // Draw Units dots on minimap
    this.units.forEach(unit => {
      if (unit.isEnemy) {
        // Only draw hostile enemy dots if located inside active player vision
        if (this.gameMap && this.gameMap.isTileVisible(unit.tileCol, unit.tileRow)) {
          const uX = (unit.x / mapWorldW) * w;
          const uY = (unit.y / mapWorldH) * h;
          this.minimapCtx.fillStyle = '#e74c3c'; // Red hostile enemy dot
          this.minimapCtx.fillRect(uX - 1.5, uY - 1.5, 4, 4);
        }
      } else {
        const uX = (unit.x / mapWorldW) * w;
        const uY = (unit.y / mapWorldH) * h;
        this.minimapCtx.fillStyle = unit.selected ? '#2ecc71' : '#ffffff';
        this.minimapCtx.fillRect(uX - 1, uY - 1, 3, 3);
      }
    });

    // Draw Camera View Rectangle on Minimap
    const camX = (this.camera.x / mapWorldW) * w;
    const camY = (this.camera.y / mapWorldH) * h;
    const camW = (this.camera.viewportWidth / mapWorldW) * w;
    const camH = (this.camera.viewportHeight / mapWorldH) * h;

    this.minimapCtx.strokeStyle = '#ffffff';
    this.minimapCtx.lineWidth = 1;
    this.minimapCtx.strokeRect(camX, camY, camW, camH);
  }
}
window.UIManager = UIManager;
