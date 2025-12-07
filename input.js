/**
 * input.js - Input handling (mouse, touch, keyboard)
 * 
 * This module contains all event handlers for user input including
 * keyboard controls, mouse controls (click, swipe, drag), and touch controls.
 */

import { normalizeCoords, tryMove } from './moves.js';

// ============================================================================
// MOUSE CONTROL STATE
// ============================================================================

let mouseDownPos = null;
let mouseDownTime = null;
let mouseDownGridPos = null;
let mouseDownSelectedGapIdx = null; // Track which gap was selected when mousedown occurred
let swipePreviewActive = false;
let swipePreviewTile = null;
let swipePreviewOffset = { x: 0, y: 0 };
let lastDragGapPos = null; // Track last gap position we dragged over to prevent repeated moves
let lastDragCell = null; // Track the last cell position during drag to prevent flickering
let dragControlUsed = false; // Flag to disable swipe controls after drag control is used
let draggedPieceId = null; // Track ID of piece being dragged (for piece drag mode)

// ============================================================================
// SHARED UTILITY FUNCTIONS FOR MOUSE CONTROLS
// ============================================================================

/**
 * Get all cells that should be checked for a tile (1 for small, 4 for big)
 * Normalizes coordinates for wrapped pieces
 * @param {Object} state - Game state object
 * @param {Object} tile - The tile object
 * @param {Object} clickedCell - The grid cell data
 * @param {number} gridX - Grid X coordinate (for small pieces)
 * @param {number} gridY - Grid Y coordinate (for small pieces)
 * @returns {Array} Array of {x, y} cell coordinates
 */
function getCellsForTile(state, tile, clickedCell, gridX, gridY) {
  if (clickedCell.isLarge) {
    // For big pieces/gaps, normalize all 4 cell coordinates
    const c1 = normalizeCoords(state, tile.x, tile.y);
    const c2 = normalizeCoords(state, tile.x + 1, tile.y);
    const c3 = normalizeCoords(state, tile.x, tile.y + 1);
    const c4 = normalizeCoords(state, tile.x + 1, tile.y + 1);
    return [
      {x: c1.x, y: c1.y},
      {x: c2.x, y: c2.y},
      {x: c3.x, y: c3.y},
      {x: c4.x, y: c4.y}
    ];
  }
  return [{x: gridX, y: gridY}];
}

/**
 * Find which gaps are adjacent to given cells and in which direction
 * Handles wrapping by checking both direct adjacency and wrapped adjacency
 * @param {Object} state - Game state object
 * @param {Array} cells - Array of {x, y} cell coordinates to check
 * @returns {Array} Array of {gap, dx, dy} for each adjacent gap
 */
function findAdjacentGaps(state, cells) {
  const gapPieces = state.pieces.filter(p => p.isGap);
  const result = [];
  
  for (const gap of gapPieces) {
    // For large gaps, get all 4 cells
    let gapCells;
    if (gap.isLarge) {
      const c1 = normalizeCoords(state, gap.x, gap.y);
      const c2 = normalizeCoords(state, gap.x + 1, gap.y);
      const c3 = normalizeCoords(state, gap.x, gap.y + 1);
      const c4 = normalizeCoords(state, gap.x + 1, gap.y + 1);
      gapCells = [
        {x: c1.x, y: c1.y},
        {x: c2.x, y: c2.y},
        {x: c3.x, y: c3.y},
        {x: c4.x, y: c4.y}
      ];
    } else {
      gapCells = [{x: gap.x, y: gap.y}];
    }
    
    for (const cell of cells) {
      let found = false;
      
      for (const gapCell of gapCells) {
        const dx = gapCell.x - cell.x;
        const dy = gapCell.y - cell.y;
        
        // Check direct adjacency
        if ((Math.abs(dx) === 1 && dy === 0) || (dx === 0 && Math.abs(dy) === 1)) {
          result.push({ gap, dx, dy });
          found = true;
          break;
        }
        
        // Check wrapped adjacency if wrapping is enabled
        if (state.wrapHorizontal) {
          // Check if gap wraps around horizontally
          if (cell.x === state.boardConfig.width - 1 && gapCell.x === 0 && dy === 0) {
            result.push({ gap, dx: 1, dy: 0 });
            found = true;
            break;
          }
          if (cell.x === 0 && gapCell.x === state.boardConfig.width - 1 && dy === 0) {
            result.push({ gap, dx: -1, dy: 0 });
            found = true;
            break;
          }
        }
        
        if (state.wrapVertical) {
          // Check if gap wraps around vertically
          if (cell.y === state.boardConfig.height - 1 && gapCell.y === 0 && dx === 0) {
            result.push({ gap, dx: 0, dy: 1 });
            found = true;
            break;
          }
          if (cell.y === 0 && gapCell.y === state.boardConfig.height - 1 && dx === 0) {
            result.push({ gap, dx: 0, dy: -1 });
            found = true;
            break;
          }
        }
      }
      
      if (found) break; // Only add each gap once
    }
  }
  
  return result;
}

/**
 * Convert direction vector to tryMove() direction string
 * Note: tryMove() direction is INVERTED (specifies where to look, not where to move)
 * @param {number} dx - Delta X
 * @param {number} dy - Delta Y
 * @param {boolean} invert - Whether to invert the direction (for gap drag control)
 * @returns {string|null} Direction string ('up'/'down'/'left'/'right') or null
 */
function vectorToDirection(dx, dy, invert = false) {
  if (invert) {
    // For gap drag: reverse the direction (pulling piece toward gap)
    if (dx === 1 && dy === 0) return 'left';
    if (dx === -1 && dy === 0) return 'right';
    if (dx === 0 && dy === 1) return 'up';
    if (dx === 0 && dy === -1) return 'down';
  } else {
    // For piece drag: normal direction (gap is in this direction from piece)
    if (dx === 1 && dy === 0) return 'right';
    if (dx === -1 && dy === 0) return 'left';
    if (dx === 0 && dy === 1) return 'down';
    if (dx === 0 && dy === -1) return 'up';
  }
  return null;
}

/**
 * Check if mouse position is in valid drag region (75% of cell, excluding edge closest to source)
 * @param {number} mouseX - Mouse X position within cell (0 to tilePx)
 * @param {number} mouseY - Mouse Y position within cell (0 to tilePx)
 * @param {number} sourceDx - Direction from source to target (X)
 * @param {number} sourceDy - Direction from source to target (Y)
 * @param {number} tilePx - Tile size in pixels
 * @returns {boolean} True if in valid region
 */
function isInValidDragRegion(mouseX, mouseY, sourceDx, sourceDy, tilePx) {
  const quarterTile = tilePx / 4;
  
  // Exclude the edge closest to the source (1/4 of the cell)
  if (sourceDx === 1 && mouseX < quarterTile) return false;        // Source is left, exclude left edge
  if (sourceDx === -1 && mouseX >= 3 * quarterTile) return false;  // Source is right, exclude right edge
  if (sourceDy === 1 && mouseY < quarterTile) return false;        // Source is above, exclude top edge
  if (sourceDy === -1 && mouseY >= 3 * quarterTile) return false;  // Source is below, exclude bottom edge
  
  return true;
}

/**
 * Detect swipe direction from mouse movement
 * @param {Object} startPos - {x, y} starting position
 * @param {Object} currentPos - {x, y} current position
 * @param {number} threshold - Minimum distance for swipe detection
 * @returns {string|null} Direction string or null if below threshold
 */
function detectSwipeDirection(startPos, currentPos, threshold) {
  const dx = currentPos.x - startPos.x;
  const dy = currentPos.y - startPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance < threshold) return null;
  
  // Determine direction based on dominant axis
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  } else {
    return dy > 0 ? 'down' : 'up';
  }
}

/**
 * Check if a gap is in the given swipe direction relative to cells
 * Handles wrapping by checking both direct adjacency and wrapped adjacency
 * @param {Object} state - Game state object
 * @param {Array} cells - Array of {x, y} cell coordinates
 * @param {Object} gap - Gap object with x, y
 * @param {string} swipeDir - Swipe direction ('up'/'down'/'left'/'right')
 * @returns {boolean} True if gap is in swipe direction
 */
function isGapInSwipeDirection(state, cells, gap, swipeDir) {
  // For large gaps, we need to check all 4 cells of the gap
  let gapCells;
  if (gap.isLarge) {
    const c1 = normalizeCoords(state, gap.x, gap.y);
    const c2 = normalizeCoords(state, gap.x + 1, gap.y);
    const c3 = normalizeCoords(state, gap.x, gap.y + 1);
    const c4 = normalizeCoords(state, gap.x + 1, gap.y + 1);
    gapCells = [
      {x: c1.x, y: c1.y},
      {x: c2.x, y: c2.y},
      {x: c3.x, y: c3.y},
      {x: c4.x, y: c4.y}
    ];
  } else {
    gapCells = [{x: gap.x, y: gap.y}];
  }
  
  for (const cell of cells) {
    for (const gapCell of gapCells) {
      let dx = gapCell.x - cell.x;
      let dy = gapCell.y - cell.y;
      
      // Check direct adjacency first
      if (swipeDir === 'right' && dx === 1 && dy === 0) return true;
      if (swipeDir === 'left' && dx === -1 && dy === 0) return true;
      if (swipeDir === 'down' && dx === 0 && dy === 1) return true;
      if (swipeDir === 'up' && dx === 0 && dy === -1) return true;
      
      // Check wrapped adjacency if wrapping is enabled
      if (state.wrapHorizontal) {
        // Check if gap wraps around horizontally
        if (swipeDir === 'right' && cell.x === state.boardConfig.width - 1 && gapCell.x === 0 && dy === 0) return true;
        if (swipeDir === 'left' && cell.x === 0 && gapCell.x === state.boardConfig.width - 1 && dy === 0) return true;
      }
      
      if (state.wrapVertical) {
        // Check if gap wraps around vertically
        if (swipeDir === 'down' && cell.y === state.boardConfig.height - 1 && gapCell.y === 0 && dx === 0) return true;
        if (swipeDir === 'up' && cell.y === 0 && gapCell.y === state.boardConfig.height - 1 && dx === 0) return true;
      }
    }
  }
  return false;
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Helper function to get position from either mouse or touch event
 * @param {Event} e - Mouse or touch event
 * @returns {Object} {x, y} position
 */
function getEventPosition(e) {
  if (e.touches && e.touches.length > 0) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  } else if (e.changedTouches && e.changedTouches.length > 0) {
    return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
  } else {
    return { x: e.clientX, y: e.clientY };
  }
}

/**
 * Handle pointer start (mousedown/touchstart)
 * @param {Object} state - Game state object
 * @param {Event} e - Event object
 */
function handlePointerStart(state, e) {
  // Prevent pointer start if challenge is solved
  if (state.gameMode === 'challenge' && state.challengeSolved) {
    return;
  }

  // Get pointer position
  const pos = getEventPosition(e);
  
  // Get mouse position relative to board
  const rect = state.boardEl.getBoundingClientRect();
  const clickX = pos.x - rect.left;
  const clickY = pos.y - rect.top;
  
  // Convert to grid coordinates
  const gridX = Math.floor(clickX / state.tilePx);
  const gridY = Math.floor(clickY / state.tilePx);
  
  // Check bounds
  if (gridX < 0 || gridX >= state.boardConfig.width || gridY < 0 || gridY >= state.boardConfig.height) {
    return;
  }

  // Store pointer down position and time
  mouseDownPos = { x: pos.x, y: pos.y };
  mouseDownTime = Date.now();
  mouseDownGridPos = { x: gridX, y: gridY };
  
  // Store which gap was selected before this pointer down
  const selectedGap = state.pieces.find(p => p.isGap && p.selected);
  mouseDownSelectedGapIdx = selectedGap ? state.pieces.filter(p => p.isGap).indexOf(selectedGap) : 0;
  
  lastDragGapPos = null; // Reset drag tracking for new drag session
  lastDragCell = null; // Reset cell tracking for new drag session
  dragControlUsed = false; // Reset drag control flag for new drag session
  
  // Check if we clicked on a gap and select it (handles both small and large gaps)
  let clickedGap = state.pieces.find(p => p.isGap && p.x === gridX && p.y === gridY);
  
  // If not found at exact position, check if we clicked on any cell of a large gap
  if (!clickedGap) {
    const cell = state.grid[gridY]?.[gridX];
    if (cell?.isGap && cell?.isLarge) {
      clickedGap = state.pieceById.get(cell.id);
    }
  }
  
  if (clickedGap) {
    state.pieces.forEach(p => p.selected = false);
    clickedGap.selected = true;
    state.renderAll();
    draggedPieceId = null; // Not dragging a piece
  } else {
    // Store the piece ID if we clicked on a piece
    const cell = state.grid[gridY]?.[gridX];
    if (cell && !cell.isGap) {
      draggedPieceId = cell.id;
    } else {
      draggedPieceId = null;
    }
  }
}

/**
 * Unified pointer move handler for both mouse and touch events
 * @param {Object} state - Game state object
 * @param {Event} e - Event object
 */
function handlePointerMove(state, e) {
  // Only process if we have a valid mousedown
  if (!mouseDownPos || !mouseDownTime || !mouseDownGridPos) {
    return;
  }

  // Prevent move if challenge is solved
  if (state.gameMode === 'challenge' && state.challengeSolved) {
    return;
  }

  // Get current pointer position
  const pos = getEventPosition(e);
  
  // Get position relative to board
  const rect = state.boardEl.getBoundingClientRect();
  const currentX = pos.x - rect.left;
  const currentY = pos.y - rect.top;
  
  // Convert to grid coordinates
  const currentGridX = Math.floor(currentX / state.tilePx);
  const currentGridY = Math.floor(currentY / state.tilePx);
  
  // Track the cell position where the mouse is currently over
  const currentCellKey = `${currentGridX},${currentGridY}`;
  
  // Mouse moved to a different cell, so remove safety for instantly reverting the previous move
  if (lastDragCell !== currentCellKey) {
    lastDragCell = null;
  }
  
  // Check if we started on a gap
  const startCell = state.grid[mouseDownGridPos.y][mouseDownGridPos.x];
  const startedOnGap = startCell?.isGap;
  
  if (startedOnGap) {
    // GAP DRAG CONTROL: Started on a gap, check if we're over a piece or the other gap
    if (currentGridX >= 0 && currentGridX < state.boardConfig.width && currentGridY >= 0 && currentGridY < state.boardConfig.height) {
      const currentCell = state.grid[currentGridY][currentGridX];
      
      // Check if we're over the other gap
      let startGap = state.pieces.find(p => p.isGap && p.x === mouseDownGridPos.x && p.y === mouseDownGridPos.y);
      
      // If not found at exact position, check if we started on any cell of a large gap
      if (!startGap) {
        const startCell = state.grid[mouseDownGridPos.y]?.[mouseDownGridPos.x];
        if (startCell?.isGap && startCell?.isLarge) {
          startGap = state.pieceById.get(startCell.id);
        }
      }
      
      if (!startGap) return; // Safety check
      
      const gapPieces = state.pieces.filter(p => p.isGap);
      const otherGap = gapPieces.find(g => g !== startGap);
      
      // Check if current cell is a gap (small or large)
      const isCurrentCellGap = currentCell?.isGap;
      let currentGap = null;
      if (isCurrentCellGap) {
        currentGap = state.pieceById.get(currentCell.id);
      }
      
      if (isCurrentCellGap && otherGap && currentGap === otherGap) {
        // We're over the other gap - check if it's adjacent
        const dx = currentGridX - mouseDownGridPos.x;
        const dy = currentGridY - mouseDownGridPos.y;
        
        if ((Math.abs(dx) === 1 && dy === 0) || (dx === 0 && Math.abs(dy) === 1)) {
          // Other gap is adjacent - swap them
          const gapPosKey = `${currentGridX},${currentGridY}`;
          
          if (lastDragGapPos !== gapPosKey) {
            const swapDir = vectorToDirection(dx, dy, true); // Invert for gap swap
            
            if (swapDir) {
              const moveSuccess = tryMove(state, swapDir);
              
              if (moveSuccess) {
                dragControlUsed = true;
                lastDragGapPos = gapPosKey;
                // Clear any swipe preview
                if (swipePreviewActive) {
                  // Clear all piece previews (handles both single and multiple pieces)
                  state.pieces.forEach(p => {
                    if (p.el.style.transform) {
                      p.el.style.transform = '';
                    }
                  });
                  swipePreviewActive = false;
                  swipePreviewTile = null;
                  swipePreviewOffset = { x: 0, y: 0 };
                }
                // Update mouseDownGridPos to the new gap position after the swap
                const selectedGap = state.pieces.find(p => p.isGap && p.selected);
                if (selectedGap) {
                  mouseDownGridPos = { x: selectedGap.x, y: selectedGap.y };
                }
              }
            }
          }
        }
      } else if (currentCell !== null && !currentCell.isGap) {
        // We're over a piece - check if it's in the valid drag region
        const cellX = currentX - (currentGridX * state.tilePx);
        const cellY = currentY - (currentGridY * state.tilePx);
        
        const piece = state.pieceById.get(currentCell.id);
        if (piece) {
          // Get cells to check for adjacency
          const cellsToCheck = getCellsForTile(state, piece, currentCell, currentGridX, currentGridY);
          
          // Get all cells of the gap (1 for small, 4 for large)
          let gapCells;
          if (startGap.isLarge) {
            const c1 = normalizeCoords(state, startGap.x, startGap.y);
            const c2 = normalizeCoords(state, startGap.x + 1, startGap.y);
            const c3 = normalizeCoords(state, startGap.x, startGap.y + 1);
            const c4 = normalizeCoords(state, startGap.x + 1, startGap.y + 1);
            gapCells = [
              {x: c1.x, y: c1.y},
              {x: c2.x, y: c2.y},
              {x: c3.x, y: c3.y},
              {x: c4.x, y: c4.y}
            ];
          } else {
            gapCells = [{x: mouseDownGridPos.x, y: mouseDownGridPos.y}];
          }
          
          // Find if piece is adjacent to ANY cell of the gap and check valid drag region
          let isAdjacent = false;
          let adjacentDir = null;
          
          for (const cell of cellsToCheck) {
            for (const gapCell of gapCells) {
              const dx = cell.x - gapCell.x;
              const dy = cell.y - gapCell.y;
              
              if ((Math.abs(dx) === 1 && dy === 0) || (dx === 0 && Math.abs(dy) === 1)) {
                isAdjacent = true;
                // Check if mouse is in valid drag region
                if (isInValidDragRegion(cellX, cellY, dx, dy, state.tilePx)) {
                  adjacentDir = vectorToDirection(dx, dy, true); // Invert for gap drag
                }
                break;
              }
            }
            if (isAdjacent && adjacentDir) break;
          }
          
          if (isAdjacent && adjacentDir) {
            const piecePosKey = `${currentGridX},${currentGridY}`;
            
            // Only trigger move if this is a different piece than the last one we dragged over
            if (lastDragGapPos !== piecePosKey) {
              const moveSuccess = tryMove(state, adjacentDir);
              
              if (moveSuccess) {
                dragControlUsed = true;
                lastDragGapPos = piecePosKey;
                // Clear any swipe preview
                if (swipePreviewActive) {
                  // Clear all piece previews (handles both single and multiple pieces)
                  state.pieces.forEach(p => {
                    if (p.el.style.transform) {
                      p.el.style.transform = '';
                    }
                  });
                  swipePreviewActive = false;
                  swipePreviewTile = null;
                  swipePreviewOffset = { x: 0, y: 0 };
                }
                // Update mouseDownGridPos to the new gap position after the move
                const selectedGap = state.pieces.find(p => p.isGap && p.selected);
                if (selectedGap) {
                  mouseDownGridPos = { x: selectedGap.x, y: selectedGap.y };
                }
              }
            }
          }
        }
      }
    }
  } else {
    // PIECE DRAG CONTROL: Started on a piece
    if (currentGridX >= 0 && currentGridX < state.boardConfig.width && currentGridY >= 0 && currentGridY < state.boardConfig.height) {
      const currentCell = state.grid[currentGridY][currentGridX];
      
      if (currentCell?.isGap) {
        // We're over a gap - check if it's in the valid drag region
        const cellX = currentX - (currentGridX * state.tilePx);
        const cellY = currentY - (currentGridY * state.tilePx);
        
        // Get the piece we're dragging by ID (stored at pointer start)
        const startPiece = draggedPieceId ? state.pieceById.get(draggedPieceId) : null;
        
        if (startPiece) {
          // Get cells to check for adjacency
          // For small pieces, use mouseDownGridPos directly (like gap drag does for small gaps)
          // For large pieces, get all 4 cells based on piece's current position
          let cellsToCheck;
          if (startPiece.isLarge) {
            const c1 = normalizeCoords(state, startPiece.x, startPiece.y);
            const c2 = normalizeCoords(state, startPiece.x + 1, startPiece.y);
            const c3 = normalizeCoords(state, startPiece.x, startPiece.y + 1);
            const c4 = normalizeCoords(state, startPiece.x + 1, startPiece.y + 1);
            cellsToCheck = [
              {x: c1.x, y: c1.y},
              {x: c2.x, y: c2.y},
              {x: c3.x, y: c3.y},
              {x: c4.x, y: c4.y}
            ];
          } else {
            // For small pieces, use mouseDownGridPos (which tracks the piece's position)
            cellsToCheck = [{x: mouseDownGridPos.x, y: mouseDownGridPos.y}];
          }
          
          // Find if gap is adjacent to piece and check valid drag region
          let isAdjacent = false;
          let adjacentDir = null;
          
          for (const cell of cellsToCheck) {
            const dx = currentGridX - cell.x;
            const dy = currentGridY - cell.y;
            
            if ((Math.abs(dx) === 1 && dy === 0) || (dx === 0 && Math.abs(dy) === 1)) {
              isAdjacent = true;
              // Check if mouse is in valid drag region (exclude edge closest to piece)
              if (isInValidDragRegion(cellX, cellY, dx, dy, state.tilePx)) {
                adjacentDir = vectorToDirection(dx, dy, false); // Normal direction for piece drag
              }
              break;
            }
          }
          
          if (isAdjacent && adjacentDir) {
            // Track the piece's current position (before potential move)
            // This is analogous to gap drag tracking the piece position
            const piecePosKey = `${startPiece.x},${startPiece.y}`;
            
            // Only trigger move if we're over a different cell than the last move
            // This prevents flickering when dragging a small piece into a large gap
            if (lastDragGapPos !== piecePosKey && lastDragCell !== currentCellKey) {
              // Get the gap at current position (handles both small and large gaps)
              const gap = state.pieceById.get(currentCell.id);
              if (gap) {
                // Temporarily select this gap for the move, then restore original selection
                // This prevents selection interference during continuous dragging
                const originalSelectedGap = state.pieces.find(p => p.isGap && p.selected);
                state.pieces.forEach(p => p.selected = false);
                gap.selected = true;
                const moveSuccess = tryMove(state, adjacentDir);
                
                // Restore original gap selection after move
                if (originalSelectedGap && moveSuccess) {
                  state.pieces.forEach(p => p.selected = false);
                  originalSelectedGap.selected = true;
                }
                
                if (moveSuccess) {
                  dragControlUsed = true;
                  // Track piece position after move
                  lastDragGapPos = piecePosKey;
                  // Store the current cell position to prevent repeated moves on the same cell
                  lastDragCell = currentCellKey;
                  if (swipePreviewActive) {
                    // Clear all piece previews (handles both single and multiple pieces)
                    state.pieces.forEach(p => {
                      if (p.el.style.transform) {
                        p.el.style.transform = '';
                      }
                    });
                    swipePreviewActive = false;
                    swipePreviewTile = null;
                    swipePreviewOffset = { x: 0, y: 0 };
                  }
                  // Update mouseDownGridPos to the piece's new position after the move
                  mouseDownGridPos = { x: startPiece.x, y: startPiece.y };
                }
              }
            }
          }
        }
      }
    }
  }

  // Only process swipe controls if drag control hasn't been used
  if (!dragControlUsed) {
    const SWIPE_THRESHOLD = 5;
    const swipeDir = detectSwipeDirection(mouseDownPos, pos, SWIPE_THRESHOLD);

    if (swipeDir) {
      const gridX = mouseDownGridPos.x;
      const gridY = mouseDownGridPos.y;
      const clickedCell = state.grid[gridY][gridX];

      if (!clickedCell || clickedCell.isGap) {
        // Swiping on a gap - check for valid move in swipe direction
        
        // Get the gap piece (handles both small and large gaps)
        let clickedGap = state.pieces.find(p => p.isGap && p.x === gridX && p.y === gridY);
        if (!clickedGap && clickedCell?.isGap && clickedCell?.isLarge) {
          clickedGap = state.pieceById.get(clickedCell.id);
        }
        
        if (!clickedGap) return;
        
        // Temporarily select this gap to check if move is valid
        const originalSelectedGap = state.pieces.find(p => p.isGap && p.selected);
        state.pieces.forEach(p => p.selected = false);
        clickedGap.selected = true;
        
        // Convert swipe direction to tryMove direction (inverted)
        const reverseDir = {
          'up': 'down',
          'down': 'up',
          'left': 'right',
          'right': 'left'
        };
        const tryMoveDir = reverseDir[swipeDir];
        
        // Check if move would be valid by examining what tryMove would do
        // We need to replicate the logic from tryMove to determine what piece would move
        let fromX = clickedGap.x, fromY = clickedGap.y;
        if (clickedGap.isLarge) {
          // Large gap: look beyond the 2x2 extent
          if (tryMoveDir === 'up') fromY = clickedGap.y + 2;
          if (tryMoveDir === 'down') fromY = clickedGap.y - 1;
          if (tryMoveDir === 'left') fromX = clickedGap.x + 2;
          if (tryMoveDir === 'right') fromX = clickedGap.x - 1;
        } else {
          // Small gap: normal offset
          if (tryMoveDir === 'up') fromY = clickedGap.y + 1;
          if (tryMoveDir === 'down') fromY = clickedGap.y - 1;
          if (tryMoveDir === 'left') fromX = clickedGap.x + 1;
          if (tryMoveDir === 'right') fromX = clickedGap.x - 1;
        }
        
        // Apply wrapping to source coordinates
        const wrappedFrom = normalizeCoords(state, fromX, fromY);
        fromX = wrappedFrom.x;
        fromY = wrappedFrom.y;
        
        // Check bounds
        let validMove = false;
        let targetPiece = null;
        
        if (state.wrapHorizontal || state.wrapVertical || (fromX >= 0 && fromX < state.boardConfig.width && fromY >= 0 && fromY < state.boardConfig.height)) {
          const sourceCell = state.grid[fromY]?.[fromX];
          if (sourceCell) {
            // Check if it's a valid move (piece or gap swap)
            if (sourceCell.isGap) {
              // Gap swap - check if same size
              const otherGap = state.pieceById.get(sourceCell.id);
              if (otherGap && clickedGap.isLarge === otherGap.isLarge) {
                validMove = true;
                // No preview for gap swaps
              }
            } else {
              // Piece move - get the piece
              targetPiece = state.pieceById.get(sourceCell.id);
              if (targetPiece) {
                validMove = true;
              }
            }
          }
        }
        
        // Restore original gap selection
        state.pieces.forEach(p => p.selected = false);
        if (originalSelectedGap) {
          originalSelectedGap.selected = true;
        }
        
        if (validMove && targetPiece) {
          // Show preview for piece(s) moving into gap
          // For large gaps moving into 2 small pieces, we need to preview BOTH pieces
          let piecesToPreview = [targetPiece];
          
          // Check if this is a large gap moving into 2 small pieces
          if (clickedGap.isLarge && !targetPiece.isLarge) {
            // We need to find the OTHER small piece that will move alongside targetPiece
            // The logic should match what tryMove does for large gaps moving into 2 small pieces
            
            // Calculate which 2 cells the large gap is looking at
            let destCells = [];
            if (tryMoveDir === 'left' || tryMoveDir === 'right') {
              // Horizontal: check for 2 vertically aligned cells
              if (tryMoveDir === 'right') {
                // dir='right' means look LEFT (at x-1)
                const cell1 = normalizeCoords(state, clickedGap.x - 1, clickedGap.y);
                const cell2 = normalizeCoords(state, clickedGap.x - 1, clickedGap.y + 1);
                destCells = [{x: cell1.x, y: cell1.y}, {x: cell2.x, y: cell2.y}];
              } else {
                // dir='left' means look RIGHT (at x+2)
                const cell1 = normalizeCoords(state, clickedGap.x + 2, clickedGap.y);
                const cell2 = normalizeCoords(state, clickedGap.x + 2, clickedGap.y + 1);
                destCells = [{x: cell1.x, y: cell1.y}, {x: cell2.x, y: cell2.y}];
              }
            } else if (tryMoveDir === 'up' || tryMoveDir === 'down') {
              // Vertical: check for 2 horizontally aligned cells
              if (tryMoveDir === 'down') {
                // dir='down' means look ABOVE (at y-1)
                const cell1 = normalizeCoords(state, clickedGap.x, clickedGap.y - 1);
                const cell2 = normalizeCoords(state, clickedGap.x + 1, clickedGap.y - 1);
                destCells = [{x: cell1.x, y: cell1.y}, {x: cell2.x, y: cell2.y}];
              } else {
                // dir='up' means look BELOW (at y+2)
                const cell1 = normalizeCoords(state, clickedGap.x, clickedGap.y + 2);
                const cell2 = normalizeCoords(state, clickedGap.x + 1, clickedGap.y + 2);
                destCells = [{x: cell1.x, y: cell1.y}, {x: cell2.x, y: cell2.y}];
              }
            }
            
            // Get both pieces at the destination cells
            if (destCells.length === 2) {
              const dest1Cell = state.grid[destCells[0].y]?.[destCells[0].x];
              const dest2Cell = state.grid[destCells[1].y]?.[destCells[1].x];
              
              if (dest1Cell && dest2Cell && !dest1Cell.isLarge && !dest2Cell.isLarge) {
                const piece1 = state.pieceById.get(dest1Cell.id);
                const piece2 = state.pieceById.get(dest2Cell.id);
                
                // Add both pieces to preview (targetPiece should be one of them)
                if (piece1 && piece2) {
                  piecesToPreview = [piece1, piece2];
                }
              }
            }
          }
          
          // Clear any previous previews that are not in the current preview list
          if (swipePreviewActive) {
            state.pieces.forEach(p => {
              if (p.el.style.transform && !piecesToPreview.includes(p)) {
                p.el.style.transform = '';
              }
            });
          }
          
          const previewOffset = 15;
          let offsetX = 0, offsetY = 0;
          
          // Piece moves opposite to swipe direction
          if (swipeDir === 'right') offsetX = -previewOffset;
          if (swipeDir === 'left') offsetX = previewOffset;
          if (swipeDir === 'down') offsetY = -previewOffset;
          if (swipeDir === 'up') offsetY = previewOffset;
          
          // Apply preview to all pieces
          for (const piece of piecesToPreview) {
            piece.el.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
          }
          
          swipePreviewActive = true;
          swipePreviewTile = targetPiece; // Keep reference to first piece for compatibility
          swipePreviewOffset = { x: offsetX, y: offsetY };
        } else {
          // Clear preview if no valid target or gap swap
          if (swipePreviewActive) {
            // Clear all piece previews (handles both single and multiple pieces)
            state.pieces.forEach(p => {
              if (p.el.style.transform) {
                p.el.style.transform = '';
              }
            });
            swipePreviewActive = false;
            swipePreviewTile = null;
            swipePreviewOffset = { x: 0, y: 0 };
          }
        }
        return;
      }

      // Swiping on a piece
      const piece = state.pieceById.get(clickedCell.id);
      if (!piece) return;

      const cellsToCheck = getCellsForTile(state, piece, clickedCell, gridX, gridY);
      
      // Check if move would be valid
      let validSwipe = false;
      
      if (!piece.isLarge) {
        // For small pieces, just check if any gap is in swipe direction
        const gapPieces = state.pieces.filter(p => p.isGap);
        validSwipe = gapPieces.some(gap => isGapInSwipeDirection(state, cellsToCheck, gap, swipeDir));
      } else {
        // For big pieces, need to verify destination is valid (2 small gaps or 1 large gap)
        // Calculate destination cells based on swipe direction
        let dx = 0, dy = 0;
        if (swipeDir === 'right') dx = 1;
        else if (swipeDir === 'left') dx = -1;
        else if (swipeDir === 'down') dy = 1;
        else if (swipeDir === 'up') dy = -1;
        
        // Use helper function to calculate destination cells
        const result = state.calculateLargePieceDestination(piece, dx, dy);
        const destCells = result ? result.destCells : [];
        
        // Check if destination is valid (2 small gaps OR 1 large gap)
        if (destCells.length === 2) {
          // Check for large gap
          const destCell = state.grid[destCells[0].y]?.[destCells[0].x];
          if (destCell?.isGap && destCell?.isLarge) {
            const largeGap = state.pieceById.get(destCell.id);
            const allSameGap = destCells.every(d => {
              const cell = state.grid[d.y]?.[d.x];
              return cell?.isGap && cell?.isLarge && cell.id === largeGap.id;
            });
            validSwipe = allSameGap;
          } else {
            // Check for 2 small gaps
            const destAreSmallGaps = destCells.every(d => {
              const cell = state.grid[d.y]?.[d.x];
              return cell?.isGap && !cell?.isLarge;
            });
            validSwipe = destAreSmallGaps;
          }
        }
      }

      if (validSwipe) {
        const previewOffset = 15;
        let offsetX = 0, offsetY = 0;

        if (swipeDir === 'right') offsetX = previewOffset;
        if (swipeDir === 'left') offsetX = -previewOffset;
        if (swipeDir === 'down') offsetY = previewOffset;
        if (swipeDir === 'up') offsetY = -previewOffset;

        if (!swipePreviewActive || swipePreviewTile !== piece) {
          swipePreviewActive = true;
          swipePreviewTile = piece;
        }

        swipePreviewOffset = { x: offsetX, y: offsetY };
        piece.el.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
      } else {
        // Clear preview if swipe is invalid
        if (swipePreviewActive) {
          // Clear all piece previews (handles both single and multiple pieces)
          state.pieces.forEach(p => {
            if (p.el.style.transform) {
              p.el.style.transform = '';
            }
          });
          swipePreviewActive = false;
          swipePreviewTile = null;
          swipePreviewOffset = { x: 0, y: 0 };
        }
      }
    } else {
      // Below threshold, clear preview
      if (swipePreviewActive) {
        // Clear all piece previews (handles both single and multiple pieces)
        state.pieces.forEach(p => {
          if (p.el.style.transform) {
            p.el.style.transform = '';
          }
        });
        swipePreviewActive = false;
        swipePreviewTile = null;
        swipePreviewOffset = { x: 0, y: 0 };
      }
    }
  }
}

/**
 * Unified pointer end handler for both mouse and touch events
 * @param {Object} state - Game state object
 * @param {Event} e - Event object
 */
function handlePointerEnd(state, e) {
  // Prevent pointer end if challenge is solved
  if (state.gameMode === 'challenge' && state.challengeSolved) {
    mouseDownPos = null;
    mouseDownTime = null;
    mouseDownGridPos = null;
    mouseDownSelectedGapIdx = null;
    lastDragGapPos = null;
    lastDragCell = null;
    dragControlUsed = false;
    draggedPieceId = null;
    return;
  }

  // Check if we have a valid pointer down
  if (!mouseDownPos || !mouseDownTime || !mouseDownGridPos) {
    return;
  }

  // Clear swipe preview
  if (swipePreviewActive) {
    // Clear all piece previews (handles both single and multiple pieces)
    state.pieces.forEach(p => {
      if (p.el.style.transform) {
        p.el.style.transform = '';
      }
    });
    swipePreviewActive = false;
    swipePreviewTile = null;
    swipePreviewOffset = { x: 0, y: 0 };
  }

  // If drag control was used, skip all click/swipe logic
  if (dragControlUsed) {
    // Reset tracking
    mouseDownPos = null;
    mouseDownTime = null;
    mouseDownGridPos = null;
    mouseDownSelectedGapIdx = null;
    lastDragGapPos = null;
    lastDragCell = null;
    dragControlUsed = false;
    return;
  }

  // Get pointer position
  const pos = getEventPosition(e);
  
  // Check if mouse moved during the click
  const CLICK_MOVEMENT_THRESHOLD = 1.5; // pixels
  const dx = pos.x - mouseDownPos.x;
  const dy = pos.y - mouseDownPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const mouseMoved = distance >= CLICK_MOVEMENT_THRESHOLD;
  
  // Only process swipe/click logic if drag control wasn't used
  const SWIPE_THRESHOLD = 5;
  const swipeDir = detectSwipeDirection(mouseDownPos, pos, SWIPE_THRESHOLD);

  // Use the original grid position from mousedown for determining the clicked cell
  const gridX = mouseDownGridPos.x;
  const gridY = mouseDownGridPos.y;

  // Check if clicked on a gap (handles both small and large gaps)
  let clickedGap = state.pieces.find(p => p.isGap && p.x === gridX && p.y === gridY);
  
  // If not found at exact position, check if we clicked on any cell of a large gap
  if (!clickedGap) {
    const cell = state.grid[gridY]?.[gridX];
    if (cell?.isGap && cell?.isLarge) {
      clickedGap = state.pieceById.get(cell.id);
    }
  }
  
  const gapPieces = state.pieces.filter(p => p.isGap);
  const clickedGapIdx = clickedGap ? gapPieces.indexOf(clickedGap) : -1;
  
  // Store whether this gap was already selected BEFORE mousedown changed it
  const wasAlreadySelected = (mouseDownSelectedGapIdx === clickedGapIdx);
  
  // Reset tracking
  mouseDownPos = null;
  mouseDownTime = null;
  mouseDownGridPos = null;
  mouseDownSelectedGapIdx = null;
  lastDragGapPos = null;
  lastDragCell = null;
  dragControlUsed = false;
  draggedPieceId = null;

  if (clickedGap) {
    // Clicked on a gap
    
    if (swipeDir) {
      // Swipe detected - handle swipe behavior
      state.pieces.forEach(p => p.selected = false);
      clickedGap.selected = true;
      
      // Convert swipe direction to tryMove direction (inverted)
      const reverseDir = {
        'up': 'down',
        'down': 'up',
        'left': 'right',
        'right': 'left'
      };
      const tryMoveDir = reverseDir[swipeDir];
      
      // Check if move would be valid by examining what tryMove would do
      // We need to replicate the logic from tryMove to determine what piece would move
      let fromX = clickedGap.x, fromY = clickedGap.y;
      if (clickedGap.isLarge) {
        // Large gap: look beyond the 2x2 extent
        if (tryMoveDir === 'up') fromY = clickedGap.y + 2;
        if (tryMoveDir === 'down') fromY = clickedGap.y - 1;
        if (tryMoveDir === 'left') fromX = clickedGap.x + 2;
        if (tryMoveDir === 'right') fromX = clickedGap.x - 1;
      } else {
        // Small gap: normal offset
        if (tryMoveDir === 'up') fromY = clickedGap.y + 1;
        if (tryMoveDir === 'down') fromY = clickedGap.y - 1;
        if (tryMoveDir === 'left') fromX = clickedGap.x + 1;
        if (tryMoveDir === 'right') fromX = clickedGap.x - 1;
      }
      
      // Apply wrapping to source coordinates
      const wrappedFrom = normalizeCoords(state, fromX, fromY);
      fromX = wrappedFrom.x;
      fromY = wrappedFrom.y;
      
      // Check bounds and validate move
      if (state.wrapHorizontal || state.wrapVertical || (fromX >= 0 && fromX < state.boardConfig.width && fromY >= 0 && fromY < state.boardConfig.height)) {
        const sourceCell = state.grid[fromY]?.[fromX];
        if (sourceCell) {
          // Valid move found - execute it
          tryMove(state, tryMoveDir);
          return;
        }
      }
      
      // No valid move found - do nothing
      return;
    }
    
    // No swipe detected - handle click behavior only if mouse didn't move
    if (!mouseMoved && wasAlreadySelected) {
      // Gap was already selected - only swap if exactly one gap is adjacent (unambiguous)
      // Count how many gaps are adjacent to this gap (including wrapped adjacency)
      const adjacentGaps = gapPieces.filter(g => {
        if (g === clickedGap) return false; // Skip self
        const dx = g.x - gridX;
        const dy = g.y - gridY;
        
        // Check direct adjacency
        if ((Math.abs(dx) === 1 && dy === 0) || (dx === 0 && Math.abs(dy) === 1)) {
          return true;
        }
        
        // Check wrapped adjacency if wrapping is enabled
        if (state.wrapHorizontal) {
          // Check if gap wraps around horizontally
          if (gridX === state.boardConfig.width - 1 && g.x === 0 && dy === 0) return true; // Gap at left edge, clicked gap at right edge
          if (gridX === 0 && g.x === state.boardConfig.width - 1 && dy === 0) return true; // Gap at right edge, clicked gap at left edge
        }
        
        if (state.wrapVertical) {
          // Check if gap wraps around vertically
          if (gridY === state.boardConfig.height - 1 && g.y === 0 && dx === 0) return true; // Gap at top edge, clicked gap at bottom edge
          if (gridY === 0 && g.y === state.boardConfig.height - 1 && dx === 0) return true; // Gap at bottom edge, clicked gap at top edge
        }
        
        return false;
      });
      
      // Only swap if exactly one gap is adjacent (unambiguous)
      if (adjacentGaps.length === 1) {
        const otherGap = adjacentGaps[0];
        let dx = otherGap.x - gridX;
        let dy = otherGap.y - gridY;
        
        // Adjust dx/dy for wrapped adjacency
        if (state.wrapHorizontal) {
          if (gridX === state.boardConfig.width - 1 && otherGap.x === 0) dx = 1; // Wrapped right
          if (gridX === 0 && otherGap.x === state.boardConfig.width - 1) dx = -1; // Wrapped left
        }
        if (state.wrapVertical) {
          if (gridY === state.boardConfig.height - 1 && otherGap.y === 0) dy = 1; // Wrapped down
          if (gridY === 0 && otherGap.y === state.boardConfig.height - 1) dy = -1; // Wrapped up
        }
        
        // Determine swap direction (tryMove direction is OPPOSITE of where the gap is)
        let gapSwapDir = null;
        if (dx === 1 && dy === 0) gapSwapDir = 'left';   // other gap is right, so move from left
        if (dx === -1 && dy === 0) gapSwapDir = 'right';  // other gap is left, so move from right
        if (dx === 0 && dy === 1) gapSwapDir = 'up';      // other gap is down, so move from up
        if (dx === 0 && dy === -1) gapSwapDir = 'down';   // other gap is up, so move from down
        
        if (gapSwapDir) {
          tryMove(state, gapSwapDir);
        }
      }
      // If 0 or 2+ adjacent gaps, do nothing (ambiguous or impossible)
      return;
    } else if (!mouseMoved) {
      // Gap was not selected - just select it (only if mouse didn't move)
      state.pieces.forEach(p => p.selected = false);
      clickedGap.selected = true;
      state.renderAll();
      return;
    } else {
      // Mouse moved, don't process as click
      return;
    }
  }
  
  // Check what's at the clicked position
  const clickedCell = state.grid[gridY][gridX];
  if (!clickedCell) return; // No piece at clicked position
  
  const piece = state.pieceById.get(clickedCell.id);
  if (!piece) return;
  
  // Get cells to check for adjacency
  const cellsToCheck = getCellsForTile(state, piece, clickedCell, gridX, gridY);
  
  // Find which gaps are adjacent
  const adjacentGaps = findAdjacentGaps(state, cellsToCheck);
  
  // Determine which gap to use
  let targetGap = null;
  let targetDx = 0, targetDy = 0;

  if (swipeDir) {
    // Swipe detected - use gap in swipe direction
    for (const {gap, dx, dy} of adjacentGaps) {
      if (isGapInSwipeDirection(state, cellsToCheck, gap, swipeDir)) {
        targetGap = gap;
        targetDx = dx;
        targetDy = dy;
        break;
      }
    }
    if (!targetGap) return; // Swipe doesn't match any adjacent gap
  } else if (!mouseMoved) {
    // Click (mouse didn't move) - use adjacency logic
    if (adjacentGaps.length === 0) {
      return; // No adjacent gaps
    } else if (adjacentGaps.length === 1) {
      // Use the only adjacent gap
      targetGap = adjacentGaps[0].gap;
      targetDx = adjacentGaps[0].dx;
      targetDy = adjacentGaps[0].dy;
    } else {
      // Multiple gaps adjacent - use selected gap
      const selectedGap = state.pieces.find(p => p.isGap && p.selected);
      const selectedAdj = adjacentGaps.find(a => a.gap === selectedGap);
      if (selectedAdj) {
        targetGap = selectedAdj.gap;
        targetDx = selectedAdj.dx;
        targetDy = selectedAdj.dy;
      } else {
        // Selected gap not adjacent, use first adjacent gap
        targetGap = adjacentGaps[0].gap;
        targetDx = adjacentGaps[0].dx;
        targetDy = adjacentGaps[0].dy;
      }
    }
  } else {
    // Mouse moved, don't process as click
    return;
  }
  
  // Execute the move
  state.pieces.forEach(p => p.selected = false);
  targetGap.selected = true;
  const dir = vectorToDirection(targetDx, targetDy, false);
  if (dir) {
    tryMove(state, dir);
  }
}

/**
 * Handle keyboard input
 * @param {Object} state - Game state object
 * @param {Event} e - Keyboard event
 */
function handleKeyDown(state, e) {
  if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault();
    // Prevent gap switching if challenge is solved or timer is paused
    if (state.gameMode === 'challenge' && (state.challengeSolved || state.timerPaused)) {
      return;
    }
    // Toggle selection between gaps
    const gapPieces = state.pieces.filter(p => p.isGap);
    const currentlySelected = gapPieces.find(g => g.selected);
    if (currentlySelected && gapPieces.length > 1) {
      const currentIdx = gapPieces.indexOf(currentlySelected);
      const nextIdx = (currentIdx + 1) % gapPieces.length;
      gapPieces.forEach((g, i) => g.selected = (i === nextIdx));
      state.renderAll();
    }
    return;
  }
  const keyMap = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right'
  };
  const dir = keyMap[e.key];
  if (dir) {
    e.preventDefault();
    tryMove(state, dir);
  }
}

/**
 * Initialize all input event handlers
 * @param {Function} getStateFn - Function that returns current state object
 * @returns {Function} Cleanup function to remove event listeners
 */
export function initializeInputHandlers(getStateFn) {
  // Keyboard event handler - gets fresh state each time
  const keydownHandler = (e) => handleKeyDown(getStateFn(), e);
  const boardEl = getStateFn().boardEl;
  boardEl.addEventListener('keydown', keydownHandler);
  
  // Mouse event handlers - get fresh state each time
  const mousedownHandler = (e) => handlePointerStart(getStateFn(), e);
  const mousemoveHandler = (e) => handlePointerMove(getStateFn(), e);
  const mouseupHandler = (e) => handlePointerEnd(getStateFn(), e);
  
  boardEl.addEventListener('mousedown', mousedownHandler);
  boardEl.addEventListener('mousemove', mousemoveHandler);
  document.addEventListener('mouseup', mouseupHandler);
  
  // Touch event handlers - get fresh state each time
  const touchstartHandler = (e) => {
    // Prevent scrolling on touch devices
    e.preventDefault();
    handlePointerStart(getStateFn(), e.touches[0]);
  };
  
  const touchmoveHandler = (e) => {
    // Prevent scrolling during touch move
    if (mouseDownPos) {
      e.preventDefault();
    }
    handlePointerMove(getStateFn(), e);
  };
  
  const touchendHandler = (e) => {
    handlePointerEnd(getStateFn(), e);
  };
  
  const touchcancelHandler = (e) => {
    // Touch was cancelled (e.g., system gesture) - clean up state
    const state = getStateFn();
    if (swipePreviewActive) {
      // Clear all piece previews (handles both single and multiple pieces)
      state.pieces.forEach(p => {
        if (p.el.style.transform) {
          p.el.style.transform = '';
        }
      });
      swipePreviewActive = false;
      swipePreviewTile = null;
      swipePreviewOffset = { x: 0, y: 0 };
    }
    
    mouseDownPos = null;
    mouseDownTime = null;
    mouseDownGridPos = null;
    mouseDownSelectedGapIdx = null;
    lastDragGapPos = null;
    lastDragCell = null;
    dragControlUsed = false;
    draggedPieceId = null;
  };
  
  boardEl.addEventListener('touchstart', touchstartHandler, { passive: false });
  boardEl.addEventListener('touchmove', touchmoveHandler, { passive: false });
  document.addEventListener('touchend', touchendHandler);
  document.addEventListener('touchcancel', touchcancelHandler);
  
  // Return cleanup function
  return () => {
    boardEl.removeEventListener('keydown', keydownHandler);
    boardEl.removeEventListener('mousedown', mousedownHandler);
    boardEl.removeEventListener('mousemove', mousemoveHandler);
    document.removeEventListener('mouseup', mouseupHandler);
    boardEl.removeEventListener('touchstart', touchstartHandler);
    boardEl.removeEventListener('touchmove', touchmoveHandler);
    document.removeEventListener('touchend', touchendHandler);
    document.removeEventListener('touchcancel', touchcancelHandler);
  };
}