// Godsworn World & 16-Bit Terrain Renderer
class World {
  static getTileSlice(tileType, r = 0, c = 0) {
    const cfg = typeof CONFIG !== 'undefined' ? CONFIG : window.CONFIG;
    switch (tileType) {
      case cfg.TERRAIN.DIRT:
        return 64; // Dirt Road: (64, 0, 32, 32)
      case cfg.TERRAIN.WATER:
        return 96; // Water / Shoreline: (96, 0, 32, 32)
      case cfg.TERRAIN.ROCK:
        return 128; // Cliff Outcrop: (128, 0, 32, 32)
      case cfg.TERRAIN.GRASS:
      default: {
        // Subtle pseudo-random seed to eliminate diagonal/checkerboard grid patterns
        const hash = Math.sin(r * 12.9898 + c * 78.233) * 43758.5453;
        const rand = hash - Math.floor(hash);
        if (rand > 0.72) {
          return 32; // Grass Variant (cohesive dark forest green variation)
        }
        return 0; // Base Grass
      }
    }
  }

  static renderTile(ctx, tileset, tileType, px, py, r = 0, c = 0, map = null) {
    const cfg = typeof CONFIG !== 'undefined' ? CONFIG : window.CONFIG;
    ctx.imageSmoothingEnabled = false;

    if (tileType === cfg.TERRAIN.TREE) {
      // 1. Draw base grass tile on terrain layer first so underlying ground remains intact when tree is chopped
      const hash = Math.sin(r * 12.9898 + c * 78.233) * 43758.5453;
      const grassSx = ((hash - Math.floor(hash)) > 0.72) ? 32 : 0;
      if (tileset) {
        ctx.drawImage(tileset, grassSx, 0, 32, 32, px, py, 32, 32);
      } else {
        ctx.fillStyle = '#2d5a27';
        ctx.fillRect(px, py, 32, 32);
      }

      // 2. Render Tree Entity Canopy on decoration/collision layer above ground tile
      // Trunk
      ctx.fillStyle = '#3a2312';
      ctx.fillRect(px + 13, py + 22, 6, 8);
      // Canopy
      ctx.fillStyle = '#133513';
      ctx.fillRect(px + 4, py + 14, 24, 9);
      ctx.fillStyle = '#1a471a';
      ctx.fillRect(px + 6, py + 8, 20, 8);
      ctx.fillStyle = '#255e25';
      ctx.fillRect(px + 9, py + 3, 14, 7);
      ctx.fillStyle = '#327832';
      ctx.fillRect(px + 12, py + 0, 8, 5);
      // Highlights
      ctx.fillStyle = '#439943';
      ctx.fillRect(px + 8, py + 9, 6, 2);
      ctx.fillRect(px + 11, py + 4, 4, 2);
      return;
    }

    if (tileType === cfg.TERRAIN.DIRT) {
      // 1. Render base grass tile underneath dirt path
      const hash = Math.sin(r * 12.9898 + c * 78.233) * 43758.5453;
      const grassSx = ((hash - Math.floor(hash)) > 0.72) ? 32 : 0;
      if (tileset) {
        ctx.drawImage(tileset, grassSx, 0, 32, 32, px, py, 32, 32);
        ctx.drawImage(tileset, 64, 0, 32, 32, px, py, 32, 32);
      } else {
        ctx.fillStyle = '#5c4028';
        ctx.fillRect(px, py, 32, 32);
      }

      // 2. Path & Road Blending: Add soft 1-2px border shading & grass overhang along path boundaries
      const topNonDirt = map && map.grid[r - 1] && map.grid[r - 1][c] !== cfg.TERRAIN.DIRT;
      const botNonDirt = map && map.grid[r + 1] && map.grid[r + 1][c] !== cfg.TERRAIN.DIRT;
      const leftNonDirt = map && map.grid[r] && map.grid[r][c - 1] !== cfg.TERRAIN.DIRT;
      const rightNonDirt = map && map.grid[r] && map.grid[r][c + 1] !== cfg.TERRAIN.DIRT;

      // Dark edge border shadow for depth
      ctx.fillStyle = 'rgba(18, 38, 16, 0.45)';
      if (topNonDirt) ctx.fillRect(px, py, 32, 2);
      if (botNonDirt) ctx.fillRect(px, py + 30, 32, 2);
      if (leftNonDirt) ctx.fillRect(px, py, 2, 32);
      if (rightNonDirt) ctx.fillRect(px + 30, py, 2, 32);

      // Organic grass overhang pixel tufts along boundaries
      ctx.fillStyle = '#2d5a27';
      if (topNonDirt) {
        ctx.fillRect(px, py, 32, 1);
        for (let x = 2; x < 30; x += 4) ctx.fillRect(px + x, py + 1, 2, 1);
      }
      if (botNonDirt) {
        ctx.fillRect(px, py + 31, 32, 1);
        for (let x = 4; x < 30; x += 4) ctx.fillRect(px + x, py + 30, 2, 1);
      }
      if (leftNonDirt) {
        ctx.fillRect(px, py, 1, 32);
        for (let y = 2; y < 30; y += 4) ctx.fillRect(px + 1, py + y, 1, 2);
      }
      if (rightNonDirt) {
        ctx.fillRect(px + 31, py, 1, 32);
        for (let y = 4; y < 30; y += 4) ctx.fillRect(px + 30, py + y, 1, 2);
      }
      return;
    }

    const sx = World.getTileSlice(tileType, r, c);
    if (tileset) {
      ctx.drawImage(tileset, sx, 0, 32, 32, px, py, 32, 32);
    } else {
      // Fallback solid-color fill if tileset is not available
      if (tileType === cfg.TERRAIN.WATER) ctx.fillStyle = '#1c4f7c';
      else if (tileType === cfg.TERRAIN.ROCK) ctx.fillStyle = '#4a5056';
      else ctx.fillStyle = '#2d5a27';
      ctx.fillRect(px, py, 32, 32);
    }
  }
}
window.World = World;
