// Procedural Pixel Art Sprite Generator for Warcraft Mobile
var Sprites = {
  cache: {},

  init() {
    this.cache.grass = this.createGrassTile();
    this.cache.dirt = this.createDirtTile();
    this.cache.tree = this.createTreeTile();
    this.cache.water = this.createWaterTile();
    this.cache.rock = this.createRockTile();
    this.cache.townHall = this.createTownHallSprite();
    this.cache.footman = this.createFootmanSprite();
    this.cache.baldwin = this.createHeroBaldwinSprite();
  },

  createCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    return { canvas, ctx };
  },

  // Grass Tile (32x32)
  createGrassTile() {
    const { canvas, ctx } = this.createCanvas(32, 32);
    // Base grass color
    ctx.fillStyle = '#2d5a1e';
    ctx.fillRect(0, 0, 32, 32);

    // Subtle pixel grass variation
    const darkGrass = '#224616';
    const lightGrass = '#396d27';
    
    // Draw pixel blades of grass
    ctx.fillStyle = darkGrass;
    for (let i = 0; i < 16; i++) {
      const x = (i * 7) % 32;
      const y = (i * 13) % 32;
      ctx.fillRect(x, y, 2, 2);
    }

    ctx.fillStyle = lightGrass;
    for (let i = 0; i < 12; i++) {
      const x = (i * 11 + 3) % 32;
      const y = (i * 17 + 5) % 32;
      ctx.fillRect(x, y, 2, 3);
    }
    return canvas;
  },

  // Dirt Tile (32x32)
  createDirtTile() {
    const { canvas, ctx } = this.createCanvas(32, 32);
    ctx.fillStyle = '#65462a';
    ctx.fillRect(0, 0, 32, 32);

    ctx.fillStyle = '#4c341e';
    for (let i = 0; i < 14; i++) {
      const x = (i * 9) % 32;
      const y = (i * 11) % 32;
      ctx.fillRect(x, y, 2, 2);
    }

    ctx.fillStyle = '#7c5a39';
    for (let i = 0; i < 10; i++) {
      const x = (i * 13 + 2) % 32;
      const y = (i * 7 + 4) % 32;
      ctx.fillRect(x, y, 2, 2);
    }
    return canvas;
  },

  // Tree Tile (32x32) - Pine Forest Cluster
  createTreeTile() {
    const { canvas, ctx } = this.createCanvas(32, 32);
    // Background grass
    ctx.drawImage(this.cache.grass || this.createGrassTile(), 0, 0);

    // Tree Trunk
    ctx.fillStyle = '#3a2312';
    ctx.fillRect(13, 22, 6, 8);

    // Pine Needles / Canopy layers (Retro 16-bit style)
    const layers = [
      { y: 16, w: 24, h: 10, col: '#133513' },
      { y: 10, w: 20, h: 9,  col: '#1a471a' },
      { y: 4,  w: 14, h: 8,  col: '#255e25' },
      { y: 0,  w: 8,  h: 6,  col: '#327832' }
    ];

    layers.forEach(layer => {
      ctx.fillStyle = layer.col;
      const x = Math.floor((32 - layer.w) / 2);
      ctx.fillRect(x, layer.y, layer.w, layer.h);
      // Highlights
      ctx.fillStyle = '#439943';
      ctx.fillRect(x + 2, layer.y + 1, Math.floor(layer.w / 3), 2);
    });

    // Dark outline shadow
    ctx.fillStyle = '#0a1d0a';
    ctx.fillRect(10, 30, 12, 2);

    return canvas;
  },

  // Water Tile (32x32)
  createWaterTile() {
    const { canvas, ctx } = this.createCanvas(32, 32);
    ctx.fillStyle = '#1c4f7c';
    ctx.fillRect(0, 0, 32, 32);

    // Deep water patches
    ctx.fillStyle = '#143b5e';
    ctx.fillRect(4, 6, 12, 8);
    ctx.fillRect(18, 18, 10, 8);

    // Waves & sparkle highlights
    ctx.fillStyle = '#387eb8';
    ctx.fillRect(2, 4, 6, 2);
    ctx.fillRect(16, 14, 8, 2);
    ctx.fillRect(8, 24, 10, 2);

    ctx.fillStyle = '#65b2eb';
    ctx.fillRect(4, 4, 2, 1);
    ctx.fillRect(18, 14, 3, 1);
    ctx.fillRect(10, 24, 3, 1);

    return canvas;
  },

  // Rock Tile (32x32)
  createRockTile() {
    const { canvas, ctx } = this.createCanvas(32, 32);
    ctx.drawImage(this.cache.grass || this.createGrassTile(), 0, 0);

    // Gray Rock Base
    ctx.fillStyle = '#4a5056';
    ctx.fillRect(4, 6, 24, 22);

    // Rock Highlights
    ctx.fillStyle = '#78828c';
    ctx.fillRect(6, 8, 18, 6);
    ctx.fillRect(6, 14, 10, 8);

    // Rock Shadows
    ctx.fillStyle = '#2c3035';
    ctx.fillRect(4, 24, 24, 4);
    ctx.fillRect(22, 10, 6, 14);

    return canvas;
  },

  // Town Hall Castle (96x96 px = 3x3 tiles footprint)
  createTownHallSprite() {
    const { canvas, ctx } = this.createCanvas(96, 96);
    
    // Stone foundation shadow
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(4, 86, 88, 8);

    // Stone Main Walls (Castle Keep)
    ctx.fillStyle = '#5c646c';
    ctx.fillRect(8, 24, 80, 64);

    // Wall shading & brick texture
    ctx.fillStyle = '#3f454b';
    ctx.fillRect(8, 80, 80, 8);
    ctx.fillRect(80, 24, 8, 64);

    ctx.fillStyle = '#7a848e';
    // Brick grid highlights
    for (let y = 30; y < 80; y += 10) {
      for (let x = 12; x < 76; x += 16) {
        ctx.fillRect(x + ((y / 10) % 2 * 8), y, 12, 6);
      }
    }

    // Corner Towers
    const towers = [
      { x: 4, y: 16, w: 20, h: 72 },
      { x: 72, y: 16, w: 20, h: 72 }
    ];

    towers.forEach(t => {
      ctx.fillStyle = '#4a5056';
      ctx.fillRect(t.x, t.y, t.w, t.h);
      ctx.fillStyle = '#78828c';
      ctx.fillRect(t.x + 2, t.y + 4, t.w - 4, 10);
      // Tower Crenellations
      ctx.fillStyle = '#33383d';
      ctx.fillRect(t.x, t.y, 4, 6);
      ctx.fillRect(t.x + 8, t.y, 4, 6);
      ctx.fillRect(t.x + 16, t.y, 4, 6);
    });

    // Roof Center Structure (Wooden Gable Roof)
    ctx.fillStyle = '#82481e';
    ctx.fillRect(28, 12, 40, 28);
    ctx.fillStyle = '#a65e28';
    ctx.fillRect(32, 16, 32, 20);

    // Entrance Gate / Arched Door
    ctx.fillStyle = '#2b1a0e';
    ctx.fillRect(38, 60, 20, 28);
    ctx.fillStyle = '#140c06';
    ctx.fillRect(40, 62, 16, 26);
    // Door arch top
    ctx.fillRect(42, 58, 12, 4);

    // Blue Alliance Banner Flag
    ctx.fillStyle = '#1c69d4';
    ctx.fillRect(82, 0, 10, 16);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(84, 4, 6, 8);
    // Flag pole
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(80, 0, 2, 24);

    return canvas;
  },

  // Footman / Peasant Medieval Unit Sprite (32x32)
  createFootmanSprite() {
    const { canvas, ctx } = this.createCanvas(32, 32);

    // Unit Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(16, 28, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs / Boots
    ctx.fillStyle = '#2b1a0e';
    ctx.fillRect(11, 22, 4, 6);
    ctx.fillRect(17, 22, 4, 6);

    // Blue Armor Tunic (Human Alliance)
    ctx.fillStyle = '#1f5ebc';
    ctx.fillRect(10, 12, 12, 11);
    ctx.fillStyle = '#3a80e8';
    ctx.fillRect(12, 13, 8, 5);

    // Gold Trim Belt & Straps
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(10, 19, 12, 2);

    // Knight Helmet & Head
    ctx.fillStyle = '#828c96';
    ctx.fillRect(11, 4, 10, 8);
    // Visor slit
    ctx.fillStyle = '#111';
    ctx.fillRect(13, 7, 7, 2);
    // Helmet Crest (Red Feather)
    ctx.fillStyle = '#d93829';
    ctx.fillRect(15, 1, 3, 4);

    // Shield (Left hand, viewer's left)
    ctx.fillStyle = '#1f5ebc';
    ctx.fillRect(4, 11, 6, 12);
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(4, 11, 6, 2);
    ctx.fillRect(4, 21, 6, 2);
    ctx.fillRect(6, 11, 2, 12);

    // Sword (Right hand, viewer's right)
    ctx.fillStyle = '#d0d7de';
    ctx.fillRect(23, 5, 2, 14);
    ctx.fillStyle = '#d4af37'; // Crossguard
    ctx.fillRect(21, 17, 6, 2);
    ctx.fillStyle = '#5c3a1e'; // Hilt
    ctx.fillRect(23, 19, 2, 4);

    return canvas;
  },

  // King Baldwin IV Hero Unit Sprite (48x48)
  createHeroBaldwinSprite() {
    const { canvas, ctx } = this.createCanvas(48, 48);

    // Large Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(24, 42, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Flowing White Cape / Surcoat (Back layer)
    ctx.fillStyle = '#e6e6fa';
    ctx.fillRect(14, 18, 20, 22);
    ctx.fillStyle = '#c8c8e6';
    ctx.fillRect(14, 30, 20, 10);

    // Armored Legs & Boots
    ctx.fillStyle = '#3a3a42';
    ctx.fillRect(17, 34, 6, 8);
    ctx.fillRect(25, 34, 6, 8);

    // Royal Blue & Gold Tabard Tunic
    ctx.fillStyle = '#1034a6'; // Royal Blue
    ctx.fillRect(16, 16, 16, 19);

    // Golden Jerusalem Cross Emblem on Chest
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(23, 19, 2, 9);  // Vertical bar
    ctx.fillRect(20, 22, 8, 2);  // Horizontal bar
    // 4 mini crosslets
    ctx.fillRect(20, 19, 2, 2);
    ctx.fillRect(26, 19, 2, 2);
    ctx.fillRect(20, 26, 2, 2);
    ctx.fillRect(26, 26, 2, 2);

    // Gold Trim Belt & Shoulder Spaulders
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(15, 29, 18, 3);
    ctx.fillRect(13, 16, 4, 6);  // Left spaulder
    ctx.fillRect(31, 16, 4, 6);  // Right spaulder

    // Silver Mask of Jerusalem & Head
    ctx.fillStyle = '#d0d8e0';   // Polished Silver Mask
    ctx.fillRect(18, 6, 12, 11);
    ctx.fillStyle = '#9aa8b8';   // Mask Shading
    ctx.fillRect(18, 12, 12, 5);
    // Mask Eye Slits & Facial contours
    ctx.fillStyle = '#111116';
    ctx.fillRect(20, 9, 3, 2);   // Left eye slit
    ctx.fillRect(25, 9, 3, 2);   // Right eye slit
    ctx.fillRect(23, 13, 2, 3);  // Mask breathing slit

    // Royal Golden Crown
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(17, 4, 14, 3);
    ctx.fillRect(18, 2, 3, 2);   // Crown point 1
    ctx.fillRect(22, 1, 4, 3);   // Crown center peak
    ctx.fillRect(27, 2, 3, 2);   // Crown point 3
    // Red Ruby in crown center
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(23, 2, 2, 2);

    // Ornate Royal Shield (Left side)
    ctx.fillStyle = '#1034a6';
    ctx.fillRect(6, 16, 8, 18);
    ctx.fillStyle = '#ffd700'; // Gold shield border & cross
    ctx.fillRect(6, 16, 8, 2);
    ctx.fillRect(6, 32, 8, 2);
    ctx.fillRect(9, 16, 2, 18);
    ctx.fillRect(6, 24, 8, 2);

    // Hero Greatsword (Right side)
    ctx.fillStyle = '#e8eff5'; // Shiny Blade
    ctx.fillRect(36, 4, 3, 26);
    ctx.fillStyle = '#ffd700'; // Gold Crossguard & Pommel
    ctx.fillRect(33, 24, 9, 3);
    ctx.fillRect(36, 30, 3, 3);
    ctx.fillStyle = '#4a2e16'; // Leather Grip
    ctx.fillRect(37, 27, 1, 3);

    return canvas;
  }
};
window.Sprites = Sprites;
