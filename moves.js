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
  if (!state.wrapHorizontal && !state.wrapVertical) {
    // No wrapping: use original boundary check
    if (fromX < 0 || fromX >= state.boardConfig.width || fromY < 0 || fromY >= state.boardConfig.height) return false;
  }

  const sourceCell = state.grid[fromY][fromX];
  if (!sourceCell) return false;
  
  // Determine if we should skip rendering (during shuffle in Challenge Mode)
  const skipRender = state.isShuffling && state.gameMode === 'challenge';
  
  // Check if source is another gap (gap swap - small or large)
  if (sourceCell.isGap) {
    const otherGap = state.pieceById.get(sourceCell.id);
    
    // Safety check: ensure otherGap exists
    if (!otherGap) return false;
    
    // Check if both gaps are the same size (both small or both large)
    if (selectedGap.isLarge === otherGap.isLarge) {
      // Valid move - return early if dry run
      if (dryRun) return true;
      
      // Swap positions
      [selectedGap.x, selectedGap.y, otherGap.x, otherGap.y] =
        [otherGap.x, otherGap.y, selectedGap.x, selectedGap.y];
      
      if (selectedGap.isLarge) {
        // Large gap swap: update all 4 cells for each gap
        // Clear old positions
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const oldSelectedPos = normalizeCoords(state, otherGap.x + dx, otherGap.y + dy);
            const oldOtherPos = normalizeCoords(state, selectedGap.x + dx, selectedGap.y + dy);
            state.grid[oldSelectedPos.y][oldSelectedPos.x] = null;
            state.grid[oldOtherPos.y][oldOtherPos.x] = null;
          }
        }
        // Set new positions
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const newSelectedPos = normalizeCoords(state, selectedGap.x + dx, selectedGap.y + dy);
            const newOtherPos = normalizeCoords(state, otherGap.x + dx, otherGap.y + dy);
            state.grid[newSelectedPos.y][newSelectedPos.x] = { isGap: true, isLarge: true, id: selectedGap.id, ox: dx, oy: dy };
            state.grid[newOtherPos.y][newOtherPos.x] = { isGap: true, isLarge: true, id: otherGap.id, ox: dx, oy: dy };
          }
        }
      } else {
        // Small gap swap: just swap the two cells
        state.grid[selectedGap.y][selectedGap.x] = { isGap: true, isLarge: false, id: selectedGap.id };
        state.grid[otherGap.y][otherGap.x] = { isGap: true, isLarge: false, id: otherGap.id };
      }
      
      if (!skipRender) state.renderAll();
      
      // Capture history AFTER successful move (not during shuffle or dry-run)
      if (!dryRun && !state.isShuffling && state.captureHistorySnapshot) {
        state.captureHistorySnapshot();
      }
      
      if (state.gameMode === 'challenge' && !state.isShuffling) {
        state.incrementMoveCount();
        if (state.checkWinCondition()) {
          state.handleWin();
        }
      }
      return true;
    }
    // If gaps are different sizes, fall through to check other movement options
  }

  // Check if selected gap is large
  if (selectedGap.isLarge) {
    // Large gap moving into 2 aligned small pieces/gaps
    // Calculate direction vector for WHERE THE GAP WOULD MOVE
    // Remember: dir is inverted - it specifies where to look for pieces, not where gap moves
    // So we need to INVERT the direction for the gap's actual movement
    let dx = 0, dy = 0;
    if (dir === 'up') { dy = 1; }    // Look below (pieces move up), gap moves down
    if (dir === 'down') { dy = -1; } // Look above (pieces move down), gap moves up
    if (dir === 'left') { dx = 1; }  // Look right (pieces move left), gap moves right
    if (dir === 'right') { dx = -1; } // Look left (pieces move right), gap moves left
    
    // Check if large gap can move in this direction (boundary check for 2×2)
    // Without wrapping, the new position must fit within board bounds
    if (!state.wrapHorizontal) {
      if (dx === 1 && selectedGap.x + 2 >= state.boardConfig.width) return false;
      if (dx === -1 && selectedGap.x - 1 < 0) return false;
    }
    if (!state.wrapVertical) {
      if (dy === 1 && selectedGap.y + 2 >= state.boardConfig.height) return false;
      if (dy === -1 && selectedGap.y - 1 < 0) return false;
    }
    
    // Calculate which cells to check for pieces that would move into the gap
    // dir parameter tells us where to LOOK for pieces (inverted semantics)
    // dir='down' means look ABOVE (at y-1), pieces move down, gap moves up
    // dir='up' means look BELOW (at y+2), pieces move up, gap moves down
    let destCells = [];
    if (dir === 'left' || dir === 'right') {
      // Horizontal: check for 2 vertically aligned cells
      if (dir === 'right') {
        // dir='right' means look LEFT (at x-1)
        const cell1 = normalizeCoords(state, selectedGap.x - 1, selectedGap.y);
        const cell2 = normalizeCoords(state, selectedGap.x - 1, selectedGap.y + 1);
        destCells = [{x: cell1.x, y: cell1.y}, {x: cell2.x, y: cell2.y}];
      } else {
        // dir='left' means look RIGHT (at x+2)
        const cell1 = normalizeCoords(state, selectedGap.x + 2, selectedGap.y);
        const cell2 = normalizeCoords(state, selectedGap.x + 2, selectedGap.y + 1);
        destCells = [{x: cell1.x, y: cell1.y}, {x: cell2.x, y: cell2.y}];
      }
    } else if (dir === 'up' || dir === 'down') {
      // Vertical: check for 2 horizontally aligned cells
      if (dir === 'down') {
        // dir='down' means look ABOVE (at y-1)
        const cell1 = normalizeCoords(state, selectedGap.x, selectedGap.y - 1);
        const cell2 = normalizeCoords(state, selectedGap.x + 1, selectedGap.y - 1);
        destCells = [{x: cell1.x, y: cell1.y}, {x: cell2.x, y: cell2.y}];
      } else {
        // dir='up' means look BELOW (at y+2)
        const cell1 = normalizeCoords(state, selectedGap.x, selectedGap.y + 2);
        const cell2 = normalizeCoords(state, selectedGap.x + 1, selectedGap.y + 2);
        destCells = [{x: cell1.x, y: cell1.y}, {x: cell2.x, y: cell2.y}];
      }
    }
    
    // Verify both destination cells exist and are small pieces or small gaps (not large pieces/gaps)
    if (destCells.length === 2) {
      const dest1Cell = state.grid[destCells[0].y]?.[destCells[0].x];
      const dest2Cell = state.grid[destCells[1].y]?.[destCells[1].x];
      
      if (dest1Cell && dest2Cell &&
          !dest1Cell.isLarge &&
          !dest2Cell.isLarge) {
        
        // Get the pieces/gaps at destination
        const piece1 = state.pieceById.get(dest1Cell.id);
        const piece2 = state.pieceById.get(dest2Cell.id);
        
        if (piece1 && piece2) {
          // Calculate freed cells (where the large gap currently is)
          const freedCells = [
            normalizeCoords(state, selectedGap.x, selectedGap.y),
            normalizeCoords(state, selectedGap.x + 1, selectedGap.y),
            normalizeCoords(state, selectedGap.x, selectedGap.y + 1),
            normalizeCoords(state, selectedGap.x + 1, selectedGap.y + 1)
          ];
          
          // Determine where each piece/gap should move
          // The pieces should move THROUGH the gap to the far side
          // The gap should move to where the pieces currently are
          let map = [];
          
          // Calculate where pieces should end up (on the FAR side of the gap)
          let targetCells = [];
          if (dir === 'left' || dir === 'right') {
            // Horizontal: pieces move through gap horizontally
            if (dir === 'right') {
              // Pieces move right, should end up at gap's right edge
              targetCells = [
                normalizeCoords(state, selectedGap.x + 1, selectedGap.y),
                normalizeCoords(state, selectedGap.x + 1, selectedGap.y + 1)
              ];
            } else {
              // Pieces move left, should end up at gap's left edge
              targetCells = [
                normalizeCoords(state, selectedGap.x, selectedGap.y),
                normalizeCoords(state, selectedGap.x, selectedGap.y + 1)
              ];
            }
            // Map pieces by y coordinate
            map = [
              { piece: piece1, target: targetCells.find(t => t.y === piece1.y) },
              { piece: piece2, target: targetCells.find(t => t.y === piece2.y) }
            ];
          } else {
            // Vertical: pieces move through gap vertically
            if (dir === 'down') {
              // Pieces move down, should end up at gap's bottom edge
              targetCells = [
                normalizeCoords(state, selectedGap.x, selectedGap.y + 1),
                normalizeCoords(state, selectedGap.x + 1, selectedGap.y + 1)
              ];
            } else {
              // Pieces move up, should end up at gap's top edge
              targetCells = [
                normalizeCoords(state, selectedGap.x, selectedGap.y),
                normalizeCoords(state, selectedGap.x + 1, selectedGap.y)
              ];
            }
            // Map pieces by x coordinate
            map = [
              { piece: piece1, target: targetCells.find(t => t.x === piece1.x) },
              { piece: piece2, target: targetCells.find(t => t.x === piece2.x) }
            ];
          }
          
          if (map.length === 2 && map[0].target && map[1].target) {
            // Valid move - return early if dry run
            if (dryRun) return true;
            
            // Move the large gap in the direction it should actually move
            const oldGapX = selectedGap.x;
            const oldGapY = selectedGap.y;
            // Use the corrected dx, dy which represent the gap's actual movement
            const newGapPos = normalizeCoords(state, selectedGap.x + dx, selectedGap.y + dy);
            selectedGap.x = newGapPos.x;
            selectedGap.y = newGapPos.y;
            
            // Move each piece/gap to its mapped target cell
            for (const {piece, target} of map) {
              piece.x = target.x;
              piece.y = target.y;
            }
            
            // Update grid: clear old large gap position (4 cells)
            for (let gy = 0; gy < 2; gy++) {
              for (let gx = 0; gx < 2; gx++) {
                const oldCell = normalizeCoords(state, oldGapX + gx, oldGapY + gy);
                state.grid[oldCell.y][oldCell.x] = null;
              }
            }
            
            // Set new large gap position (4 cells)
            for (let gy = 0; gy < 2; gy++) {
              for (let gx = 0; gx < 2; gx++) {
                const newCell = normalizeCoords(state, selectedGap.x + gx, selectedGap.y + gy);
                state.grid[newCell.y][newCell.x] = {
                  isGap: true,
                  isLarge: true,
                  id: selectedGap.id,
                  ox: gx,
                  oy: gy
                };
              }
            }
            
            // Update moved pieces/gaps in grid
            for (const {piece} of map) {
              state.grid[piece.y][piece.x] = { isGap: piece.isGap, isLarge: false, id: piece.id };
            }
            
            if (!skipRender) state.renderAll();
            
            // Capture history AFTER successful move (not during shuffle or dry-run)
            if (!dryRun && !state.isShuffling && state.captureHistorySnapshot) {
              state.captureHistorySnapshot();
            }
            
            if (state.gameMode === 'challenge' && !state.isShuffling) {
              state.incrementMoveCount();
              if (state.checkWinCondition()) {
                state.handleWin();
              }
            }
            return true;
          }
        }
      }
    }
  }

  // Regular piece movement (small or big)
  const movingPiece = state.pieceById.get(sourceCell.id);
  if (!movingPiece) return false;

  if (!movingPiece.isLarge) {
    // Small piece movement
    // Check if this is part of 2 aligned small pieces moving into a large gap
    if (selectedGap.isLarge) {
      // Calculate direction vector
      let dx = 0, dy = 0;
      if (dir === 'up') { dy = -1; }
      if (dir === 'down') { dy = 1; }
      if (dir === 'left') { dx = -1; }
      if (dir === 'right') { dx = 1; }
      
      // Find the other small piece that should move with this one
      let otherPiecePos = null;
      if (dx !== 0) {
        // Horizontal movement: look for piece in same column, adjacent row
        // Check both above and below
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
        // Vertical movement: look for piece in same row, adjacent column
        // Check both left and right
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
      
      // If we found an aligned piece, check if both can move into the large gap
      if (otherPiecePos) {
        const otherPiece = state.pieceById.get(state.grid[otherPiecePos.y][otherPiecePos.x].id);
        
        // Check if both pieces would move into the large gap's cells
        const piece1NewPos = normalizeCoords(state, movingPiece.x + dx, movingPiece.y + dy);
        const piece2NewPos = normalizeCoords(state, otherPiece.x + dx, otherPiece.y + dy);
        
        // Get all 4 cells of the large gap
        const gapCells = [
          normalizeCoords(state, selectedGap.x, selectedGap.y),
          normalizeCoords(state, selectedGap.x + 1, selectedGap.y),
          normalizeCoords(state, selectedGap.x, selectedGap.y + 1),
          normalizeCoords(state, selectedGap.x + 1, selectedGap.y + 1)
        ];
        
        // Check if both new positions are within the large gap
        const piece1InGap = gapCells.some(c => c.x === piece1NewPos.x && c.y === piece1NewPos.y);
        const piece2InGap = gapCells.some(c => c.x === piece2NewPos.x && c.y === piece2NewPos.y);
        
        if (piece1InGap && piece2InGap) {
          // Both pieces move into the large gap
          // The 2 cells they DON'T occupy become the new gap position
          const freedCells = gapCells.filter(c =>
            !(c.x === piece1NewPos.x && c.y === piece1NewPos.y) &&
            !(c.x === piece2NewPos.x && c.y === piece2NewPos.y)
          );
          
          if (freedCells.length === 2) {
            // Valid move - return early if dry run
            if (dryRun) return true;
            
            // Move both pieces
            movingPiece.x = piece1NewPos.x;
            movingPiece.y = piece1NewPos.y;
            otherPiece.x = piece2NewPos.x;
            otherPiece.y = piece2NewPos.y;
            
            // Move large gap to where the pieces came from
            // The freed cells are the 2 cells within the gap that pieces didn't move into
            // We need to find the 2x2 block that includes these freed cells
            // The gap moves in the OPPOSITE direction from the pieces
            if (dx !== 0) {
              // Horizontal movement: freed cells share same x, differ in y
              // Gap's x position is determined by which cells were freed
              selectedGap.x = freedCells[0].x;
              selectedGap.y = Math.min(freedCells[0].y, freedCells[1].y);
            } else {
              // Vertical movement: freed cells share same y, differ in x
              // Gap's y position is determined by which cells were freed
              selectedGap.x = Math.min(freedCells[0].x, freedCells[1].x);
              selectedGap.y = freedCells[0].y;
            }
            
            // Update grid: clear old positions
            state.grid[fromY][fromX] = null;
            state.grid[otherPiecePos.y][otherPiecePos.x] = null;
            
            // Clear old large gap position (4 cells)
            for (const cell of gapCells) {
              state.grid[cell.y][cell.x] = null;
            }
            
            // Set new piece positions
            state.grid[movingPiece.y][movingPiece.x] = { isGap: false, isLarge: false, id: movingPiece.id };
            state.grid[otherPiece.y][otherPiece.x] = { isGap: false, isLarge: false, id: otherPiece.id };
            
            // Set new large gap position (4 cells)
            for (let gy = 0; gy < 2; gy++) {
              for (let gx = 0; gx < 2; gx++) {
                const newCell = normalizeCoords(state, selectedGap.x + gx, selectedGap.y + gy);
                state.grid[newCell.y][newCell.x] = {
                  isGap: true,
                  isLarge: true,
                  id: selectedGap.id,
                  ox: gx,
                  oy: gy
                };
              }
            }
            
            if (!skipRender) state.renderAll();
            
            // Capture history AFTER successful move (not during shuffle or dry-run)
            if (!dryRun && !state.isShuffling && state.captureHistorySnapshot) {
              state.captureHistorySnapshot();
            }
            
            if (state.gameMode === 'challenge' && !state.isShuffling) {
              state.incrementMoveCount();
              if (state.checkWinCondition()) {
                state.handleWin();
              }
            }
            return true;
          }
        }
      }
      
      // If we couldn't find a valid 2-piece move into large gap, reject the move
      return false;
    }
    
    // Valid move - return early if dry run
    if (dryRun) return true;
    
    // Move small piece into the selected small gap (with wrapping)
    const newPos = normalizeCoords(state, movingPiece.x + dx, movingPiece.y + dy);
    movingPiece.x = newPos.x;
    movingPiece.y = newPos.y;

    // Move selected gap to the freed cell
    selectedGap.x = fromX;
    selectedGap.y = fromY;

    // Incremental grid update for small gap: just swap the two cells
    state.grid[movingPiece.y][movingPiece.x] = { isGap: false, isLarge: false, id: movingPiece.id };
    state.grid[selectedGap.y][selectedGap.x] = { isGap: true, isLarge: false, id: selectedGap.id };
    
    if (!skipRender) state.renderAll();
    
    // Capture history AFTER successful move (not during shuffle or dry-run)
    if (!dryRun && !state.isShuffling && state.captureHistorySnapshot) {
      state.captureHistorySnapshot();
    }
    
    if (state.gameMode === 'challenge' && !state.isShuffling) {
      state.incrementMoveCount();
      if (state.checkWinCondition()) {
        state.handleWin();
      }
    }
    return true;
  }

  if (movingPiece.isLarge) {
    // Use helper function to calculate destination and freed cells
    const result = calculateLargePieceDestination(state, movingPiece, dx, dy);
    if (!result) return false;
    
    const { destCells: dest, freedCells: freed } = result;

    // Check if destination is a large gap (swap case)
    const destCell = state.grid[dest[0].y]?.[dest[0].x];
    if (destCell?.isGap && destCell?.isLarge && selectedGap.isLarge) {
      // Large piece swapping with large gap
      const largeGap = state.pieceById.get(destCell.id);
      
      // Verify all 4 cells of destination belong to the same large gap
      const allSameGap = dest.every(d => {
        const cell = state.grid[d.y]?.[d.x];
        return cell?.isGap && cell?.isLarge && cell.id === largeGap.id;
      });
      
      if (allSameGap) {
        // Valid move - return early if dry run
        if (dryRun) return true;
        
        // Swap positions
        [movingPiece.x, movingPiece.y, largeGap.x, largeGap.y] =
          [largeGap.x, largeGap.y, movingPiece.x, movingPiece.y];
        
        // Update grid: clear old positions and set new positions
        // Clear old piece position
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const oldPiecePos = normalizeCoords(state, largeGap.x + dx, largeGap.y + dy);
            state.grid[oldPiecePos.y][oldPiecePos.x] = null;
          }
        }
        // Clear old gap position
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const oldGapPos = normalizeCoords(state, movingPiece.x + dx, movingPiece.y + dy);
            state.grid[oldGapPos.y][oldGapPos.x] = null;
          }
        }
        // Set new piece position
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const newPiecePos = normalizeCoords(state, movingPiece.x + dx, movingPiece.y + dy);
            state.grid[newPiecePos.y][newPiecePos.x] = { isGap: false, isLarge: true, id: movingPiece.id, ox: dx, oy: dy };
          }
        }
        // Set new gap position
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const newGapPos = normalizeCoords(state, largeGap.x + dx, largeGap.y + dy);
            state.grid[newGapPos.y][newGapPos.x] = { isGap: true, isLarge: true, id: largeGap.id, ox: dx, oy: dy };
          }
        }
        
        if (!skipRender) state.renderAll();
        
        // Capture history AFTER successful move (not during shuffle or dry-run)
        if (!dryRun && !state.isShuffling && state.captureHistorySnapshot) {
          state.captureHistorySnapshot();
        }
        
        if (state.gameMode === 'challenge' && !state.isShuffling) {
          state.incrementMoveCount();
          if (state.checkWinCondition()) {
            state.handleWin();
          }
        }
        return true;
      }
    }
    // Large PIECE moving into 2 small gaps (not large gap movement)
    // Both dest must be small gaps, and the selected gap must be one of them
    const destAreSmallGaps = dest.every(d => {
      const cell = state.grid[d.y]?.[d.x];
      return cell?.isGap && !cell?.isLarge;
    });
    
    // For small gaps moving into large piece: check if selected gap is one of the destination cells
    // For large gaps: this is handled by the swap case above, so we skip this section
    if (selectedGap.isLarge) {
      // Large gap cannot move into large piece via this path (handled by swap above)
      return false;
    }
    
    const selectedIsDest = dest.some(d => d.x === selectedGap.x && d.y === selectedGap.y);
    if (!(destAreSmallGaps && selectedIsDest)) return false;

    // Find which gaps are at destination cells
    const gapAt = (c) => gapPieces.find(g => g.x === c.x && g.y === c.y);
    
    const map = [];
    if (dx !== 0) {
      // Align by y
      for (const d of dest) {
        const gap = gapAt(d);
        if (!gap) return false;
        const target = freed.find(f => f.y === d.y);
        if (!target) return false;
        map.push({ gap, target });
      }
    } else {
      // dy !== 0, align by x
      for (const d of dest) {
        const gap = gapAt(d);
        if (!gap) return false;
        const target = freed.find(f => f.x === d.x);
        if (!target) return false;
        map.push({ gap, target });
      }
    }
    
    // Valid move - return early if dry run
    if (dryRun) return true;
    
    // Move the piece (with wrapping)
    const oldPieceX = movingPiece.x;
    const oldPieceY = movingPiece.y;
    const newPos = normalizeCoords(state, movingPiece.x + dx, movingPiece.y + dy);
    movingPiece.x = newPos.x;
    movingPiece.y = newPos.y;

    // Move each gap to its mapped freed cell
    for (const {gap, target} of map) {
      gap.x = target.x;
      gap.y = target.y;
    }

    // Incremental grid update for big piece move
    // Clear old 2×2 area (with wrapping)
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const oldCellPos = normalizeCoords(state, oldPieceX + dx, oldPieceY + dy);
        state.grid[oldCellPos.y][oldCellPos.x] = null;
      }
    }
    // Set new 2×2 area (with wrapping)
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const newCellPos = normalizeCoords(state, movingPiece.x + dx, movingPiece.y + dy);
        state.grid[newCellPos.y][newCellPos.x] = {
          isGap: false,
          isLarge: true,
          id: movingPiece.id,
          ox: dx,
          oy: dy
        };
      }
    }
    // Update gap positions in grid (gaps are already at correct wrapped positions)
    for (const {gap} of map) {
      state.grid[gap.y][gap.x] = { isGap: true, isLarge: false, id: gap.id };
    }
    
    if (!skipRender) state.renderAll();
    
    // Capture history AFTER successful move (not during shuffle or dry-run)
    if (!dryRun && !state.isShuffling && state.captureHistorySnapshot) {
      state.captureHistorySnapshot();
    }
    
    if (state.gameMode === 'challenge' && !state.isShuffling) {
      state.incrementMoveCount();
      if (state.checkWinCondition()) {
        state.handleWin();
      }
    }
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