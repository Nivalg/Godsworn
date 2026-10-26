// Camera Engine handling smooth viewport panning and bounds
class Camera {
  constructor(viewportWidth, viewportHeight, mapCols, mapRows, tileSize = 32) {
    this.x = 0;
    this.y = 0;
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.mapCols = mapCols;
    this.mapRows = mapRows;
    this.tileSize = tileSize;

    this.worldWidth = mapCols * tileSize;
    this.worldHeight = mapRows * tileSize;
  }

  getVisibleTileBounds() {
    const minCol = Math.max(0, Math.floor(this.x / this.tileSize));
    const maxCol = Math.min(this.mapCols - 1, Math.ceil((this.x + this.viewportWidth) / this.tileSize));
    const minRow = Math.max(0, Math.floor(this.y / this.tileSize));
    const maxRow = Math.min(this.mapRows - 1, Math.ceil((this.y + this.viewportHeight) / this.tileSize));

    return { minCol, maxCol, minRow, maxRow };
  }

  resize(width, height) {
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.clampToBounds();
  }

  pan(dx, dy) {
    this.x -= dx;
    this.y -= dy;
    this.clampToBounds();
  }

  centerOn(worldX, worldY) {
    this.x = worldX - this.viewportWidth / 2;
    this.y = worldY - this.viewportHeight / 2;
    this.clampToBounds();
  }

  clampToBounds() {
    const maxX = Math.max(0, this.worldWidth - this.viewportWidth);
    const maxY = Math.max(0, this.worldHeight - this.viewportHeight);

    this.x = Math.max(0, Math.min(this.x, maxX));
    this.y = Math.max(0, Math.min(this.y, maxY));
  }

  screenToWorld(screenX, screenY) {
    return {
      x: screenX + this.x,
      y: screenY + this.y
    };
  }

  worldToScreen(worldX, worldY) {
    return {
      x: worldX - this.x,
      y: worldY - this.y
    };
  }
}
window.Camera = Camera;
