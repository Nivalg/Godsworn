// A* 8-Directional Grid Pathfinding System
class Pathfinder {
  static findPath(startCol, startRow, targetCol, targetRow, gameMap, townHall) {
    if (!gameMap.isWalkable(targetCol, targetRow) || (townHall && townHall.isTileOccupied(targetCol, targetRow))) {
      // Find nearest walkable neighbor if target tile is blocked
      const nearest = this.findNearestWalkableTile(targetCol, targetRow, gameMap, townHall);
      if (nearest) {
        targetCol = nearest.col;
        targetRow = nearest.row;
      } else {
        return [];
      }
    }

    if (startCol === targetCol && startRow === targetRow) {
      return [];
    }

    const openList = [];
    const closedSet = new Set();
    const nodeMap = new Map();

    const startKey = `${startCol},${startRow}`;
    const startNode = {
      col: startCol,
      row: startRow,
      g: 0,
      h: this.heuristic(startCol, startRow, targetCol, targetRow),
      f: 0,
      parent: null
    };
    startNode.f = startNode.g + startNode.h;

    openList.push(startNode);
    nodeMap.set(startKey, startNode);

    // 8 Directions: Cardinal (1.0) & Diagonal (1.414)
    const neighbors = [
      { dc: 0, dr: -1, cost: 1.0 },   // N
      { dc: 1, dr: 0, cost: 1.0 },    // E
      { dc: 0, dr: 1, cost: 1.0 },    // S
      { dc: -1, dr: 0, cost: 1.0 },   // W
      { dc: -1, dr: -1, cost: 1.414 },// NW
      { dc: 1, dr: -1, cost: 1.414 }, // NE
      { dc: 1, dr: 1, cost: 1.414 },  // SE
      { dc: -1, dr: 1, cost: 1.414 }  // SW
    ];

    let maxSteps = 1200; // Safety step cap
    while (openList.length > 0 && maxSteps-- > 0) {
      // Get node with lowest F score
      openList.sort((a, b) => a.f - b.f);
      const current = openList.shift();
      const currentKey = `${current.col},${current.row}`;

      if (current.col === targetCol && current.row === targetRow) {
        // Reconstruct path
        const path = [];
        let curr = current;
        while (curr.parent) {
          path.unshift({ col: curr.col, row: curr.row });
          curr = curr.parent;
        }
        return path;
      }

      closedSet.add(currentKey);

      for (const dir of neighbors) {
        const nextCol = current.col + dir.dc;
        const nextRow = current.row + dir.dr;
        const nextKey = `${nextCol},${nextRow}`;

        if (closedSet.has(nextKey)) continue;

        // Tile walkability check
        if (!gameMap.isWalkable(nextCol, nextRow)) continue;
        if (townHall && townHall.isTileOccupied(nextCol, nextRow)) continue;

        // Diagonal corner cutting check
        if (dir.dc !== 0 && dir.dr !== 0) {
          const check1 = gameMap.isWalkable(current.col + dir.dc, current.row) && (!townHall || !townHall.isTileOccupied(current.col + dir.dc, current.row));
          const check2 = gameMap.isWalkable(current.col, current.row + dir.dr) && (!townHall || !townHall.isTileOccupied(current.col, current.row + dir.dr));
          if (!check1 || !check2) continue;
        }

        const gScore = current.g + dir.cost;
        let neighbor = nodeMap.get(nextKey);

        if (!neighbor) {
          neighbor = {
            col: nextCol,
            row: nextRow,
            g: gScore,
            h: this.heuristic(nextCol, nextRow, targetCol, targetRow),
            f: 0,
            parent: current
          };
          neighbor.f = neighbor.g + neighbor.h;
          openList.push(neighbor);
          nodeMap.set(nextKey, neighbor);
        } else if (gScore < neighbor.g) {
          neighbor.g = gScore;
          neighbor.f = neighbor.g + neighbor.h;
          neighbor.parent = current;
        }
      }
    }

    return []; // No path found
  }

  static heuristic(c1, r1, c2, r2) {
    // Octile distance for 8-directional grids
    const dc = Math.abs(c1 - c2);
    const dr = Math.abs(r1 - r2);
    return (dc + dr) + (1.414 - 2) * Math.min(dc, dr);
  }

  static findNearestWalkableTile(col, row, gameMap, townHall) {
    for (let r = 1; r <= 3; r++) {
      for (let dc = -r; dc <= r; dc++) {
        for (let dr = -r; dr <= r; dr++) {
          const testC = col + dc;
          const testR = row + dr;
          if (gameMap.isWalkable(testC, testR) && (!townHall || !townHall.isTileOccupied(testC, testR))) {
            return { col: testC, row: testR };
          }
        }
      }
    }
    return null;
  }
}
window.Pathfinder = Pathfinder;
