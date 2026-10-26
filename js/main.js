// Godsworn - Main Entry Point & Game Loop
function initGame() {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // Resolve global references
  const Sprites = window.Sprites;
  const GameMap = window.GameMap;
  const TownHall = window.TownHall;
  const GoldMine = window.GoldMine;
  const Unit = window.Unit;
  const Camera = window.Camera;
  const UIManager = window.UIManager;
  const TouchController = window.TouchController;
  const CONFIG = window.CONFIG;

  // 1. Initialize Sprites
  if (Sprites && Sprites.init) {
    Sprites.init();
  }

  // 2. Initialize Game Objects
  const gameMap = new GameMap();
  
  // Town Hall Castle positioned in central open meadow (3x3 tiles at col 14, row 20)
  const townHall = new TownHall(14, 20, gameMap);

  // Gold Mine structure placed at col 8, row 12
  const goldMine = new GoldMine(8, 12, gameMap, 12500);

  // Buildings arrays (Farms, Barracks, Sawmills)
  const farms = [];
  const barracksList = [];
  const sawmills = [];
  const projectiles = [];
  window.gameProjectiles = projectiles;

  // Pre-placed starting buildings for testing
  const startingFarm = new Farm(10, 20, gameMap);
  startingFarm.isConstructed = true;
  startingFarm.buildProgress = 1.0;
  farms.push(startingFarm);

  const startingBarracks = new Barracks(18, 14, gameMap);
  startingBarracks.isConstructed = true;
  startingBarracks.buildProgress = 1.0;
  barracksList.push(startingBarracks);

  const startingSawmill = new Sawmill(10, 14, gameMap);
  startingSawmill.isConstructed = true;
  startingSawmill.buildProgress = 1.0;
  sawmills.push(startingSawmill);

  // Units spawned near the Town Hall
  const heroBaldwin = new Unit(18, 21, 'baldwin');
  const initialSerf = new Unit(16, 21, 'peasant');
  const initialArcher = new Unit(24, 21, 'archer');

  // Spawn 10 starting Footmen in squad formation
  const playerFootmen = [
    new Unit(19, 21, 'footman'), new Unit(20, 21, 'footman'), new Unit(21, 21, 'footman'), new Unit(22, 21, 'footman'), new Unit(23, 21, 'footman'),
    new Unit(19, 22, 'footman'), new Unit(20, 22, 'footman'), new Unit(21, 22, 'footman'), new Unit(22, 22, 'footman'), new Unit(23, 22, 'footman')
  ];

  // Enemy Hostiles spawned just off-screen to the Northeast (col 28, row 8)
  const enemyChieftain = new Unit(28, 8, 'orc_chieftain', true);
  const enemyGrunt1 = new Unit(27, 9, 'orc_grunt', true);
  const enemyGrunt2 = new Unit(29, 9, 'orc_grunt', true);

  const units = [heroBaldwin, ...playerFootmen, initialSerf, initialArcher, enemyChieftain, enemyGrunt1, enemyGrunt2];
  units.projectiles = projectiles;

  // 3. Initialize Camera Viewport & Canvas Resizing
  const camera = new Camera(360, 540, CONFIG.MAP_COLS, CONFIG.MAP_ROWS, CONFIG.TILE_SIZE);
  let hasCenteredOnValidViewport = false;

  function resizeCanvas() {
    const container = document.getElementById('viewport-container');
    const width = (container && container.clientWidth) || canvas.clientWidth || Math.min(480, window.innerWidth || 360);
    const height = (container && container.clientHeight) || canvas.clientHeight || Math.max(240, (window.innerHeight || 720) - 218);
    if (width > 0 && height > 0 && (canvas.width !== width || canvas.height !== height)) {
      canvas.width = width;
      canvas.height = height;
      ctx.imageSmoothingEnabled = false;
      camera.resize(width, height);
      if (!hasCenteredOnValidViewport) {
        hasCenteredOnValidViewport = true;
        camera.centerOn(townHall.worldX + townHall.width / 2, townHall.worldY + townHall.height / 2);
      }
    }
  }
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 100));
  resizeCanvas();

  // Center camera on player Town Hall
  camera.centerOn(townHall.worldX + townHall.width / 2, townHall.worldY + townHall.height / 2);

  // 4. Initialize UI Manager & Touch Controller
  const uiManager = new UIManager(gameMap, camera, units, townHall, sawmills);
  const touchController = new TouchController(canvas, camera, gameMap, townHall, goldMine, units, uiManager, farms, barracksList, sawmills);
  uiManager.setTouchController(touchController);

  // Bind UI Mode Toggle button to TouchController
  uiManager.setModeToggleCallback((newMode, isUserToggle) => {
    touchController.setMode(newMode, isUserToggle);
  });

  // Select initial Hero Baldwin unit
  heroBaldwin.selected = true;
  uiManager.updateSelection(heroBaldwin);

  // 5. Main Game Loop (60 FPS)
  function gameLoop() {
    // A. Resize check
    resizeCanvas();

    // B. Clean up defeated units, inactive projectiles & destroyed buildings
    for (let i = units.length - 1; i >= 0; i--) {
      if (units[i].isRemovable || (units[i].hp <= 0 && (!units[i].deathTimer || units[i].deathTimer >= 340))) {
        if (units[i].selected) {
          uiManager.updateSelection(null);
        }
        units.splice(i, 1);
      }
    }
    for (let i = projectiles.length - 1; i >= 0; i--) {
      if (!projectiles[i].active) {
        projectiles.splice(i, 1);
      }
    }
    for (let i = farms.length - 1; i >= 0; i--) {
      if (farms[i].hp <= 0) {
        if (farms[i].selected) uiManager.updateSelection(null);
        if (gameMap.unblockBuilding) gameMap.unblockBuilding(farms[i].tileCol, farms[i].tileRow, farms[i].widthTiles, farms[i].heightTiles);
        farms.splice(i, 1);
      }
    }
    for (let i = barracksList.length - 1; i >= 0; i--) {
      if (barracksList[i].hp <= 0) {
        if (barracksList[i].selected) uiManager.updateSelection(null);
        if (gameMap.unblockBuilding) gameMap.unblockBuilding(barracksList[i].tileCol, barracksList[i].tileRow, barracksList[i].widthTiles, barracksList[i].heightTiles);
        barracksList.splice(i, 1);
      }
    }
    for (let i = sawmills.length - 1; i >= 0; i--) {
      if (sawmills[i].hp <= 0) {
        if (sawmills[i].selected) uiManager.updateSelection(null);
        if (gameMap.unblockBuilding) gameMap.unblockBuilding(sawmills[i].tileCol, sawmills[i].tileRow, sawmills[i].widthTiles, sawmills[i].heightTiles);
        sawmills.splice(i, 1);
      }
    }

    // C. Update Fog of War, Projectiles & Entities
    gameMap.updateFogOfWar(units, townHall, farms, barracksList);
    townHall.update(units, gameMap, uiManager);
    goldMine.update(townHall, gameMap);
    farms.forEach(farm => farm.update(units, gameMap, uiManager));
    barracksList.forEach(b => b.update(units, gameMap, uiManager));
    sawmills.forEach(s => s.update(units, gameMap, uiManager));
    projectiles.forEach(p => p.update());
    units.forEach(unit => unit.update(units, townHall, gameMap, uiManager, farms, barracksList, projectiles));
    touchController.update();
    uiManager.update();

    // D. Render World
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Terrain Tiles (with Fog of War & Black Shroud overlays)
    gameMap.render(ctx, camera);

    // 2. Gold Mine, Town Hall, Farm, Barracks & Sawmill Buildings
    goldMine.render(ctx, camera);
    townHall.render(ctx, camera);
    farms.forEach(farm => farm.render(ctx, camera));
    barracksList.forEach(b => b.render(ctx, camera));
    sawmills.forEach(s => s.render(ctx, camera));

    // 3. Single Ground Move Target Marker & Placement Blueprint
    touchController.renderMoveMarker(ctx);
    touchController.renderPlacementBlueprint(ctx);

    // 4. Units & Projectiles (Filter hostile enemy units to only render when in active player vision)
    units.forEach(unit => {
      if (!unit.isEnemy || gameMap.isTileVisible(unit.tileCol, unit.tileRow)) {
        unit.render(ctx, camera);
      }
    });
    projectiles.forEach(p => p.render(ctx, camera));

    // 5. Touch Marquee Selection Box
    touchController.renderMarquee(ctx);

    requestAnimationFrame(gameLoop);
  }

  // Start Loop
  requestAnimationFrame(gameLoop);
}

let gameStarted = false;
function safeInitGame() {
  if (gameStarted) return;
  gameStarted = true;
  initGame();
}

function startGame() {
  if (typeof AssetManager !== 'undefined' && AssetManager.init) {
    AssetManager.init();
  }
  // Start the game loop immediately so mobile never sees a blank/black canvas while sprite sheets stream in
  safeInitGame();
  if (typeof AssetManager !== 'undefined' && AssetManager.loadAll) {
    AssetManager.loadAll(() => {});
  }
}

// Immediate load check (handles readyState === complete / interactive)
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  startGame();
} else {
  window.addEventListener('DOMContentLoaded', startGame);
  window.addEventListener('load', startGame);
}
