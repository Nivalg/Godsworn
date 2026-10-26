class Unit {
  constructor(tileCol, tileRow, type = 'footman', isEnemy = false) {
    const cfg = typeof CONFIG !== 'undefined' ? CONFIG : window.CONFIG;
    const fac = typeof FACTIONS !== 'undefined' ? FACTIONS : window.FACTIONS;

    this.tileSize = cfg ? cfg.TILE_SIZE : 32;
    this.tileCol = tileCol;
    this.tileRow = tileRow;
    this.type = type;
    this.isEnemy = isEnemy;
    this.team = isEnemy ? 2 : 1;

    // Centered world coordinates
    this.x = (tileCol + 0.5) * this.tileSize;
    this.y = (tileRow + 0.5) * this.tileSize;
    this.facingAngle = Math.PI / 2; // Default facing South
    this.animTimer = 0;

    // Check if profile exists in FACTIONS registry
    const playerUnits = fac && fac.HEAVENLY_HOST ? fac.HEAVENLY_HOST.units : null;
    const shadowUnits = fac && fac.SHADOW_CORPS ? fac.SHADOW_CORPS.units : null;

    let profile = null;
    if (type === 'orc_chieftain') profile = shadowUnits ? shadowUnits.chieftain : null;
    else if (type === 'orc_grunt') profile = shadowUnits ? shadowUnits.grunt : null;
    else if (type === 'baldwin') profile = playerUnits ? playerUnits.hero : null;
    else if (type === 'peasant' || type === 'serf') profile = playerUnits ? playerUnits.peasant : null;
    else if (type === 'archer') profile = playerUnits ? playerUnits.archer : null;
    else profile = playerUnits ? playerUnits.infantry : null;

    const baseSpeed = cfg ? cfg.UNIT_SPEED : 1.2;

    if (profile) {
      this.name = profile.name;
      this.hp = profile.hp;
      this.maxHp = profile.maxHp;
      this.level = profile.level || 1;
      this.attack = profile.attack;
      this.armor = profile.armor;
      this.speed = (profile.speed || 1.0) * baseSpeed;
      this.spriteKey = profile.spriteKey;
      this.renderSize = profile.renderSize;
      this.hitRadius = profile.hitRadius;
      this.isHero = !!profile.isHero;
      this.aura = profile.aura || null;
    } else if (type === 'orc_chieftain') {
      this.name = 'Shadow Chieftain';
      this.hp = 220;
      this.maxHp = 220;
      this.level = 5;
      this.attack = 18;
      this.armor = 4;
      this.speed = baseSpeed * 1.0;
      this.spriteKey = 'orc_chieftain';
      this.renderSize = 44;
      this.hitRadius = 20;
      this.isHero = true;
    } else if (type === 'orc_grunt') {
      this.name = 'Shadow Grunt';
      this.hp = 75;
      this.maxHp = 75;
      this.level = 1;
      this.attack = 8;
      this.armor = 2;
      this.speed = baseSpeed * 1.05;
      this.spriteKey = 'orc_grunt';
      this.renderSize = 32;
      this.hitRadius = 16;
      this.isHero = false;
    } else if (type === 'baldwin') {
      this.name = 'King Baldwin IV';
      this.hp = 350;
      this.maxHp = 350;
      this.level = 10;
      this.attack = 28;
      this.armor = 13;
      this.speed = baseSpeed * 1.1;
      this.spriteKey = 'baldwin';
      this.renderSize = 48;
      this.hitRadius = 22;
      this.isHero = true;
    } else if (type === 'archer') {
      this.name = 'Archer';
      this.hp = 45;
      this.maxHp = 45;
      this.level = 1;
      this.attack = 9;
      this.armor = 0;
      this.speed = baseSpeed * 1.15;
      this.spriteKey = 'archer';
      this.renderSize = 32;
      this.hitRadius = 14;
      this.isHero = false;
    } else {
      this.name = 'Footman';
      this.hp = 60;
      this.maxHp = 60;
      this.level = 1;
      this.attack = 6;
      this.armor = 3;
      this.speed = baseSpeed;
      this.spriteKey = 'footman';
      this.renderSize = 32;
      this.hitRadius = 16;
      this.isHero = false;
    }

    this.attackRange = (profile && profile.attackRange) ? profile.attackRange : (type === 'archer' ? 160 : 36);
    this.minKiteDistance = (profile && profile.minKiteDistance) ? profile.minKiteDistance : (type === 'archer' ? 70 : 0);
    this.isRanged = !!(profile && profile.isRanged) || (type === 'archer');

    this.selected = false;
    this.path = []; // Waypoint array [{col, row}, ...]
    this.targetPos = null;

    // Worker & Resource Harvesting Properties
    this.isWorker = (type === 'peasant' || type === 'serf');
    this.harvestState = 'idle'; // 'idle', 'moving_to_resource', 'harvesting', 'returning_to_base'
    this.carriedResourceType = null; // 'lumber' or 'gold'
    this.carriedAmount = 0;
    this.harvestTimer = 0;
    this.targetResource = null; // { type, col, row, goldMine }

    // Combat & Aggro AI Properties
    this.targetEnemy = null;
    this.attackTimer = 0;
    this.attackSpeed = 60; // 60 ticks = 1 second per attack strike
    this.attackRange = this.attackRange || 38; // Melee/Ranged attack range in pixels
    this.aggroRange = isEnemy ? 224 : 192; // 7 tiles for enemy, 6 tiles for player soldier
    this.isAttackMove = false;
    this.attackMoveDestination = null;
    this.stuckTimer = 0;
    this.lastDistToWaypoint = Infinity;
    this.floatingTexts = [];
    this.hitEffectTimer = 0;
  }

  takeDamage(amount, attacker = null) {
    if (this.hp <= 0) return;
    this.hp = Math.max(0, this.hp - amount);
    this.hitEffectTimer = 10;
    this.floatingTexts.push({
      text: `-${amount}`,
      x: this.x,
      y: this.y - 18,
      alpha: 1.0,
      life: 35
    });

    // Auto-retaliate if not worker, and (targetEnemy is building OR targetEnemy is null)
    const isTargetingBuilding = this.targetEnemy && (this.targetEnemy.isBuilding || this.targetEnemy.widthTiles !== undefined);
    if (!this.isWorker && (!this.targetEnemy || isTargetingBuilding) && (this.path.length === 0 || this.isAttackMove) && attacker && attacker.hp > 0 && attacker.team !== this.team) {
      this.targetEnemy = attacker;
    }
  }

  findClosestOpposingTarget(allUnits = [], townHall = null, farms = [], barracksList = []) {
    let closest = null;
    let minDist = this.aggroRange;

    // 1. Scan opposing units
    for (const u of allUnits) {
      if (!u || u === this || u.hp <= 0 || u.insideMine) continue;
      if (u.team === this.team) continue;

      const dist = Math.hypot(u.x - this.x, u.y - this.y);
      if (dist <= minDist) {
        minDist = dist;
        closest = u;
      }
    }

    // 2. Scan opposing buildings (if Enemy unit or scanning hostile structures)
    if (this.isEnemy || this.team === 2) {
      const buildingsToScan = [];
      if (townHall && townHall.hp > 0 && (townHall.team !== this.team || townHall.team === 1)) buildingsToScan.push(townHall);
      if (farms && farms.length > 0) {
        farms.forEach(f => { if (f && f.hp > 0 && (f.team !== this.team || f.team === 1)) buildingsToScan.push(f); });
      }
      if (barracksList && barracksList.length > 0) {
        barracksList.forEach(b => { if (b && b.hp > 0 && (b.team !== this.team || b.team === 1)) buildingsToScan.push(b); });
      }

      for (const b of buildingsToScan) {
        const bX = b.worldX + b.width / 2;
        const bY = b.worldY + b.height / 2;
        const bRadius = Math.max(b.width, b.height) / 2;
        // Edge distance to building perimeter
        const edgeDist = Math.max(0, Math.hypot(bX - this.x, bY - this.y) - bRadius);
        if (edgeDist <= minDist) {
          minDist = edgeDist;
          closest = b;
        }
      }
    }

    return closest;
  }

  assignHarvestTask(targetInfo, gameMap, townHall) {
    if (!this.isWorker) return;
    if (this.targetResource && this.targetResource.goldMine && this.targetResource.goldMine !== targetInfo.goldMine) {
      this.targetResource.goldMine.removeWorker(this);
    }
    this.insideMine = false;
    this.targetResource = targetInfo;
    this.harvestState = 'moving_to_resource';
    this.moveTo(targetInfo.col, targetInfo.row, gameMap, townHall);
  }

  assignConstructTask(targetBuilding, gameMap, townHall) {
    if (!this.isWorker || !targetBuilding) return;
    if (this.targetResource && this.targetResource.goldMine) {
      this.targetResource.goldMine.removeWorker(this);
    }
    this.insideMine = false;
    this.targetResource = { type: 'building', building: targetBuilding, col: targetBuilding.tileCol + 1, row: targetBuilding.tileRow + 1 };
    this.harvestState = 'constructing';
    this.moveTo(targetBuilding.tileCol + 1, targetBuilding.tileRow + 1, gameMap, townHall);
  }

  moveTo(targetCol, targetRow, gameMap, townHall) {
    const pf = typeof Pathfinder !== 'undefined' ? Pathfinder : window.Pathfinder;
    const path = pf ? pf.findPath(this.tileCol, this.tileRow, targetCol, targetRow, gameMap, townHall) : [];
    if (path && path.length > 0) {
      this.path = path;
    }
  }

  isMoving() {
    if (this.insideMine) return false;
    return !!(this.path && this.path.length > 0);
  }

  stop() {
    if (this.targetResource && this.targetResource.goldMine) {
      this.targetResource.goldMine.removeWorker(this);
    }
    this.insideMine = false;
    this.path = [];
    this.harvestState = 'idle';
    this.targetResource = null;
    this.targetEnemy = null;
    this.isAttackMove = false;
    this.attackMoveDestination = null;
    this.isPassiveMove = false;
    this.stuckTimer = 0;
    this.lastDistToWaypoint = Infinity;
  }

  update(allUnits = [], townHall = null, gameMap = null, uiManager = null, farms = [], barracksList = [], projectiles = []) {
    if (this.insideMine) return; // Don't update units inside gold mine
    if (this.hp <= 0) {
      this.isDead = true;
      this.selected = false;
      this.path = [];
      this.targetEnemy = null;
      this.targetResource = null;
      this.deathTimer = (this.deathTimer || 0) + 1;
      // 40 ticks collapse (4 frames @ 6 FPS) + 300 ticks corpse persistence (5s) = 340 ticks total
      if (this.deathTimer >= 340) {
        this.isRemovable = true;
      }
      return;
    }
    this.animTimer = (this.animTimer || 0) + 1;

    // Update floating damage text particles
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

    // 0. Combat & Aggro AI State Machine
    if ((!this.isWorker || this.isEnemy) && !this.isPassiveMove) {
      // Validate active target
      if (this.targetEnemy) {
        if (this.targetEnemy.hp <= 0 || this.targetEnemy.insideMine) {
          this.targetEnemy = null;
          // If Attack-Move mode active and target defeated, resume marching to destination
          if (this.isAttackMove && this.attackMoveDestination) {
            if (this.tileCol === this.attackMoveDestination.col && this.tileRow === this.attackMoveDestination.row) {
              this.isAttackMove = false;
              this.attackMoveDestination = null;
            } else {
              this.moveTo(this.attackMoveDestination.col, this.attackMoveDestination.row, gameMap, townHall);
            }
          }
        }
      }

      // Aggro Scan: Scan for closest enemy within aggroRange when idle OR when Attack-Move active
      if (!this.targetEnemy && (this.path.length === 0 || this.isAttackMove || this.isEnemy)) {
        const hostileTarget = this.findClosestOpposingTarget(allUnits, townHall, farms, barracksList);
        if (hostileTarget) {
          this.targetEnemy = hostileTarget;
          // Immediately redirect path to pursue & engage detected enemy
          const tCol = hostileTarget.tileCol !== undefined ? Math.floor(hostileTarget.tileCol + (hostileTarget.widthTiles || 1) / 2) : hostileTarget.tileCol;
          const tRow = hostileTarget.tileRow !== undefined ? Math.floor(hostileTarget.tileRow + (hostileTarget.heightTiles || 1) / 2) : hostileTarget.tileRow;
          this.moveTo(tCol, tRow, gameMap, townHall);
        }
      }

      // Attack Execution, Kiting, or Pursue Target
      if (this.targetEnemy) {
        const targetX = this.targetEnemy.worldX !== undefined ? (this.targetEnemy.worldX + this.targetEnemy.width / 2) : this.targetEnemy.x;
        const targetY = this.targetEnemy.worldY !== undefined ? (this.targetEnemy.worldY + this.targetEnemy.height / 2) : this.targetEnemy.y;
        const targetRadius = this.targetEnemy.hitRadius !== undefined ? this.targetEnemy.hitRadius : (this.targetEnemy.width ? Math.max(this.targetEnemy.width, this.targetEnemy.height) / 2 : 16);
        const distToEnemy = Math.hypot(targetX - this.x, targetY - this.y);

        // Kiting AI for Ranged Units: Step back away from closing melee enemies when not on explicit manual move order
        if (this.isRanged && this.minKiteDistance > 0 && distToEnemy < this.minKiteDistance && (!this.path || this.path.length === 0 || this.isAttackMove)) {
          const dx = this.x - targetX;
          const dy = this.y - targetY;
          const dist = Math.hypot(dx, dy) || 1;
          const kiteStep = 48; // Step back ~1.5 tiles
          const awayX = this.x + (dx / dist) * kiteStep;
          const awayY = this.y + (dy / dist) * kiteStep;

          const awayCol = Math.max(0, Math.min((gameMap ? gameMap.cols - 1 : 35), Math.floor(awayX / this.tileSize)));
          const awayRow = Math.max(0, Math.min((gameMap ? gameMap.rows - 1 : 53), Math.floor(awayY / this.tileSize)));

          if (gameMap && gameMap.isWalkable(awayCol, awayRow)) {
            this.moveTo(awayCol, awayRow, gameMap, townHall);
          }
        } else if (distToEnemy <= this.attackRange + targetRadius) {
          // In attack range: stop moving and strike/fire!
          this.path = [];
          this.facingAngle = Math.atan2(targetY - this.y, targetX - this.x);
          this.attackTimer = (this.attackTimer || 0) + 1;
          if (this.attackTimer >= (this.attackSpeed || 60)) {
            this.attackTimer = 0;
            const dmg = Math.max(1, (this.attack || 6) - (this.targetEnemy.armor || 0));
            if (this.isRanged) {
              const ProjectileClass = typeof Projectile !== 'undefined' ? Projectile : window.Projectile;
              if (ProjectileClass) {
                const proj = new ProjectileClass(this.x, this.y, targetX, targetY, this.targetEnemy, dmg, 8, this.isEnemy);
                const projList = projectiles || (allUnits && allUnits.projectiles) || window.gameProjectiles;
                if (projList) projList.push(proj);
                else this.targetEnemy.takeDamage(dmg, this);
              } else {
                this.targetEnemy.takeDamage(dmg, this);
              }
            } else {
              this.targetEnemy.takeDamage(dmg, this);
            }
          }
        } else {
          // Pursue target into range
          const targetCol = this.targetEnemy.tileCol !== undefined ? Math.floor(this.targetEnemy.tileCol + (this.targetEnemy.widthTiles || 1) / 2) : this.targetEnemy.tileCol;
          const targetRow = this.targetEnemy.tileRow !== undefined ? Math.floor(this.targetEnemy.tileRow + (this.targetEnemy.heightTiles || 1) / 2) : this.targetEnemy.tileRow;
          this.moveTo(targetCol, targetRow, gameMap, townHall);
        }
      }
    }

    // 1. Unit Path Movement Logic
    if (this.path.length > 0) {
      const nextTile = this.path[0];
      const targetX = (nextTile.col + 0.5) * this.tileSize;
      const targetY = (nextTile.row + 0.5) * this.tileSize;

      const dx = targetX - this.x;
      const dy = targetY - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.001) {
        this.facingAngle = Math.atan2(dy, dx);
      }

      // Final waypoint arrival check (handles arriving next to obstacles/other units cleanly)
      let arrivalRadius = this.path.length > 1 ? Math.max(10, this.speed * 2) : 14;

      if (this.path.length === 1) {
        if (Math.abs(dist - (this.lastDistToWaypoint || Infinity)) < 0.8) {
          this.stuckTimer = (this.stuckTimer || 0) + 1;
        } else {
          this.stuckTimer = 0;
        }
        this.lastDistToWaypoint = dist;

        // If stuck trying to reach final waypoint for >= 10 frames near target, expand arrival threshold
        if (this.stuckTimer >= 10 && dist <= 28) {
          arrivalRadius = 28;
        }
      } else {
        this.stuckTimer = 0;
        this.lastDistToWaypoint = Infinity;
      }

      if (dist <= arrivalRadius || (this.path.length > 1 && this.tileCol === nextTile.col && this.tileRow === nextTile.row)) {
        // Reached waypoint tile
        if (this.path.length === 1) {
          this.path = [];
          this.stuckTimer = 0;
          this.lastDistToWaypoint = Infinity;
          this.isPassiveMove = false; // Reached move destination! Unlock normal combat state
          if (this.isAttackMove) {
            if (this.attackMoveDestination && this.tileCol === this.attackMoveDestination.col && this.tileRow === this.attackMoveDestination.row) {
              this.isAttackMove = false;
              this.attackMoveDestination = null;
            }
          }
        } else {
          this.tileCol = nextTile.col;
          this.tileRow = nextTile.row;
          this.path.shift(); // Remove reached waypoint
        }
      } else {
        // Move towards waypoint
        this.x += (dx / dist) * this.speed;
        this.y += (dy / dist) * this.speed;
        // Keep grid col/row updated
        this.tileCol = Math.floor(this.x / this.tileSize);
        this.tileRow = Math.floor(this.y / this.tileSize);
      }
    }

    // 2. Worker Harvesting & Construction AI State Machine
    if (this.isWorker && this.harvestState !== 'idle') {
      if (this.harvestState === 'moving_to_resource') {
        if (this.targetResource) {
          const targetWorldX = (this.targetResource.col + 0.5) * this.tileSize;
          const targetWorldY = (this.targetResource.row + 0.5) * this.tileSize;
          const distToResource = Math.hypot(targetWorldX - this.x, targetWorldY - this.y);

          if (this.path.length <= 1 || distToResource <= 36) {
            this.path = [];
            if (this.targetResource.type === 'goldmine') {
              if (this.targetResource.goldMine) {
                this.targetResource.goldMine.requestMineEntry(this);
              }
              this.harvestState = 'waiting_for_mine';
            } else {
              this.harvestState = 'harvesting';
              this.harvestTimer = 0;
            }
          }
        }
      } else if (this.harvestState === 'harvesting') {
        this.harvestTimer++;
        if (this.harvestTimer >= 60) { // 1 second harvest duration for trees
          this.harvestTimer = 0;
          if (this.targetResource) {
            if (this.targetResource.type === 'tree') {
              this.carriedResourceType = 'lumber';
              this.carriedAmount = 10;
            }
          }
          this.harvestState = 'returning_to_base';
          if (townHall) {
            this.moveTo(townHall.tileCol + 1, townHall.tileRow + 3, gameMap, townHall);
          }
        }
      } else if (this.harvestState === 'returning_to_base') {
        if (townHall) {
          const thCenterX = townHall.worldX + townHall.width / 2;
          const thCenterY = townHall.worldY + townHall.height / 2;
          const distToTownHall = Math.hypot(thCenterX - this.x, thCenterY - this.y);

          if (this.path.length <= 1 || distToTownHall <= 60) {
            this.path = [];
            const cfg = typeof CONFIG !== 'undefined' ? CONFIG : window.CONFIG;
            if (cfg && cfg.RESOURCES) {
              if (this.carriedResourceType === 'gold') {
                cfg.RESOURCES.GOLD = (cfg.RESOURCES.GOLD || 0) + this.carriedAmount;
              } else if (this.carriedResourceType === 'lumber') {
                cfg.RESOURCES.LUMBER = (cfg.RESOURCES.LUMBER || 0) + this.carriedAmount;
              }
            }
            if (uiManager && uiManager.updateResources) {
              uiManager.updateResources();
            }

            this.carriedResourceType = null;
            this.carriedAmount = 0;

            if (this.targetResource) {
              this.harvestState = 'moving_to_resource';
              this.moveTo(this.targetResource.col, this.targetResource.row, gameMap, townHall);
            } else {
              this.harvestState = 'idle';
            }
          }
        }
      } else if (this.harvestState === 'constructing') {
        const targetBuilding = this.targetResource ? (this.targetResource.building || this.targetResource.farm || this.targetResource.barracks) : null;
        if (targetBuilding) {
          const targetWorldX = (targetBuilding.tileCol + targetBuilding.widthTiles / 2) * this.tileSize;
          const targetWorldY = (targetBuilding.tileRow + targetBuilding.heightTiles / 2) * this.tileSize;
          const distToBuilding = Math.hypot(targetWorldX - this.x, targetWorldY - this.y);

          if (this.path.length <= 1 || distToBuilding <= 60) {
            this.path = [];
            targetBuilding.construct(1 / 1000);
            if (targetBuilding.isConstructed) {
              this.harvestState = 'idle';
              this.targetResource = null;
            }
          }
        } else {
          this.harvestState = 'idle';
        }
      }
    }

    // 3. Unit-to-Unit Soft Separation & Tangent Steering Push (Only moving units adjust position around other units; stationary units remain fixed)
    if (this.isMoving() && allUnits && allUnits.length > 1) {
      const nextWaypoint = (this.path && this.path.length > 0) ? this.path[0] : null;

      allUnits.forEach(other => {
        if (other === this || other.insideMine) return;
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const dist = Math.hypot(dx, dy);
        const minSep = (this.hitRadius + other.hitRadius) * 0.70;

        if (dist < minSep && dist > 0.01) {
          const overlap = minSep - dist;
          const otherIsMoving = typeof other.isMoving === 'function' ? other.isMoving() : !!(other.path && other.path.length > 0);

          if (otherIsMoving) {
            // Light 50/50 separation when both units are moving
            const pushFactor = 0.2;
            this.x += (dx / dist) * overlap * pushFactor;
            this.y += (dy / dist) * overlap * pushFactor;
          } else {
            // Stationary Obstacle Avoidance: Moving unit calculates Tangent Steering Vector around stationary unit
            const rx = dx / dist; // Radial vector away from obstacle
            const ry = dy / dist;

            let tx = -ry; // Tangent vector perpendicular to radial vector
            let ty = rx;

            if (nextWaypoint) {
              const targetX = (nextWaypoint.col + 0.5) * this.tileSize;
              const targetY = (nextWaypoint.row + 0.5) * this.tileSize;
              let vx = targetX - this.x;
              let vy = targetY - this.y;
              const vLen = Math.hypot(vx, vy) || 1;
              vx /= vLen; vy /= vLen;

              const dot = vx * tx + vy * ty;
              if (dot < 0) {
                tx = -tx;
                ty = -ty;
              }
              if (Math.abs(dot) < 0.1) {
                tx += vx * 0.5;
                ty += (this.y >= other.y ? 0.5 : -0.5);
              }
            } else {
              if (this.y < other.y) ty = -Math.abs(ty);
              else ty = Math.abs(ty);
            }

            const tLen = Math.hypot(tx, ty) || 1;
            tx /= tLen; ty /= tLen;

            // Combine radial push (0.4) and forward tangent steering (0.6)
            // Dampen push force when arriving near final waypoint to prevent vibration/oscillation against stationary units
            const distToFinal = (this.path && this.path.length === 1) ? Math.hypot((this.path[0].col + 0.5) * this.tileSize - this.x, (this.path[0].row + 0.5) * this.tileSize - this.y) : Infinity;
            const pushWeight = (this.path && this.path.length === 1 && distToFinal <= 24) ? 0.15 : 0.6;

            const forceX = (rx * 0.4 + tx * 0.6) * overlap * pushWeight;
            const forceY = (ry * 0.4 + ty * 0.6) * overlap * pushWeight;

            this.x += forceX;
            this.y += forceY;
          }

          this.tileCol = Math.floor(this.x / this.tileSize);
          this.tileRow = Math.floor(this.y / this.tileSize);
        }
      });
    }

    // 4. Hard Building Collision Boundary Check (Town Hall 3x3 footprint)
    if (townHall) {
      const minX = townHall.worldX;
      const maxX = townHall.worldX + townHall.width;
      const minY = townHall.worldY;
      const maxY = townHall.worldY + townHall.height;

      // Check if unit center has penetrated into the 3x3 building footprint
      if (this.x >= minX && this.x <= maxX && this.y >= minY && this.y <= maxY) {
        const leftDist = this.x - minX;
        const rightDist = maxX - this.x;
        const topDist = this.y - minY;
        const bottomDist = maxY - this.y;

        const minDist = Math.min(leftDist, rightDist, topDist, bottomDist);
        if (minDist === leftDist) this.x = minX - 4;
        else if (minDist === rightDist) this.x = maxX + 4;
        else if (minDist === topDist) this.y = minY - 4;
        else if (minDist === bottomDist) this.y = maxY + 4;

        this.tileCol = Math.floor(this.x / this.tileSize);
        this.tileRow = Math.floor(this.y / this.tileSize);
      }
    }
  }

  containsWorldPoint(worldX, worldY) {
    if (this.insideMine) return false;
    return Math.hypot(worldX - this.x, worldY - this.y) <= this.hitRadius;
  }

  intersectsBox(box) {
    if (this.insideMine) return false;
    return this.x >= box.x1 && this.x <= box.x2 &&
           this.y >= box.y1 && this.y <= box.y2;
  }

  render(ctx, camera) {
    if (this.insideMine) return; // Hidden while inside gold mine

    const screenPos = camera.worldToScreen(this.x, this.y);

    // 1. Selection Ring (Gold glowing ellipse for Hero, Red for Enemy, Green for standard Player Unit)
    if (this.selected) {
      ctx.save();
      const cfg = typeof CONFIG !== 'undefined' ? CONFIG : window.CONFIG;
      const defaultColor = (cfg && cfg.COLORS) ? cfg.COLORS.SELECTION : '#2ecc71';
      const ringColor = this.isEnemy ? '#e74c3c' : (this.isHero ? '#ffd700' : defaultColor);
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = this.isHero ? 2.5 : 2;
      ctx.shadowColor = ringColor;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      const rx = this.isHero ? 18 : 14;
      const ry = this.isHero ? 9 : 7;
      const offsetY = this.isHero ? 14 : 10;
      ctx.ellipse(Math.floor(screenPos.x), Math.floor(screenPos.y + offsetY), rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Hit Flash Effect (when taking damage)
    if (this.hitEffectTimer > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, this.hitRadius + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Unit Direct Pixel Art Rendering
    const halfSize = this.renderSize / 2;
    const sx = Math.floor(screenPos.x - halfSize);
    const sy = Math.floor(screenPos.y - (halfSize + 2));

    if (this.type === 'orc_chieftain') {
      // --- SHADOW KNIGHT CHIEFTAIN (44x44 Pixel Art) ---
      // Ground Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.ellipse(sx + 22, sy + 38, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Black/Dark Red Cape
      ctx.fillStyle = '#1c1414';
      ctx.fillRect(sx + 10, sy + 14, 24, 22);
      ctx.fillStyle = '#800000';
      ctx.fillRect(sx + 12, sy + 16, 20, 18);

      // Dark Iron Plate Legs & Boots
      ctx.fillStyle = '#22252a';
      ctx.fillRect(sx + 14, sy + 30, 6, 8);
      ctx.fillRect(sx + 24, sy + 30, 6, 8);

      // Blood Red & Steel Torso Armor
      ctx.fillStyle = '#4a1515';
      ctx.fillRect(sx + 13, sy + 14, 18, 17);
      ctx.fillStyle = '#8b0000';
      ctx.fillRect(sx + 15, sy + 16, 14, 13);

      // Spiked Pauldron Shoulders
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(sx + 10, sy + 13, 5, 7);
      ctx.fillRect(sx + 29, sy + 13, 5, 7);
      ctx.fillStyle = '#e74c3c'; // Shoulder spikes
      ctx.fillRect(sx + 11, sy + 10, 3, 4);
      ctx.fillRect(sx + 30, sy + 10, 3, 4);

      // Horned Helmet & Glowing Eyes
      ctx.fillStyle = '#1a1d20';
      ctx.fillRect(sx + 15, sy + 5, 14, 10);
      // Horns
      ctx.fillStyle = '#bdc3c7';
      ctx.fillRect(sx + 11, sy + 2, 4, 6);
      ctx.fillRect(sx + 29, sy + 2, 4, 6);
      ctx.fillRect(sx + 9, sy + 1, 3, 3);
      ctx.fillRect(sx + 32, sy + 1, 3, 3);
      // Glowing Red Eye Slits
      ctx.fillStyle = '#ff1100';
      ctx.fillRect(sx + 17, sy + 8, 3, 2);
      ctx.fillRect(sx + 24, sy + 8, 3, 2);

      // Double-Bladed Battle Axe (Right Hand)
      ctx.fillStyle = '#6e4726'; // Wood shaft
      ctx.fillRect(sx + 33, sy + 4, 3, 30);
      ctx.fillStyle = '#7f8c8d'; // Double steel axe head
      ctx.fillRect(sx + 27, sy + 6, 15, 8);
      ctx.fillStyle = '#bdc3c7';
      ctx.fillRect(sx + 26, sy + 5, 2, 10);
      ctx.fillRect(sx + 41, sy + 5, 2, 10);
    } else if (this.type === 'orc_grunt') {
      // --- SHADOW GRUNT (32x32 Pixel Art) ---
      // Ground Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(sx + 16, sy + 28, 9, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Boots & Pants
      ctx.fillStyle = '#1c140a';
      ctx.fillRect(sx + 11, sy + 22, 4, 6);
      ctx.fillRect(sx + 17, sy + 22, 4, 6);

      // Green Orcish Skin & Red Leather Vest
      ctx.fillStyle = '#2d5a27'; // Dark green skin
      ctx.fillRect(sx + 9, sy + 11, 14, 12);
      ctx.fillStyle = '#922b21'; // Red leather vest
      ctx.fillRect(sx + 11, sy + 12, 10, 10);

      // Iron Skullcap Helm with Spike
      ctx.fillStyle = '#34495e';
      ctx.fillRect(sx + 11, sy + 4, 10, 7);
      ctx.fillStyle = '#e74c3c'; // Spike top
      ctx.fillRect(sx + 15, sy + 1, 2, 4);

      // Red Eye Slit
      ctx.fillStyle = '#ff2200';
      ctx.fillRect(sx + 13, sy + 7, 6, 2);

      // Jagged Orc Sword (Right Hand)
      ctx.fillStyle = '#95a5a6';
      ctx.fillRect(sx + 23, sy + 6, 3, 14);
      ctx.fillStyle = '#7f8c8d';
      ctx.fillRect(sx + 22, sy + 8, 5, 3);
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(sx + 23, sy + 19, 3, 4);
    } else if (this.isHero || this.type === 'baldwin') {
      // --- KING BALDWIN IV (8x5 Sprite Sheet or Procedural Fallback) ---
      const sheet = (typeof AssetManager !== 'undefined') ? AssetManager.baldwinSheet : null;
      if (sheet) {
        const { col, row, flip } = this.getBaldwinSpriteFrame();

        const frameWidth = (sheet.naturalWidth || sheet.width || 1024) / 4;
        const frameHeight = (sheet.naturalHeight || sheet.height || 1280) / 5;

        const srcX = Math.floor(col * frameWidth);
        const srcY = Math.floor(row * frameHeight);
        const srcW = Math.floor(frameWidth);
        const srcH = Math.floor(frameHeight);

        const destW = 52;
        const destH = 55;
        const destX = Math.floor(screenPos.x);
        const destY = Math.floor(screenPos.y - 4);

        ctx.save();
        if (flip) {
          ctx.translate(destX, destY);
          ctx.scale(-1, 1);
          ctx.drawImage(sheet, srcX, srcY, srcW, srcH, -Math.floor(destW / 2), -Math.floor(destH / 2), destW, destH);
        } else {
          ctx.drawImage(sheet, srcX, srcY, srcW, srcH, destX - Math.floor(destW / 2), destY - Math.floor(destH / 2), destW, destH);
        }
        ctx.restore();
      } else {
        this.renderBaldwinProcedural(ctx, sx, sy);
      }
    } else if (this.isWorker || this.type === 'peasant' || this.type === 'serf') {
      // --- SERF / PEASANT WORKER (32x32 Pixel Art) ---
      // Ground Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(sx + 16, sy + 28, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Boots & Pants
      ctx.fillStyle = '#3e2723';
      ctx.fillRect(sx + 11, sy + 22, 4, 6);
      ctx.fillRect(sx + 17, sy + 22, 4, 6);

      // Brown Peasant Tunic
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(sx + 10, sy + 12, 12, 11);
      ctx.fillStyle = '#a06a37';
      ctx.fillRect(sx + 12, sy + 13, 8, 6);

      // Leather Toolbelt
      ctx.fillStyle = '#d4ac0d';
      ctx.fillRect(sx + 10, sy + 19, 12, 2);

      // Peasant Hood / Leather Cap
      ctx.fillStyle = '#5c3a1e';
      ctx.fillRect(sx + 11, sy + 4, 10, 8);
      // Face
      ctx.fillStyle = '#f5cba7';
      ctx.fillRect(sx + 13, sy + 7, 6, 4);

      // Hand Hatchet / Pickaxe Tool
      const isSwinging = (this.harvestState === 'harvesting' && (this.harvestTimer % 10 < 5));
      const toolY = isSwinging ? sy + 3 : sy + 7;
      ctx.fillStyle = '#6e4726'; // Handle
      ctx.fillRect(sx + 23, toolY, 2, 14);
      ctx.fillStyle = '#7f8c8d'; // Metal tool head
      ctx.fillRect(sx + 21, toolY, 6, 3);

      // Carried Resource Visual Indicators
      if (this.carriedResourceType === 'lumber') {
        // Stack of 2 Wood Logs on shoulder
        ctx.fillStyle = '#6e4726';
        ctx.fillRect(sx + 3, sy + 8, 8, 4);
        ctx.fillRect(sx + 4, sy + 13, 8, 4);
        ctx.fillStyle = '#d5b88f'; // Log cross-section
        ctx.fillRect(sx + 3, sy + 9, 2, 2);
        ctx.fillRect(sx + 4, sy + 14, 2, 2);
      } else if (this.carriedResourceType === 'gold') {
        // Glowing Gold Nuggets in satchel/hands
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(sx + 4, sy + 12, 6, 6);
        ctx.fillRect(sx + 2, sy + 15, 5, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx + 6, sy + 13, 2, 2);
      }
    } else if (this.type === 'archer') {
      // --- ARCHER / CROSSBOWMAN (32x32 Pixel Art) ---
      // Ground Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(sx + 16, sy + 28, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Boots & Trousers
      ctx.fillStyle = '#2c1d11';
      ctx.fillRect(sx + 11, sy + 22, 4, 6);
      ctx.fillRect(sx + 17, sy + 22, 4, 6);

      // Forest Green Tunic / Leather Armor
      ctx.fillStyle = '#1e4620';
      ctx.fillRect(sx + 10, sy + 12, 12, 11);
      ctx.fillStyle = '#2e6b32';
      ctx.fillRect(sx + 12, sy + 14, 8, 7);
      ctx.fillStyle = '#7c5427';
      ctx.fillRect(sx + 10, sy + 19, 12, 2);

      // Archer Hood / Feathered Cap
      ctx.fillStyle = '#173619';
      ctx.fillRect(sx + 11, sy + 4, 10, 7);
      ctx.fillStyle = '#f1c40f'; // Feather
      ctx.fillRect(sx + 18, sy + 1, 3, 4);

      // Face
      ctx.fillStyle = '#f5cba7';
      ctx.fillRect(sx + 13, sy + 7, 6, 4);

      // Longbow in hand (Left hand extended with bow arc)
      ctx.strokeStyle = '#8c5a2b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx + 24, sy + 14, 10, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();

      // Bowstring
      ctx.strokeStyle = '#ecf0f1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx + 24 + Math.cos(-Math.PI * 0.4) * 10, sy + 14 + Math.sin(-Math.PI * 0.4) * 10);
      ctx.lineTo(sx + 24 + Math.cos(Math.PI * 0.4) * 10, sy + 14 + Math.sin(Math.PI * 0.4) * 10);
      ctx.stroke();
    } else {
      // --- FOOTMAN UNIT (6x4 Spritesheet or Procedural Fallback) ---
      const cfg = typeof CONFIG !== 'undefined' ? CONFIG : window.CONFIG;
      const sheet = (typeof AssetManager !== 'undefined') ? AssetManager.footmanSheet : null;
      const useSheet = (cfg ? cfg.USE_SPRITESHEET_FOOTMAN !== false : true) && sheet;

      if (useSheet) {
        // Subtle translucent ground shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
        ctx.beginPath();
        ctx.ellipse(Math.floor(screenPos.x), Math.floor(screenPos.y + 11), 10, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // 6x4 Sprite Sheet Slicing (6 columns x 4 rows)
        const { col, row, flip } = this.getFootmanSpriteFrame();

        const frameWidth = (sheet.naturalWidth || sheet.width || 1152) / 6;
        const frameHeight = (sheet.naturalHeight || sheet.height || 768) / 4;

        const srcX = Math.floor(col * frameWidth);
        const srcY = Math.floor(row * frameHeight);
        const srcW = Math.floor(frameWidth);
        const srcH = Math.floor(frameHeight);

        const destW = 38;
        const destH = 40;
        const destX = Math.floor(screenPos.x);
        const destY = Math.floor(screenPos.y - 2);

        ctx.save();
        if (flip) {
          ctx.translate(destX, destY);
          ctx.scale(-1, 1);
          ctx.drawImage(sheet, srcX, srcY, srcW, srcH, -Math.floor(destW / 2), -Math.floor(destH / 2), destW, destH);
        } else {
          ctx.drawImage(sheet, srcX, srcY, srcW, srcH, destX - Math.floor(destW / 2), destY - Math.floor(destH / 2), destW, destH);
        }
        ctx.restore();
      } else {
        this.renderFootmanProcedural(ctx, sx, sy);
      }
    }

    // 3. Mini HP Bar over unit (Visible when selected or damaged and alive)
    const showHpBar = (this.hp > 0) && (this.selected || (this.hp < this.maxHp));
    if (showHpBar) {
      const hpWidth = this.isHero ? 32 : 24;
      const hpX = Math.floor(screenPos.x - hpWidth / 2);
      const hpY = Math.floor(screenPos.y - (halfSize + 8));
      ctx.fillStyle = '#000000';
      ctx.fillRect(hpX - 1, hpY - 1, hpWidth + 2, 5);

      const hpColor = this.isEnemy ? '#e74c3c' : (this.isHero ? '#ffd700' : '#2ecc71');
      ctx.fillStyle = hpColor;
      ctx.fillRect(hpX, hpY, Math.max(0, (this.hp / this.maxHp) * hpWidth), 3);
    }

    // 4. Render Floating Damage Numbers
    if (this.floatingTexts && this.floatingTexts.length > 0) {
      ctx.save();
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      this.floatingTexts.forEach(ft => {
        const p = camera.worldToScreen(ft.x, ft.y);
        ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0, ft.alpha * 0.8)})`;
        ctx.fillText(ft.text, p.x + 1, p.y + 1);
        ctx.fillStyle = `rgba(231, 76, 60, ${Math.max(0, ft.alpha)})`;
        ctx.fillText(ft.text, p.x, p.y);
      });
      ctx.restore();
    }
  }

  getFacingDirection() {
    const angle = this.facingAngle !== undefined ? this.facingAngle : Math.PI / 2; // Default facing South
    let deg = angle * (180 / Math.PI);
    if (deg < 0) deg += 360;

    // 4 Direction Quadrants (6x4 Footman Spritesheet):
    // Row 0: Walk Down (facing front / South)
    // Row 1: Walk Up (facing away / North)
    // Row 2: Walk Left (facing West)
    // Row 3: Walk Right (facing East)
    if (deg >= 45 && deg < 135) {
      return { dir: 'SOUTH', row: 0, flip: false };
    } else if (deg >= 135 && deg < 225) {
      return { dir: 'WEST', row: 2, flip: false };
    } else if (deg >= 225 && deg < 315) {
      return { dir: 'NORTH', row: 1, flip: false };
    } else {
      return { dir: 'EAST', row: 3, flip: false };
    }
  }

  getFootmanSpriteFrame() {
    const animTimer = this.animTimer || 0;
    const { row, flip } = this.getFacingDirection();

    // 1. Attack State: Cycle 6 frames along the facing direction row
    if (this.targetEnemy && (this.attackTimer > 0 || this.hitEffectTimer > 0)) {
      const attackTimer = this.attackTimer || 0;
      const frame = Math.floor(attackTimer / 7) % 6;
      return { col: frame, row, flip };
    }

    // 2. Movement / Idle States (Rows 0, 1, 2, 3)
    const isMoving = !!(this.path && this.path.length > 0);

    if (isMoving) {
      // Cycle frames 0 to 5 along active directional row at ~8.5 FPS (7 ticks per frame)
      const frame = Math.floor(animTimer / 7) % 6;
      return { col: frame, row, flip };
    } else {
      // Idle: Frame 2 (standing/feet aligned under body) of active directional row
      return { col: 2, row, flip };
    }
  }

  getBaldwinFacingDirection() {
    const angle = this.facingAngle !== undefined ? this.facingAngle : Math.PI / 2; // Default facing South
    let deg = angle * (180 / Math.PI);
    if (deg < 0) deg += 360;

    // 4x5 Grid Direction Mappings for King Baldwin:
    // Row 0: Walk Down (facing front / South)
    // Row 1: Walk Up (facing away / North)
    // Row 2: Walk Right (facing East, flip = false) / Walk Left (facing West, flip = true)
    if (deg >= 45 && deg < 135) {
      return { dir: 'SOUTH', row: 0, flip: false };
    } else if (deg >= 135 && deg < 225) {
      return { dir: 'WEST', row: 2, flip: true };
    } else if (deg >= 225 && deg < 315) {
      return { dir: 'NORTH', row: 1, flip: false };
    } else {
      return { dir: 'EAST', row: 2, flip: false };
    }
  }

  getBaldwinSpriteFrame() {
    const animTimer = this.animTimer || 0;

    // 1. Death State (Row 4): Play collapse animation once (frames 0..3) then hold frame 3 for 5 seconds (300 ticks)
    if (this.hp <= 0) {
      const deathTimer = this.deathTimer || 0;
      const frame = Math.min(3, Math.floor(deathTimer / 10));
      return { col: frame, row: 4, flip: false };
    }

    // 2. Attack State (Row 3): Play 4-frame melee attack swing facing target enemy
    if (this.targetEnemy && (this.attackTimer > 0 || this.hitEffectTimer > 0)) {
      const attackTimer = this.attackTimer || 0;
      const frame = Math.floor(attackTimer / 10) % 4;

      let flip = false;
      if (this.targetEnemy.x !== undefined) {
        flip = this.targetEnemy.x < this.x;
      } else if (this.targetEnemy.worldX !== undefined) {
        flip = (this.targetEnemy.worldX + (this.targetEnemy.width || 0) / 2) < this.x;
      } else {
        flip = this.getBaldwinFacingDirection().flip;
      }

      return { col: frame, row: 3, flip };
    }

    // 3. Movement / Idle States (Rows 0, 1, 2)
    const { row, flip } = this.getBaldwinFacingDirection();
    const isMoving = !!(this.path && this.path.length > 0);

    if (isMoving) {
      // Cycle 4 frames along active directional row at 6 FPS (10 ticks per frame)
      const frame = Math.floor(animTimer / 10) % 4;
      return { col: frame, row, flip };
    } else {
      // Idle: Frame 0 of active directional row
      return { col: 0, row, flip };
    }
  }

  renderFootmanProcedural(ctx, sx, sy) {
    // Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(sx + 16, sy + 28, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Boots & Legs
    ctx.fillStyle = '#2b1a0e';
    ctx.fillRect(sx + 11, sy + 22, 4, 6);
    ctx.fillRect(sx + 17, sy + 22, 4, 6);

    // Blue Armor Tunic
    ctx.fillStyle = '#1f5ebc';
    ctx.fillRect(sx + 10, sy + 12, 12, 11);
    ctx.fillStyle = '#3a80e8';
    ctx.fillRect(sx + 12, sy + 13, 8, 5);

    // Gold Belt
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(sx + 10, sy + 19, 12, 2);

    // Knight Helmet
    ctx.fillStyle = '#828c96';
    ctx.fillRect(sx + 11, sy + 4, 10, 8);
    ctx.fillStyle = '#111';
    ctx.fillRect(sx + 13, sy + 7, 7, 2);

    // Helmet Crest (Red Feather)
    ctx.fillStyle = '#d93829';
    ctx.fillRect(sx + 15, sy + 1, 3, 4);

    // Shield (Left)
    ctx.fillStyle = '#1f5ebc';
    ctx.fillRect(sx + 4, sy + 11, 6, 12);
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(sx + 4, sy + 11, 6, 2);
    ctx.fillRect(sx + 4, sy + 21, 6, 2);
    ctx.fillRect(sx + 6, sy + 11, 2, 12);

    // Sword (Right)
    ctx.fillStyle = '#d0d7de';
    ctx.fillRect(sx + 23, sy + 5, 2, 14);
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(sx + 21, sy + 17, 6, 2);
    ctx.fillStyle = '#5c3a1e';
    ctx.fillRect(sx + 23, sy + 19, 2, 4);
  }

  renderBaldwinProcedural(ctx, sx, sy) {
    // Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(sx + 24, sy + 42, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Royal Blue Cape
    ctx.fillStyle = '#15438c';
    ctx.fillRect(sx + 12, sy + 16, 24, 24);

    // Silver Plate Boots
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(sx + 16, sy + 34, 6, 8);
    ctx.fillRect(sx + 26, sy + 34, 6, 8);

    // White & Gold Tabard over Plate Armor
    ctx.fillStyle = '#ecf0f1';
    ctx.fillRect(sx + 15, sy + 16, 18, 19);
    ctx.fillStyle = '#d4af37'; // Gold Cross on chest
    ctx.fillRect(sx + 23, sy + 18, 2, 14);
    ctx.fillRect(sx + 19, sy + 22, 10, 2);

    // Silver Mask & Golden Crown
    ctx.fillStyle = '#bdc3c7';
    ctx.fillRect(sx + 18, sy + 6, 12, 10);
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(sx + 17, sy + 3, 14, 4);

    // Heroic Greatsword
    ctx.fillStyle = '#ecf0f1';
    ctx.fillRect(sx + 35, sy + 6, 3, 22);
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(sx + 32, sy + 24, 9, 3);
  }
}
window.Unit = Unit;
