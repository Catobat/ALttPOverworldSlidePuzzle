/**
 * moves.js - Movement logic and validation
 * 
 * This module contains all functions related to how pieces can be moved,
 * including coordinate normalization, validation, and the core tryMove logic.
 */

/**
 * Normalize coordinates with wrapping
 * @param {Object} state - Game state object
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {Object} Normalized {x, y} coordinates
 */
export function normalizeCoords(state, x, y) {
  let nx = x;
  let ny = y;
  
  if (state.wrapHorizontal) {
    nx = ((x % state.boardConfig.width) + state.boardConfig.width) % state.boardConfig.width;
  }
  
  if (state.wrapVertical) {
    ny = ((y % state.boardConfig.height) + state.boardConfig.height) % state.boardConfig.height;
  }
  
  return { x: nx, y: ny };
}

/**
 * Check if coordinates are valid (within bounds or wrapping enabled)
 * @param {Object} state - Game state object
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {boolean} True if valid
 */
export function isValidCoord(state, x, y) {
  if (state.wrapHorizontal) {
    // X can be any value with wrapping
    if (y < 0 || y >= state.boardConfig.height) return false;
  } else {
    if (x < 0 || x >= state.boardConfig.width || y < 0 || y >= state.boardConfig.height) return false;
  }
  
  if (state.wrapVertical) {
    // Y can be any value with wrapping
    if (x < 0 || x >= state.boardConfig.width) return false;
  } else {
    if (x < 0 || x >= state.boardConfig.width || y < 0 || y >= state.boardConfig.height) return false;
  }
  
  return true;
}

/**
 * Calculate destination and freed cells for a large piece moving in a direction
 * @param {Object} state - Game state object
 * @param {Object} piece - Large piece object
 * @param {number} dx - Direction X (-1, 0, or 1)
 * @param {number} dy - Direction Y (-1, 0, or 1)
 * @returns {Object|null} {destCells: [{x,y}, {x,y}], freedCells: [{x,y}, {x,y}]} or null if invalid
 */
export function calculateLargePieceDestination(state, piece, dx, dy) {
  let dest = [], freed = [];
  
  if (dx === 1) { // right
    if (!state.wrapHorizontal && piece.x + 2 >= state.boardConfig.width) return null;
    const d1 = normalizeCoords(state, piece.x + 2, piece.y);
    const d2 = normalizeCoords(state, piece.x + 2, piece.y + 1);
    dest = [{x: d1.x, y: d1.y}, {x: d2.x, y: d2.y}];
    const f1 = normalizeCoords(state, piece.x, piece.y);
    const f2 = normalizeCoords(state, piece.x, piece.y + 1);
    freed = [{x: f1.x, y: f1.y}, {x: f2.x, y: f2.y}];
  } else if (dx === -1) { // left
    if (!state.wrapHorizontal && piece.x - 1 < 0) return null;
    const d1 = normalizeCoords(state, piece.x - 1, piece.y);
    const d2 = normalizeCoords(state, piece.x - 1, piece.y + 1);
    dest = [{x: d1.x, y: d1.y}, {x: d2.x, y: d2.y}];
    const f1 = normalizeCoords(state, piece.x + 1, piece.y);
    const f2 = normalizeCoords(state, piece.x + 1, piece.y + 1);
    freed = [{x: f1.x, y: f1.y}, {x: f2.x, y: f2.y}];
  } else if (dy === 1) { // down
    if (!state.wrapVertical && piece.y + 2 >= state.boardConfig.height) return null;
    const d1 = normalizeCoords(state, piece.x, piece.y + 2);
    const d2 = normalizeCoords(state, piece.x + 1, piece.y + 2);
    dest = [{x: d1.x, y: d1.y}, {x: d2.x, y: d2.y}];
    const f1 = normalizeCoords(state, piece.x, piece.y);
    const f2 = normalizeCoords(state, piece.x + 1, piece.y);
    freed = [{x: f1.x, y: f1.y}, {x: f2.x, y: f2.y}];
  } else if (dy === -1) { // up
    if (!state.wrapVertical && piece.y - 1 < 0) return null;
    const d1 = normalizeCoords(state, piece.x, piece.y - 1);
    const d2 = normalizeCoords(state, piece.x + 1, piece.y - 1);
    dest = [{x: d1.x, y: d1.y}, {x: d2.x, y: d2.y}];
    const f1 = normalizeCoords(state, piece.x, piece.y + 1);
    const f2 = normalizeCoords(state, piece.x + 1, piece.y + 1);
    freed = [{x: f1.x, y: f1.y}, {x: f2.x, y: f2.y}];
  } else {
    return null;
  }
  
  return { destCells: dest, freedCells: freed };
}

/**
 * Clear multiple grid cells
 * @param {Object} state - Game state object
 * @param {Array} cells - Array of {x, y} coordinates to clear
 */
function clearGridCells(state, cells) {
  for (const cell of cells) {
    state.grid[cell.y][cell.x] = null;
  }
}

/**
 * Set a large piece/gap in the grid (2x2 cells)
 * @param {Object} state - Game state object
 * @param {Object} piece - Piece or gap object with x, y, id properties
 * @param {boolean} isGap - Whether this is a gap or piece
 */
function setLargePieceGrid(state, piece, isGap) {
  for (let dy = 0; dy < 2; dy++) {
    for (let dx = 0; dx < 2; dx++) {
      const pos = normalizeCoords(state, piece.x + dx, piece.y + dy);
      state.grid[pos.y][pos.x] = {
        isGap,
        isLarge: true,
        id: piece.id,
        ox: dx,
        oy: dy
      };
    }
  }
}

/**
 * Get all 4 cells occupied by a large piece/gap
 * @param {Object} state - Game state object
 * @param {Object} piece - Large piece or gap object
 * @returns {Array} Array of {x, y} coordinates
 */
function getLargePieceCells(state, piece) {
  const cells = [];
  for (let dy = 0; dy < 2; dy++) {
    for (let dx = 0; dx < 2; dx++) {
      cells.push(normalizeCoords(state, piece.x + dx, piece.y + dy));
    }
  }
  return cells;
}

/**
 * Finalize a move by handling rendering, history, and win conditions
 * @param {Object} state - Game state object
 * @param {boolean} skipRender - Whether to skip rendering
 * @param {boolean} dryRun - Whether this is a dry run
 */
function finalizeMove(state, skipRender, dryRun) {
  if (!skipRender) state.renderAll();
  
  if (!dryRun && !state.isShuffling && state.captureHistorySnapshot) {
    state.captureHistorySnapshot();
  }
  
  if (state.gameMode === 'challenge' && !state.isShuffling) {
    state.incrementMoveCount();
    if (state.checkWinCondition()) {
      state.handleWin();
    }
  }
}

/**
 * Execute a swap between two same-sized entities (gaps or pieces)
 * @param {Object} state - Game state object
 * @param {Object} entity1 - First entity to swap
 * @param {Object} entity2 - Second entity to swap
 * @param {boolean} skipRender - Whether to skip rendering
 * @param {boolean} dryRun - Whether this is a dry run
 * @returns {boolean} True if successful
 */
function executeSwap(state, entity1, entity2, skipRender, dryRun) {
  if (dryRun) return true;
  
  // Swap positions
  [entity1.x, entity1.y, entity2.x, entity2.y] =
    [entity2.x, entity2.y, entity1.x, entity1.y];
  
  // Update grid based on size
  if (entity1.isLarge) {
    // Both are large - clear old positions and set new ones
    clearGridCells(state, getLargePieceCells(state, { x: entity2.x, y: entity2.y, id: entity2.id }));
    clearGridCells(state, getLargePieceCells(state, { x: entity1.x, y: entity1.y, id: entity1.id }));
    setLargePieceGrid(state, entity1, entity1.isGap);
    setLargePieceGrid(state, entity2, entity2.isGap);
  } else {
    // Both are small - just swap the two cells
    state.grid[entity1.y][entity1.x] = {
      isGap: entity1.isGap,
      isLarge: false,
      id: entity1.id
    };
    state.grid[entity2.y][entity2.x] = {
      isGap: entity2.isGap,
      isLarge: false,
      id: entity2.id
    };
  }
  
  finalizeMove(state, skipRender, dryRun);
  return true;
}

/**
 * Calculate cells for multi-piece movement (large gap with 2 small entities)
 * @param {Object} state - Game state object
 * @param {Object} largeGap - The large gap
 * @param {string} dir - Direction of movement
 * @returns {Array} Array of {x, y} coordinates to check
 */
function calculateCheckCells(state, largeGap, dir) {
  let checkCells = [];
  
  if (dir === 'left' || dir === 'right') {
    // Horizontal: check for 2 vertically aligned cells
    if (dir === 'right') {
      // dir='right' means look LEFT (at x-1)
      const cell1 = normalizeCoords(state, largeGap.x - 1, largeGap.y);
      const cell2 = normalizeCoords(state, largeGap.x - 1, largeGap.y + 1);
      checkCells = [{x: cell1.x, y: cell1.y}, {x: cell2.x, y: cell2.y}];
    } else {
      // dir='left' means look RIGHT (at x+2)
      const cell1 = normalizeCoords(state, largeGap.x + 2, largeGap.y);
      const cell2 = normalizeCoords(state, largeGap.x + 2, largeGap.y + 1);
      checkCells = [{x: cell1.x, y: cell1.y}, {x: cell2.x, y: cell2.y}];
    }
  } else if (dir === 'up' || dir === 'down') {
    // Vertical: check for 2 horizontally aligned cells
    if (dir === 'down') {
      // dir='down' means look ABOVE (at y-1)
      const cell1 = normalizeCoords(state, largeGap.x, largeGap.y - 1);
      const cell2 = normalizeCoords(state, largeGap.x + 1, largeGap.y - 1);
      checkCells = [{x: cell1.x, y: cell1.y}, {x: cell2.x, y: cell2.y}];
    } else {
      // dir='up' means look BELOW (at y+2)
      const cell1 = normalizeCoords(state, largeGap.x, largeGap.y + 2);
      const cell2 = normalizeCoords(state, largeGap.x + 1, largeGap.y + 2);
      checkCells = [{x: cell1.x, y: cell1.y}, {x: cell2.x, y: cell2.y}];
    }
  }
  
  return checkCells;
}

/**
 * Handle large gap moving into 2 small pieces/gaps
 * @param {Object} state - Game state object
 * @param {Object} largeGap - The large gap
 * @param {string} dir - Direction of movement
 * @param {boolean} skipRender - Whether to skip rendering
 * @param {boolean} dryRun - Whether this is a dry run
 * @returns {boolean} True if successful
 */
function handleLargeGapMovement(state, largeGap, dir, skipRender, dryRun) {
  // Calculate direction vector for WHERE THE GAP WOULD MOVE
  let dx = 0, dy = 0;
  if (dir === 'up') { dy = 1; }
  if (dir === 'down') { dy = -1; }
  if (dir === 'left') { dx = 1; }
  if (dir === 'right') { dx = -1; }
  
  // Check boundary constraints
  if (!state.wrapHorizontal) {
    if (dx === 1 && largeGap.x + 2 >= state.boardConfig.width) return false;
    if (dx === -1 && largeGap.x - 1 < 0) return false;
  }
  if (!state.wrapVertical) {
    if (dy === 1 && largeGap.y + 2 >= state.boardConfig.height) return false;
    if (dy === -1 && largeGap.y - 1 < 0) return false;
  }
  
  // Calculate which cells to check
  const destCells = calculateCheckCells(state, largeGap, dir);
  
  if (destCells.length !== 2) return false;
  
  const dest1Cell = state.grid[destCells[0].y]?.[destCells[0].x];
  const dest2Cell = state.grid[destCells[1].y]?.[destCells[1].x];
  
  if (!dest1Cell || !dest2Cell) return false;
  
  // Check if destination is a large piece (swap case)
  if (dest1Cell.isLarge && dest2Cell.isLarge && !dest1Cell.isGap) {
    const largePiece = state.pieceById.get(dest1Cell.id);
    
    // Verify all checked cells belong to the same large piece
    const allSamePiece = destCells.every(c => {
      const cell = state.grid[c.y]?.[c.x];
      return cell?.isLarge && !cell?.isGap && cell.id === largePiece.id;
    });
    
    if (allSamePiece) {
      return executeSwap(state, largeGap, largePiece, skipRender, dryRun);
    }
  }
  
  // Otherwise, handle moving into 2 small pieces/gaps
  if (dest1Cell.isLarge || dest2Cell.isLarge) {
    return false;
  }
  
  // Get the pieces/gaps at destination
  const piece1 = state.pieceById.get(dest1Cell.id);
  const piece2 = state.pieceById.get(dest2Cell.id);
  
  if (!piece1 || !piece2) return false;
  
  // Calculate target cells (where pieces should end up - far side of gap)
  let targetCells = [];
  if (dir === 'left' || dir === 'right') {
    if (dir === 'right') {
      targetCells = [
        normalizeCoords(state, largeGap.x + 1, largeGap.y),
        normalizeCoords(state, largeGap.x + 1, largeGap.y + 1)
      ];
    } else {
      targetCells = [
        normalizeCoords(state, largeGap.x, largeGap.y),
        normalizeCoords(state, largeGap.x, largeGap.y + 1)
      ];
    }
    // Map pieces by y coordinate
    var map = [
      { piece: piece1, target: targetCells.find(t => t.y === piece1.y) },
      { piece: piece2, target: targetCells.find(t => t.y === piece2.y) }
    ];
  } else {
    if (dir === 'down') {
      targetCells = [
        normalizeCoords(state, largeGap.x, largeGap.y + 1),
        normalizeCoords(state, largeGap.x + 1, largeGap.y + 1)
      ];
    } else {
      targetCells = [
        normalizeCoords(state, largeGap.x, largeGap.y),
        normalizeCoords(state, largeGap.x + 1, largeGap.y)
      ];
    }
    // Map pieces by x coordinate
    var map = [
      { piece: piece1, target: targetCells.find(t => t.x === piece1.x) },
      { piece: piece2, target: targetCells.find(t => t.x === piece2.x) }
    ];
  }
  
  if (!map[0].target || !map[1].target) return false;
  
  if (dryRun) return true;
  
  // Move the large gap
  const oldGapX = largeGap.x;
  const oldGapY = largeGap.y;
  const newGapPos = normalizeCoords(state, largeGap.x + dx, largeGap.y + dy);
  largeGap.x = newGapPos.x;
  largeGap.y = newGapPos.y;
  
  // Move each piece/gap to its target
  for (const {piece, target} of map) {
    piece.x = target.x;
    piece.y = target.y;
  }
  
  // Update grid
  clearGridCells(state, getLargePieceCells(state, { x: oldGapX, y: oldGapY, id: largeGap.id }));
  setLargePieceGrid(state, largeGap, true);
  
  for (const {piece} of map) {
    state.grid[piece.y][piece.x] = { isGap: piece.isGap, isLarge: false, id: piece.id };
  }
  
  finalizeMove(state, skipRender, dryRun);
  return true;
}

/**
 * Handle 2 small pieces moving into a large gap
 * @param {Object} state - Game state object
 * @param {Object} largeGap - The large gap
 * @param {Object} movingPiece - The piece being moved
 * @param {number} fromX - Source X coordinate
 * @param {number} fromY - Source Y coordinate
 * @param {string} dir - Direction of movement
 * @param {boolean} skipRender - Whether to skip rendering
 * @param {boolean} dryRun - Whether this is a dry run
 * @returns {boolean} True if successful
 */
function handleSmallPiecesIntoLargeGap(state, largeGap, movingPiece, fromX, fromY, dir, skipRender, dryRun) {
  // Calculate direction vector
  let dx = 0, dy = 0;
  if (dir === 'up') { dy = -1; }
  if (dir === 'down') { dy = 1; }
  if (dir === 'left') { dx = -1; }
  if (dir === 'right') { dx = 1; }
  
  // Find the other small piece that should move with this one
  let otherPiecePos = null;
  if (dx !== 0) {
    // Horizontal: look for piece in same column, adjacent row
    const above = normalizeCoords(state, fromX, fromY - 1);
    const below = normalizeCoords(state, fromX, fromY + 1);
    const aboveCell = state.grid[above.y]?.[above.x];
    const belowCell = state.grid[below.y]?.[below.x];
    
    if (aboveCell && !aboveCell.isGap && !aboveCell.isLarge) {
      otherPiecePos = above;
    } else if (belowCell && !belowCell.isGap && !belowCell.isLarge) {
      otherPiecePos = below;
    }
  } else if (dy !== 0) {
    // Vertical: look for piece in same row, adjacent column
    const left = normalizeCoords(state, fromX - 1, fromY);
    const right = normalizeCoords(state, fromX + 1, fromY);
    const leftCell = state.grid[left.y]?.[left.x];
    const rightCell = state.grid[right.y]?.[right.x];
    
    if (leftCell && !leftCell.isGap && !leftCell.isLarge) {
      otherPiecePos = left;
    } else if (rightCell && !rightCell.isGap && !rightCell.isLarge) {
      otherPiecePos = right;
    }
  }
  
  if (!otherPiecePos) return false;
  
  const otherPiece = state.pieceById.get(state.grid[otherPiecePos.y][otherPiecePos.x].id);
  if (!otherPiece) return false;
  
  // Check if both pieces would move into the large gap's cells
  const piece1NewPos = normalizeCoords(state, movingPiece.x + dx, movingPiece.y + dy);
  const piece2NewPos = normalizeCoords(state, otherPiece.x + dx, otherPiece.y + dy);
  
  // Get all 4 cells of the large gap
  const gapCells = [
    normalizeCoords(state, largeGap.x, largeGap.y),
    normalizeCoords(state, largeGap.x + 1, largeGap.y),
    normalizeCoords(state, largeGap.x, largeGap.y + 1),
    normalizeCoords(state, largeGap.x + 1, largeGap.y + 1)
  ];
  
  // Check if both new positions are within the large gap
  const piece1InGap = gapCells.some(c => c.x === piece1NewPos.x && c.y === piece1NewPos.y);
  const piece2InGap = gapCells.some(c => c.x === piece2NewPos.x && c.y === piece2NewPos.y);
  
  if (!piece1InGap || !piece2InGap) return false;
  
  // The 2 cells they DON'T occupy become the new gap position
  const freedCells = gapCells.filter(c =>
    !(c.x === piece1NewPos.x && c.y === piece1NewPos.y) &&
    !(c.x === piece2NewPos.x && c.y === piece2NewPos.y)
  );
  
  if (freedCells.length !== 2) return false;
  
  if (dryRun) return true;
  
  // Move both pieces
  movingPiece.x = piece1NewPos.x;
  movingPiece.y = piece1NewPos.y;
  otherPiece.x = piece2NewPos.x;
  otherPiece.y = piece2NewPos.y;
  
  // Move large gap to freed cells
  if (dx !== 0) {
    largeGap.x = freedCells[0].x;
    largeGap.y = Math.min(freedCells[0].y, freedCells[1].y);
  } else {
    largeGap.x = Math.min(freedCells[0].x, freedCells[1].x);
    largeGap.y = freedCells[0].y;
  }
  
  // Update grid
  state.grid[fromY][fromX] = null;
  state.grid[otherPiecePos.y][otherPiecePos.x] = null;
  clearGridCells(state, gapCells);
  
  state.grid[movingPiece.y][movingPiece.x] = { isGap: false, isLarge: false, id: movingPiece.id };
  state.grid[otherPiece.y][otherPiece.x] = { isGap: false, isLarge: false, id: otherPiece.id };
  
  setLargePieceGrid(state, largeGap, true);
  
  finalizeMove(state, skipRender, dryRun);
  return true;
}

/**
 * Check if gaps are adjacent and form a valid chain
 * @param {Object} state - Game state object
 * @param {Array} gaps - Array of gap objects
 * @param {number} dx - Direction X
 * @param {number} dy - Direction Y
 * @returns {boolean} True if gaps are properly adjacent
 */
function areGapsAdjacent(state, gaps, dx, dy) {
  if (gaps.length < 2) return true;
  
  // For 2 gaps, they just need to be aligned in the perpendicular direction
  // and their positions should differ by 2 in the parallel direction
  // (accounting for wrapping - they could be on opposite sides of the board)
  if (gaps.length === 2) {
    const gap1 = gaps[0];
    const gap2 = gaps[1];
    
    if (dx !== 0) {
      // Horizontal movement: gaps must be vertically adjacent
      // They must have the same x coordinate
      if (gap1.x !== gap2.x) {
        return false;
      }
      // They must be 2 apart in y (accounting for wrapping)
      const yDiff = Math.abs(gap1.y - gap2.y);
      const boardHeight = state.boardConfig.height;
      // Check both normal distance and wrapped distance
      const isAdjacent = (yDiff === 2) || (yDiff === boardHeight - 2);
      if (!isAdjacent) {
        return false;
      }
    } else if (dy !== 0) {
      // Vertical movement: gaps must be horizontally adjacent
      // They must have the same y coordinate
      if (gap1.y !== gap2.y) {
        return false;
      }
      // They must be 2 apart in x (accounting for wrapping)
      const xDiff = Math.abs(gap1.x - gap2.x);
      const boardWidth = state.boardConfig.width;
      // Check both normal distance and wrapped distance
      const isAdjacent = (xDiff === 2) || (xDiff === boardWidth - 2);
      if (!isAdjacent) {
        return false;
      }
    }
    
    return true;
  }
  
  // For 3+ gaps, use the original logic
  // Gaps must be adjacent in the direction perpendicular to movement
  if (dx !== 0) {
    // Horizontal movement: gaps must be vertically adjacent
    const sortedGaps = [...gaps].sort((a, b) => a.y - b.y);
    for (let i = 1; i < sortedGaps.length; i++) {
      if (sortedGaps[i].y !== sortedGaps[i-1].y + 2) {
        return false; // Gap in the chain
      }
      if (sortedGaps[i].x !== sortedGaps[i-1].x) {
        return false; // Not aligned
      }
    }
  } else if (dy !== 0) {
    // Vertical movement: gaps must be horizontally adjacent
    const sortedGaps = [...gaps].sort((a, b) => a.x - b.x);
    for (let i = 1; i < sortedGaps.length; i++) {
      if (sortedGaps[i].x !== sortedGaps[i-1].x + 2) {
        return false; // Gap in the chain
      }
      if (sortedGaps[i].y !== sortedGaps[i-1].y) {
        return false; // Not aligned
      }
    }
  }
  
  return true;
}

/**
 * Find small pieces to fill target cells
 * @param {Object} state - Game state object
 * @param {Object} largePiece - Large piece object
 * @param {Array} targetCells - Array of {x, y} target cells
 * @param {number} dx - Direction X
 * @param {number} dy - Direction Y
 * @returns {Array|null} Array of small pieces or null if invalid
 */
function findSmallPiecesToFill(state, largePiece, targetCells, dx, dy) {
  // Small pieces should be adjacent to large piece in opposite direction
  const oppositeDx = -dx;
  const oppositeDy = -dy;
  
  const smallPieces = [];
  
  // For each target cell, find a small piece that can fill it
  for (const targetCell of targetCells) {
    // Calculate where the piece should currently be
    const sourcePos = normalizeCoords(
      state,
      targetCell.x + oppositeDx,
      targetCell.y + oppositeDy
    );
    
    const sourceCell = state.grid[sourcePos.y]?.[sourcePos.x];
    if (!sourceCell || sourceCell.isGap || sourceCell.isLarge) {
      return null; // Invalid configuration
    }
    
    const piece = state.pieceById.get(sourceCell.id);
    if (!piece) {
      return null;
    }
    
    smallPieces.push(piece);
  }
  
  return smallPieces;
}

/**
 * Detect if a large piece's movement would overlap with multiple large gaps
 * @param {Object} state - Game state object
 * @param {Object} largePiece - Large piece object
 * @param {number} dx - Direction X
 * @param {number} dy - Direction Y
 * @param {Array} destCells - Destination cells for the large piece
 * @returns {Object|null} Chain information or null
 */
function detectLargeGapChain(state, largePiece, dx, dy, destCells) {
  // Get cells at destination
  const destCell1 = state.grid[destCells[0].y]?.[destCells[0].x];
  const destCell2 = state.grid[destCells[1].y]?.[destCells[1].x];
  
  // Both destination cells must be large gaps
  if (!destCell1?.isGap || !destCell1?.isLarge || !destCell2?.isGap || !destCell2?.isLarge) {
    return null; // Not both large gaps
  }
  
  // Check if they belong to different gaps
  if (destCell1.id === destCell2.id) {
    return null; // Same gap, not a chain (handled by existing swap logic)
  }
  
  // Collect all large gap IDs that overlap with destination
  const gapIds = new Set();
  for (const cell of destCells) {
    const gridCell = state.grid[cell.y]?.[cell.x];
    if (gridCell?.isGap && gridCell?.isLarge) {
      gapIds.add(gridCell.id);
    }
  }
  
  // Must have at least 2 gaps for a chain
  if (gapIds.size < 2) {
    return null;
  }
  
  // Get gap objects
  const gaps = Array.from(gapIds).map(id => state.pieceById.get(id));
  
  // Verify gaps are adjacent and form a valid chain
  if (!areGapsAdjacent(state, gaps, dx, dy)) {
    return null;
  }
  
  return {
    gaps,
    isChain: true,
    gapCount: gaps.length
  };
}

/**
 * Validate that all gaps in the chain can move together
 * @param {Object} state - Game state object
 * @param {Object} chainInfo - Chain information
 * @param {Object} largePiece - Large piece object
 * @param {number} dx - Direction X
 * @param {number} dy - Direction Y
 * @returns {Object|null} Move plan or null if invalid
 */
function validateChainMove(state, chainInfo, largePiece, dx, dy) {
  const { gaps } = chainInfo;
  const movePlan = {
    gaps: [],
    largePiece: null,
    smallPieces: []
  };
  
  // The large piece moves by 2 cells (its width/height) in the direction
  // The gaps move by 2 cells in the OPPOSITE direction
  const pieceDx = dx * 2;
  const pieceDy = dy * 2;
  const gapDx = -pieceDx;
  const gapDy = -pieceDy;
  
  // Calculate new positions for all gaps
  for (const gap of gaps) {
    const newPos = normalizeCoords(state, gap.x + gapDx, gap.y + gapDy);
    
    // Check bounds
    if (!isValidCoord(state, newPos.x, newPos.y)) {
      return null;
    }
    
    movePlan.gaps.push({ gap, newX: newPos.x, newY: newPos.y });
  }
  
  // Calculate new position for large piece
  const pieceNewPos = normalizeCoords(state, largePiece.x + pieceDx, largePiece.y + pieceDy);
  movePlan.largePiece = { piece: largePiece, newX: pieceNewPos.x, newY: pieceNewPos.y };
  
  // Identify cells that will be freed by gaps moving
  const freedCells = [];
  for (const gap of gaps) {
    const gapCells = getLargePieceCells(state, gap);
    for (const cell of gapCells) {
      // Check if this cell won't be occupied by another gap after move
      const willBeOccupied = movePlan.gaps.some(g => {
        const occupiedCells = getLargePieceCells(state, { x: g.newX, y: g.newY });
        return occupiedCells.some(oc => oc.x === cell.x && oc.y === cell.y);
      });
      if (!willBeOccupied) {
        freedCells.push(cell);
      }
    }
  }
  
  // Calculate which cells will be occupied by large piece
  const pieceCells = getLargePieceCells(state, { x: pieceNewPos.x, y: pieceNewPos.y });
  
  // Remaining freed cells must be filled by small pieces
  const remainingCells = freedCells.filter(fc =>
    !pieceCells.some(pc => pc.x === fc.x && pc.y === fc.y)
  );
  
  // Find small pieces to fill remaining cells
  // They must be adjacent to the large piece in the opposite direction
  const smallPieces = findSmallPiecesToFill(state, largePiece, remainingCells, pieceDx, pieceDy);
  if (!smallPieces || smallPieces.length !== remainingCells.length) {
    return null;
  }
  
  movePlan.smallPieces = smallPieces.map((piece, i) => ({
    piece,
    newX: remainingCells[i].x,
    newY: remainingCells[i].y
  }));
  
  return movePlan;
}

/**
 * Execute the coordinated chain move atomically
 * @param {Object} state - Game state object
 * @param {Object} movePlan - Move plan with all entity movements
 * @param {boolean} skipRender - Whether to skip rendering
 * @param {boolean} dryRun - Whether this is a dry run
 * @returns {boolean} True if successful
 */
function executeChainMove(state, movePlan, skipRender, dryRun) {
  if (dryRun) return true;
  
  // Store old positions for clearing grid
  const oldGapPositions = movePlan.gaps.map(g => ({ x: g.gap.x, y: g.gap.y, gap: g.gap }));
  const oldPiecePos = { x: movePlan.largePiece.piece.x, y: movePlan.largePiece.piece.y };
  const oldSmallPiecePositions = movePlan.smallPieces.map(sp => ({ x: sp.piece.x, y: sp.piece.y }));
  
  // Update positions for all entities
  // Move all gaps in chain
  for (const { gap, newX, newY } of movePlan.gaps) {
    gap.x = newX;
    gap.y = newY;
  }
  
  // Move large piece
  movePlan.largePiece.piece.x = movePlan.largePiece.newX;
  movePlan.largePiece.piece.y = movePlan.largePiece.newY;
  
  // Move small pieces
  for (const { piece, newX, newY } of movePlan.smallPieces) {
    piece.x = newX;
    piece.y = newY;
  }
  
  // Update grid state
  // Clear old positions
  for (const { x, y, gap } of oldGapPositions) {
    clearGridCells(state, getLargePieceCells(state, { x, y, id: gap.id }));
  }
  clearGridCells(state, getLargePieceCells(state, { x: oldPiecePos.x, y: oldPiecePos.y, id: movePlan.largePiece.piece.id }));
  for (let i = 0; i < oldSmallPiecePositions.length; i++) {
    const { x, y } = oldSmallPiecePositions[i];
    state.grid[y][x] = null;
  }
  
  // Set new positions for all entities
  for (const { gap } of movePlan.gaps) {
    setLargePieceGrid(state, gap, true);
  }
  setLargePieceGrid(state, movePlan.largePiece.piece, false);
  for (const { piece } of movePlan.smallPieces) {
    state.grid[piece.y][piece.x] = { isGap: false, isLarge: false, id: piece.id };
  }
  
  finalizeMove(state, skipRender, dryRun);
  return true;
}

/**
 * Main movement function - attempts to move a piece into a gap
 * @param {Object} state - Game state object
 * @param {string} dir - Direction ('up'|'down'|'left'|'right')
 * @param {Object} gap - Optional gap to use for the move (if not provided, uses selected gap)
 * @param {Array} cachedGapPieces - Optional cached array of gap pieces
 * @param {boolean} dryRun - If true, only validate the move without executing it
 * @returns {boolean} True if move was successful (or would be successful in dry-run mode)
 */
export function tryMove(state, dir, gap, cachedGapPieces = null, dryRun = false) {
  // Prevent moves if challenge is solved or timer is paused
  if (state.gameMode === 'challenge' && !state.isShuffling && (state.challengeSolved || state.timerPaused)) {
    return false;
  }
  
  // IMPORTANT: The 'dir' parameter is COUNTERINTUITIVE!
  // It specifies where to look for something to move INTO the gap, NOT the direction of movement.
  // - tryMove('right') looks at g.x - 1 (to the LEFT)
  // - tryMove('left') looks at g.x + 1 (to the RIGHT)
  // - tryMove('down') looks at g.y - 1 (ABOVE)
  // - tryMove('up') looks at g.y + 1 (BELOW)
  //
  // For gap swapping: To swap with a gap to the RIGHT, call tryMove('left')!
  // When implementing swipe/drag controls, always REVERSE the direction.
  
  // Get gap to use (either provided or selected)
  const gapPieces = cachedGapPieces || state.pieces.filter(p => p.isGap);
  const selectedGap = gap || gapPieces.find(p => p.selected);
  if (!selectedGap) return false;
  
  // dir: 'up'|'down'|'left'|'right'
  // For large gaps, we need to look beyond the gap's 2x2 extent
  let fromX = selectedGap.x, fromY = selectedGap.y, dx = 0, dy = 0;
  if (selectedGap.isLarge) {
    // Large gap: look beyond the 2x2 extent
    if (dir === 'up') { fromY = selectedGap.y + 2; fromX = selectedGap.x; dx = 0; dy = -1; }
    if (dir === 'down') { fromY = selectedGap.y - 1; fromX = selectedGap.x; dx = 0; dy = 1; }
    if (dir === 'left') { fromX = selectedGap.x + 2; fromY = selectedGap.y; dx = -1; dy = 0; }
    if (dir === 'right'){ fromX = selectedGap.x - 1; fromY = selectedGap.y; dx = 1; dy = 0; }
  } else {
    // Small gap: normal offset
    if (dir === 'up') { fromY = selectedGap.y + 1; fromX = selectedGap.x; dx = 0; dy = -1; }
    if (dir === 'down') { fromY = selectedGap.y - 1; fromX = selectedGap.x; dx = 0; dy = 1; }
    if (dir === 'left') { fromX = selectedGap.x + 1; fromY = selectedGap.y; dx = -1; dy = 0; }
    if (dir === 'right'){ fromX = selectedGap.x - 1; fromY = selectedGap.y; dx = 1; dy = 0; }
  }
  
  // Apply wrapping to source coordinates
  const wrappedFrom = normalizeCoords(state, fromX, fromY);
  fromX = wrappedFrom.x;
  fromY = wrappedFrom.y;
  
  // Check bounds (with wrapping, coordinates should always be valid after normalization)
  if (fromX < 0 || fromX >= state.boardConfig.width || fromY < 0 || fromY >= state.boardConfig.height) return false;
  
  const sourceCell = state.grid[fromY][fromX];
  if (!sourceCell) return false;
  
  // Determine if we should skip rendering (during shuffle in Challenge Mode)
  const skipRender = state.isShuffling && state.gameMode === 'challenge';
  
  // CASE 1: Gap-to-gap swap (same size)
  if (sourceCell.isGap) {
    const otherGap = state.pieceById.get(sourceCell.id);
    if (!otherGap) return false;
    
    // Check if both gaps are the same size
    if (selectedGap.isLarge === otherGap.isLarge) {
      // For large gaps, verify proper alignment
      if (selectedGap.isLarge) {
        const checkCells = calculateCheckCells(state, selectedGap, dir);
        const allSameGap = checkCells.every(c => {
          const cell = state.grid[c.y]?.[c.x];
          return cell?.isGap && cell?.isLarge && cell.id === otherGap.id;
        });
        if (!allSameGap) return false;
      }
      
      return executeSwap(state, selectedGap, otherGap, skipRender, dryRun);
    }
    // If gaps are different sizes, fall through to other cases
  }

  // CASE 2: Large gap moving into 2 small pieces/gaps
  if (selectedGap.isLarge) {
    // Check if this is a chain move scenario
    // For large gaps, we need to check BOTH cells that would be involved
    const checkCells = calculateCheckCells(state, selectedGap, dir);
    
    // Check if any of the check cells contains a large piece
    let largePieceId = null;
    for (const cell of checkCells) {
      const gridCell = state.grid[cell.y]?.[cell.x];
      if (gridCell && !gridCell.isGap && gridCell.isLarge) {
        largePieceId = gridCell.id;
        break;
      }
    }
    
    if (largePieceId) {
      const movingPiece = state.pieceById.get(largePieceId);
      if (movingPiece) {
        // Calculate where the large piece would move
        const result = calculateLargePieceDestination(state, movingPiece, dx, dy);
        if (result) {
          const { destCells: dest } = result;
          
          // Check for multi-gap chain
          const chainInfo = detectLargeGapChain(state, movingPiece, dx, dy, dest);
          if (chainInfo && chainInfo.isChain) {
            const movePlan = validateChainMove(state, chainInfo, movingPiece, dx, dy);
            if (movePlan) {
              return executeChainMove(state, movePlan, skipRender, dryRun);
            }
          }
        }
      }
    }
    
    return handleLargeGapMovement(state, selectedGap, dir, skipRender, dryRun);
  }

  // CASE 3: Regular piece movement
  const movingPiece = state.pieceById.get(sourceCell.id);
  if (!movingPiece) return false;

  // CASE 3a: Small piece into large gap (requires 2 aligned pieces)
  if (!movingPiece.isLarge && selectedGap.isLarge) {
    return handleSmallPiecesIntoLargeGap(state, selectedGap, movingPiece, fromX, fromY, dir, skipRender, dryRun);
  }
  
  // CASE 3b: Small piece into small gap (simple swap)
  if (!movingPiece.isLarge && !selectedGap.isLarge) {
    if (dryRun) return true;
    
    const newPos = normalizeCoords(state, movingPiece.x + dx, movingPiece.y + dy);
    movingPiece.x = newPos.x;
    movingPiece.y = newPos.y;
    selectedGap.x = fromX;
    selectedGap.y = fromY;

    state.grid[movingPiece.y][movingPiece.x] = { isGap: false, isLarge: false, id: movingPiece.id };
    state.grid[selectedGap.y][selectedGap.x] = { isGap: true, isLarge: false, id: selectedGap.id };
    
    finalizeMove(state, skipRender, dryRun);
    return true;
  }

  // CASE 3c: Large piece movement
  if (movingPiece.isLarge) {
    const result = calculateLargePieceDestination(state, movingPiece, dx, dy);
    if (!result) return false;
    
    const { destCells: dest, freedCells: freed } = result;

    // Check for multi-gap chain
    const chainInfo = detectLargeGapChain(state, movingPiece, dx, dy, dest);
    if (chainInfo && chainInfo.isChain) {
      const movePlan = validateChainMove(state, chainInfo, movingPiece, dx, dy);
      if (movePlan) {
        return executeChainMove(state, movePlan, skipRender, dryRun);
      }
    }

    // Check if destination is a large gap (swap case)
    const destCell = state.grid[dest[0].y]?.[dest[0].x];
    if (destCell?.isGap && destCell?.isLarge && selectedGap.isLarge) {
      const largeGap = state.pieceById.get(destCell.id);
      
      const allSameGap = dest.every(d => {
        const cell = state.grid[d.y]?.[d.x];
        return cell?.isGap && cell?.isLarge && cell.id === largeGap.id;
      });
      
      if (allSameGap) {
        return executeSwap(state, movingPiece, largeGap, skipRender, dryRun);
      }
    }
    
    // Large piece moving into 2 small gaps
    const destAreSmallGaps = dest.every(d => {
      const cell = state.grid[d.y]?.[d.x];
      return cell?.isGap && !cell?.isLarge;
    });
    
    if (selectedGap.isLarge) return false;
    
    const selectedIsDest = dest.some(d => d.x === selectedGap.x && d.y === selectedGap.y);
    if (!(destAreSmallGaps && selectedIsDest)) return false;

    const gapAt = (c) => gapPieces.find(g => g.x === c.x && g.y === c.y);
    
    const map = [];
    if (dx !== 0) {
      for (const d of dest) {
        const gap = gapAt(d);
        if (!gap) return false;
        const target = freed.find(f => f.y === d.y);
        if (!target) return false;
        map.push({ gap, target });
      }
    } else {
      for (const d of dest) {
        const gap = gapAt(d);
        if (!gap) return false;
        const target = freed.find(f => f.x === d.x);
        if (!target) return false;
        map.push({ gap, target });
      }
    }
    
    if (dryRun) return true;
    
    const oldPieceX = movingPiece.x;
    const oldPieceY = movingPiece.y;
    const newPos = normalizeCoords(state, movingPiece.x + dx, movingPiece.y + dy);
    movingPiece.x = newPos.x;
    movingPiece.y = newPos.y;

    for (const {gap, target} of map) {
      gap.x = target.x;
      gap.y = target.y;
    }

    clearGridCells(state, getLargePieceCells(state, { x: oldPieceX, y: oldPieceY, id: movingPiece.id }));
    setLargePieceGrid(state, movingPiece, false);
    
    for (const {gap} of map) {
      state.grid[gap.y][gap.x] = { isGap: true, isLarge: false, id: gap.id };
    }
    
    finalizeMove(state, skipRender, dryRun);
    return true;
  }

  return false;
}

/**
 * Enumerate all valid moves from current state
 * @param {Object} state - Game state object
 * @param {Array} cachedGapPieces - Cached array of gap pieces
 * @returns {Array} Array of move objects with metadata
 */
export function enumerateValidMoves(state, cachedGapPieces) {
  const moves = [];
  
  for (const gap of cachedGapPieces) {
    for (const dir of ['up','down','left','right']) {
      // Use tryMove in dry-run mode with explicit gap parameter
      if (tryMove(state, dir, gap, cachedGapPieces, true)) {
        // Determine metadata about the move type
        let fromX = gap.x, fromY = gap.y;
        
        // Calculate source position (same logic as tryMove)
        if (gap.isLarge) {
          if (dir === 'up') fromY = gap.y + 2;
          if (dir === 'down') fromY = gap.y - 1;
          if (dir === 'left') fromX = gap.x + 2;
          if (dir === 'right') fromX = gap.x - 1;
        } else {
          if (dir === 'up') fromY = gap.y + 1;
          if (dir === 'down') fromY = gap.y - 1;
          if (dir === 'left') fromX = gap.x + 1;
          if (dir === 'right') fromX = gap.x - 1;
        }
        
        // Apply wrapping to coordinates
        const wrappedFrom = normalizeCoords(state, fromX, fromY);
        fromX = wrappedFrom.x;
        fromY = wrappedFrom.y;
        
        // Determine move metadata
        const sourceCell = state.grid[fromY]?.[fromX];
        const isBig = sourceCell?.isLarge && !sourceCell?.isGap;
        const isGapSwap = sourceCell?.isGap;
        
        moves.push({ gap, dir, isBig, isGapSwap });
      }
    }
  }
  
  return moves;
}