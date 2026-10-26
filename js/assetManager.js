// Godsworn Asset Manager - 16-Bit Graphics & Tileset Preloader
class AssetManager {
  static cache = {};
  static tileset = null;
  static isLoaded = false;
  static footmanSheet = null;
  static footmanIsChart = false;

  static init() {
    this.createProceduralTileset();
  }

  static createProceduralTileset() {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return null;

    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = false;

    // Slice 0: Base Grass (0, 0, 32, 32)
    ctx.fillStyle = '#2d5a27';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#244a20';
    for (let i = 0; i < 12; i++) {
      ctx.fillRect((i * 7) % 32, (i * 13) % 32, 2, 2);
    }
    ctx.fillStyle = '#356b2e';
    for (let i = 0; i < 10; i++) {
      ctx.fillRect((i * 11 + 3) % 32, (i * 17 + 5) % 32, 2, 3);
    }

    // Slice 1: Grass Variant (32, 0, 32, 32) - Cohesive dark forest green variation (NO yellow specks)
    ctx.fillStyle = '#2a5424';
    ctx.fillRect(32, 0, 32, 32);
    ctx.fillStyle = '#21441d';
    for (let i = 0; i < 12; i++) {
      ctx.fillRect(32 + ((i * 9) % 32), (i * 11) % 32, 2, 2);
    }
    ctx.fillStyle = '#32652b';
    for (let i = 0; i < 10; i++) {
      ctx.fillRect(32 + ((i * 13 + 4) % 32), (i * 7 + 2) % 32, 2, 3);
    }

    // Slice 2: Dirt Road (64, 0, 32, 32)
    ctx.fillStyle = '#5c4028';
    ctx.fillRect(64, 0, 32, 32);
    ctx.fillStyle = '#45301e';
    for (let i = 0; i < 14; i++) {
      ctx.fillRect(64 + ((i * 9) % 32), (i * 11) % 32, 2, 2);
    }
    ctx.fillStyle = '#705034';
    for (let i = 0; i < 10; i++) {
      ctx.fillRect(64 + ((i * 13 + 2) % 32), (i * 7 + 4) % 32, 2, 2);
    }
    // Subtle gravel pebbles
    ctx.fillStyle = '#856345';
    ctx.fillRect(64 + 6, 8, 4, 2);
    ctx.fillRect(64 + 20, 18, 4, 2);
    ctx.fillRect(64 + 12, 26, 3, 2);

    // Slice 3: Water / Shoreline (96, 0, 32, 32)
    ctx.fillStyle = '#1c4f7c';
    ctx.fillRect(96, 0, 32, 32);
    ctx.fillStyle = '#143b5e';
    ctx.fillRect(96 + 4, 6, 12, 8);
    ctx.fillRect(96 + 18, 18, 10, 8);
    ctx.fillStyle = '#387eb8';
    ctx.fillRect(96 + 2, 4, 8, 2);
    ctx.fillRect(96 + 16, 14, 10, 2);
    ctx.fillRect(96 + 8, 24, 10, 2);
    ctx.fillStyle = '#65b2eb';
    ctx.fillRect(96 + 4, 4, 4, 1);
    ctx.fillRect(96 + 18, 14, 3, 1);
    ctx.fillRect(96 + 10, 24, 3, 1);

    // Slice 4: Cliff Outcrop / Rock (128, 0, 32, 32)
    ctx.fillStyle = '#4a5056';
    ctx.fillRect(128, 0, 32, 32);
    ctx.fillStyle = '#78828c';
    ctx.fillRect(128 + 4, 4, 24, 8);
    ctx.fillRect(128 + 4, 14, 14, 10);
    ctx.fillStyle = '#2c3035';
    ctx.fillRect(128 + 2, 26, 28, 4);
    ctx.fillRect(128 + 22, 8, 6, 18);

    this.tileset = canvas;
    this.cache.tileset = canvas;
    return canvas;
  }

  static loadFootmanSheet(callback) {
    if (typeof Image === 'undefined') {
      const fallbackCanvas = (typeof document !== 'undefined' && typeof document.createElement === 'function') ? document.createElement('canvas') : {};
      this.footmanSheet = fallbackCanvas;
      this.cache.footmanSheet = fallbackCanvas;
      this.footmanIsChart = false;
      if (callback) callback();
      return;
    }

    const img = new Image();
    img.src = 'assets/units/footman.png?v=' + Date.now();
    img.onload = () => {
      if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width || 1152;
        tempCanvas.height = img.height || 768;
        const ctx = tempCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          try {
            const imgData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const data = imgData.data;

            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              const a = data[i + 3];

              if (a === 0) continue;

              // Chroma-key detection for magenta (#FF00FF) or light slate-gray background (187, 197, 206) if unstripped
              const isMagenta = (r > 150 && b > 150 && g < 110) || (g < 130 && (r - g) > 50 && (b - g) > 50);
              const isSlateBg = Math.abs(r - 187) < 20 && Math.abs(g - 197) < 20 && Math.abs(b - 206) < 20;

              if (isMagenta || isSlateBg) {
                data[i + 3] = 0; // Transparent
              }
            }
            ctx.putImageData(imgData, 0, 0);
            this.footmanSheet = tempCanvas;
            this.cache.footmanSheet = tempCanvas;
            this.footmanIsChart = false;
          } catch (e) {
            this.footmanSheet = img;
            this.cache.footmanSheet = img;
            this.footmanIsChart = false;
          }
        } else {
          this.footmanSheet = img;
          this.cache.footmanSheet = img;
          this.footmanIsChart = false;
        }
      } else {
        this.footmanSheet = img;
        this.cache.footmanSheet = img;
        this.footmanIsChart = false;
      }
      if (callback) callback();
    };
    img.onerror = () => {
      this.footmanSheet = null;
      this.footmanIsChart = false;
      if (callback) callback();
    };
  }

  static loadBaldwinSheet(callback) {
    if (typeof Image === 'undefined') {
      const fallbackCanvas = (typeof document !== 'undefined' && typeof document.createElement === 'function') ? document.createElement('canvas') : {};
      this.baldwinSheet = fallbackCanvas;
      this.cache.baldwinSheet = fallbackCanvas;
      if (callback) callback();
      return;
    }

    const img = new Image();
    img.src = 'assets/units/baldwin.png';
    img.onload = () => {
      if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width || 768;
        tempCanvas.height = img.height || 680;
        const ctx = tempCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          try {
            const imgData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const data = imgData.data;
            const w = tempCanvas.width;
            const h = tempCanvas.height;
            const cellW = w / 4;
            const cellH = h / 5;

            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              const px = (i / 4) % w;
              const py = Math.floor((i / 4) / w);

              // Chroma-key detection for magenta background (#FF00FF and compression variants)
              const isMagenta = (r > 150 && b > 150 && g < 110) || (g < 130 && (r - g) > 50 && (b - g) > 50);

              // Black grid line removal along cell borders (4 columns x 5 rows)
              const relX = px % cellW;
              const relY = py % cellH;
              const isGridX = (relX <= 1) || (relX >= cellW - 2);
              const isGridY = (relY <= 1) || (relY >= cellH - 2);
              const isDarkGrid = (r < 70 && g < 70 && b < 70) && (isGridX || isGridY);

              if (isMagenta || isDarkGrid) {
                data[i + 3] = 0; // Transparent
              }
            }
            ctx.putImageData(imgData, 0, 0);
            this.baldwinSheet = tempCanvas;
            this.cache.baldwinSheet = tempCanvas;
          } catch (e) {
            this.baldwinSheet = img;
            this.cache.baldwinSheet = img;
          }
        } else {
          this.baldwinSheet = img;
          this.cache.baldwinSheet = img;
        }
      } else {
        this.baldwinSheet = img;
        this.cache.baldwinSheet = img;
      }
      if (callback) callback();
    };
    img.onerror = () => {
      this.baldwinSheet = null;
      if (callback) callback();
    };
  }

  static loadAll(callback) {
    const proceduralCanvas = this.createProceduralTileset();

    let pending = 3;
    const done = () => {
      pending--;
      if (pending <= 0) {
        this.isLoaded = true;
        if (callback) callback();
      }
    };

    if (typeof Image === 'undefined') {
      this.loadFootmanSheet(() => {
        this.loadBaldwinSheet(() => {
          this.isLoaded = true;
          if (callback) callback();
        });
      });
      return;
    }

    // 1. Load terrain tileset
    const img = new Image();
    img.src = 'assets/terrain/tileset.png';
    img.onload = () => {
      this.tileset = img;
      this.cache.tileset = img;
      done();
    };
    img.onerror = () => {
      this.tileset = proceduralCanvas;
      this.cache.tileset = proceduralCanvas;
      done();
    };

    // 2. Load Footman spritesheet
    this.loadFootmanSheet(() => {
      done();
    });

    // 3. Load King Baldwin spritesheet
    this.loadBaldwinSheet(() => {
      done();
    });
  }

  static get(key) {
    return this.cache[key] || this.tileset;
  }
}
window.AssetManager = AssetManager;
