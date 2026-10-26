// Godsworn Game Configuration
var CONFIG = {
  // Map dimensions (in grid tiles)
  MAP_COLS: 36,
  MAP_ROWS: 54,
  TILE_SIZE: 32, // Pixel size per grid tile

  // Terrain Types
  TERRAIN: {
    GRASS: 0,
    DIRT: 1,
    TREE: 2,
    WATER: 3,
    ROCK: 4
  },

  // Walkability map
  WALKABLE: {
    0: true,  // Grass
    1: true,  // Dirt
    2: false, // Tree
    3: false, // Water
    4: false  // Rock
  },

  // Gameplay Settings
  UNIT_SPEED: 1.2, // Pixels per frame move speed (smooth classic RTS pace)
  CAMERA_PAN_SPEED: 1.0,
  USE_SPRITESHEET_FOOTMAN: true, // Toggle for 8-directional animated Footman spritesheet

  // Initial Player Resources
  RESOURCES: {
    GOLD: 4320,
    LUMBER: 2150,
    FOOD_USED: 2,
    FOOD_MAX: 10
  },

  // Player Faction Colors
  COLORS: {
    PLAYER: '#3498db',     // Human Alliance Blue
    SELECTION: '#2ecc71',  // Glowing green selection ring
    ENEMY: '#e74c3c',      // Orc Horde Red
    WAYPOINT: '#f1c40f'    // Target location indicator
  }
};
window.CONFIG = CONFIG;
