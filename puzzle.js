/**
 * puzzle.js - Core game logic and state management
 * 
 * Main entry point for the slide puzzle game. Manages game state,
 * board configuration, initialization, and UI event handlers.
 */

import { normalizeCoords, calculateLargePieceDestination } from './moves.js';
import { renderAll as renderAllImpl, updatePieceDOMForGapChanges as updatePieceDOMForGapChangesImpl } from './render.js';
import { shuffle as shuffleImpl, performGapRandomization as performGapRandomizationImpl } from './shuffle.js';
import { initializeInputHandlers } from './input.js';

// ============================================================================
// BOARD CONFIGURATIONS
// ============================================================================

// Board configuration object - defines the puzzle layout
// This structure allows for easy board switching in the future

// Image mode determines how background images are applied:
// - 'single': One image for entire board
// - 'horizontal': Two images side by side (left/right halves)
// - 'vertical': Two images stacked (top/bottom halves)

// Gap Configuration System:
//
// Each board has a `gapConfigurations` array containing one or more gap placement options.
// Each configuration has:
// - name: Descriptive name shown in UI (e.g., "2 small gaps (bottom right)")
// - gaps: Array of {x, y} positions where gaps should be placed
//
// Gap size is determined automatically:
// - If a gap position matches a large piece position, it becomes a large gap (2×2)
// - Otherwise, it becomes a small gap (1×1)
//
// During gameplay:
// - Gaps can move to different positions (gaps[i].x, gaps[i].y)
// - But they remember their identity (gaps[i].homeX, gaps[i].homeY)
// - The background crop is based on identity, not current position
// - Win condition: all gaps must return to their identity positions
//
// When randomizing gaps:
// - New cells become gaps and adopt NEW identities based on their position
// - Old gap cells become tiles with identities matching their position
// - This effectively "redefines" which cells are gap cells

const defaultBoard = {
  width: 8,           // Board width in tiles
  height: 8,          // Board height in tiles
  imageMode: 'single', // 'single', 'horizontal', or 'vertical'
  images: {
    primary: 'lightworld.png'  // Single image for entire board
  },
  largePieces: [      // Large piece top-left corners (array of {x, y})
    {x: 0, y: 0}, {x: 3, y: 0}, {x: 5, y: 0},
    {x: 0, y: 3}, {x: 3, y: 3}, {x: 6, y: 3},
    {x: 0, y: 6}, {x: 5, y: 6}
  ],
  wrapHorizontal: false,  // Enable horizontal wrapping
  wrapVertical: false,    // Enable vertical wrapping
  gapConfigurations: [    // Available gap configurations for this board
    {
      name: "2 small gaps (bottom right)",
      gaps: [
        {x: 7, y: 6},
        {x: 7, y: 7}
      ]
    },
    {
      name: "1 large gap (bottom left)",
      gaps: [
        {x: 0, y: 6}  // This position matches a large piece, so it becomes a large gap
      ]
    }
  ]
};

const horizontalBoard = {
  width: 16,          // Double width: 16 tiles
  height: 8,          // Same height: 8 tiles
  imageMode: 'horizontal',
  images: {
    primary: 'lightworld.png',   // Left half (x: 0-7)
    secondary: 'darkworld.png'   // Right half (x: 8-15)
  },
  largePieces: [      // Left half: same as default
    {x: 0, y: 0}, {x: 3, y: 0}, {x: 5, y: 0},
    {x: 0, y: 3}, {x: 3, y: 3}, {x: 6, y: 3},
    {x: 0, y: 6}, {x: 5, y: 6},
    // Right half: mirror of left half, shifted 8 tiles right
    {x: 8, y: 0}, {x: 11, y: 0}, {x: 13, y: 0},
    {x: 8, y: 3}, {x: 11, y: 3}, {x: 14, y: 3},
    {x: 8, y: 6}, {x: 13, y: 6}
  ],
  wrapHorizontal: false,  // Enable horizontal wrapping
  wrapVertical: false,    // Enable vertical wrapping
  gapConfigurations: [    // Available gap configurations for this board
    {
      name: "2 small gaps (bottom right)",
      gaps: [
        {x: 15, y: 6},
        {x: 15, y: 7}
      ]
    },
    {
      name: "1 large gap (bottom left)",
      gaps: [
        {x: 0, y: 6}  // This position matches a large piece, so it becomes a large gap
      ]
    }
  ]
};

const verticalBoard = {
  width: 8,           // Same width: 8 tiles
  height: 16,         // Double height: 16 tiles
  imageMode: 'vertical',
  images: {
    primary: 'lightworld.png',   // Top half (y: 0-7)
    secondary: 'darkworld.png'   // Bottom half (y: 8-15)
  },
  largePieces: [      // Top half: same as default
    {x: 0, y: 0}, {x: 3, y: 0}, {x: 5, y: 0},
    {x: 0, y: 3}, {x: 3, y: 3}, {x: 6, y: 3},
    {x: 0, y: 6}, {x: 5, y: 6},
    // Bottom half: mirror of top half, shifted 8 tiles down
    {x: 0, y: 8}, {x: 3, y: 8}, {x: 5, y: 8},
    {x: 0, y: 11}, {x: 3, y: 11}, {x: 6, y: 11},
    {x: 0, y: 14}, {x: 5, y: 14}
  ],
  wrapHorizontal: false,  // Enable horizontal wrapping
  wrapVertical: false,    // Enable vertical wrapping
  gapConfigurations: [    // Available gap configurations for this board
    {
      name: "2 small gaps (bottom right)",
      gaps: [
        {x: 7, y: 14},
        {x: 7, y: 15}
      ]
    },
    {
      name: "1 large gap (bottom left)",
      gaps: [
        {x: 0, y: 14}  // This position matches a large piece, so it becomes a large gap
      ]
    }
  ]
};

const smallPiecesBoard = {
  width: 8,           // Board width in tiles
  height: 8,          // Board height in tiles
  imageMode: 'single', // 'single', 'horizontal', or 'vertical'
  images: {
    primary: 'lightworld.png'  // Single image for entire board
  },
  largePieces: [],    // No large pieces - all tiles are 1×1
  wrapHorizontal: false,  // Enable horizontal wrapping
  wrapVertical: false,    // Enable vertical wrapping
  gapConfigurations: [    // Available gap configurations for this board
    {
      name: "1 small gap (bottom right)",
      gaps: [
        {x: 7, y: 7}  // Single small gap in bottom right corner
      ]
    }
  ]
};

// Board registry for easy lookup
const boardRegistry = {
  'default': defaultBoard,
  'horizontal': horizontalBoard,
  'vertical': verticalBoard,
  'classic': smallPiecesBoard
};

// ============================================================================
// DOM ELEMENT REFERENCES
// ============================================================================

const baseTilePx = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--tile')) || 64;
let tilePx = baseTilePx;
const boardEl = document.getElementById('board');
const resetBtn = document.getElementById('resetBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const challengeBtn = document.getElementById('challengeBtn');
const giveUpBtn = document.getElementById('giveUpBtn');
const settingsBtn = document.getElementById('settingsBtn');
const displayBtn = document.getElementById('displayBtn');
const settingsDialog = document.getElementById('settingsDialog');
const settingsBoardSelect = document.getElementById('settingsBoardSelect');
const settingsGapConfigSelect = document.getElementById('settingsGapConfigSelect');
const settingsCancelBtn = document.getElementById('settingsCancelBtn');
const resetGapsBtn = document.getElementById('resetGapsBtn');
const randomizeGapsBtn = document.getElementById('randomizeGapsBtn');
const wrapHorizontalCheckbox = document.getElementById('wrapHorizontalCheckbox');
const wrapVerticalCheckbox = document.getElementById('wrapVerticalCheckbox');
const displayDialog = document.getElementById('displayDialog');
const themeSelect = document.getElementById('themeSelect');
const autoScaleCheckbox = document.getElementById('autoScaleCheckbox');
const challengePositionSelect = document.getElementById('challengePositionSelect');
const boardSizeSlider = document.getElementById('boardSizeSlider');
const boardSizeValue = document.getElementById('boardSizeValue');
const displayCloseBtn = document.getElementById('displayCloseBtn');
const challengeDialog = document.getElementById('challengeDialog');
const challengeBoardSelect = document.getElementById('challengeBoardSelect');
const challengeGapConfigSelect = document.getElementById('challengeGapConfigSelect');
const randomizeGapsCheckbox = document.getElementById('randomizeGapsCheckbox');
const challengeWrapHorizontalCheckbox = document.getElementById('challengeWrapHorizontalCheckbox');
const challengeWrapVerticalCheckbox = document.getElementById('challengeWrapVerticalCheckbox');
const challengeStartBtn = document.getElementById('challengeStartBtn');
const challengeCancelBtn = document.getElementById('challengeCancelBtn');
const dailyChallengeBtn = document.getElementById('dailyChallengeBtn');
const seedInput = document.getElementById('seedInput');
const stepsInput = document.getElementById('stepsInput');
const challengeInfo = document.getElementById('challengeInfo');
const challengeSeedDisplay = document.getElementById('challengeSeedDisplay');
const challengeStepsDisplay = document.getElementById('challengeStepsDisplay');
const challengeMovesDisplay = document.getElementById('challengeMovesDisplay');
const congratsDialog = document.getElementById('congratsDialog');
const congratsMessage = document.getElementById('congratsMessage');
const congratsOkBtn = document.getElementById('congratsOkBtn');
const helpBtn = document.getElementById('helpBtn');
const helpDialog = document.getElementById('helpDialog');
const helpCloseBtn = document.getElementById('helpCloseBtn');
const challengeTimerDisplay = document.getElementById('challengeTimerDisplay');
const timerShowBtn = document.getElementById('timerShowBtn');
const timerToggleBtn = document.getElementById('timerToggleBtn');

// ============================================================================
// STATE VARIABLES
// ============================================================================

// Currently active board configuration
let boardConfig = defaultBoard;
let currentBoardSlug = 'default';
let selectedGapConfigIndex = 0; // Index into boardConfig.gapConfigurations

// State - Unified piece system
// All pieces (including gaps) stored in a single array
let grid; // 2D array: null=empty; or {isGap, isLarge, id, ox, oy}
let pieces = []; // Unified array: {id, isGap, isLarge, x, y, homeX, homeY, el, innerEl, selected}
let pieceById = new Map(); // Unified lookup map

// Game mode state
let gameMode = 'freeplay'; // 'freeplay' or 'challenge'
let challengeSeed = null;
let challengeSteps = null;
let challengeBoard = null; // Board slug for challenge
let challengeRandomizeGaps = false; // Flag to randomize gap positions during shuffle
let challengeMoveCount = 0;
let isShuffling = false; // Flag to prevent move counting during shuffle
let challengeSolved = false; // Flag to track if challenge is solved

// Wrapping state
let wrapHorizontal = false; // Current horizontal wrapping state
let wrapVertical = false;   // Current vertical wrapping state
let challengeWrapHorizontal = false; // Horizontal wrapping for challenge
let challengeWrapVertical = false;   // Vertical wrapping for challenge

// Timer state
let timerStartTime = null;
let timerElapsedTime = 0;
let timerInterval = null;
let timerPaused = false;
let timerHidden = false;

// Display settings state
let autoFitEnabled = false;
let boardSizeScale = 100; // Board size percentage (50-200%)
let challengeBoxPosition = 'auto'; // Challenge box position: 'auto', 'right', or 'above'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Helper function to determine which background image a tile should use
function getBackgroundImageForPosition(x, y) {
  if (boardConfig.imageMode === 'single') {
    return boardConfig.images.primary;
  } else if (boardConfig.imageMode === 'horizontal') {
    // Left half uses primary, right half uses secondary
    const halfWidth = boardConfig.width / 2;
    return x < halfWidth ? boardConfig.images.primary : boardConfig.images.secondary;
  } else if (boardConfig.imageMode === 'vertical') {
    // Top half uses primary, bottom half uses secondary
    const halfHeight = boardConfig.height / 2;
    return y < halfHeight ? boardConfig.images.primary : boardConfig.images.secondary;
  }
  return boardConfig.images.primary; // Fallback
}

// Helper function to get background size and position for a tile
function getBackgroundStyleForTile(homeX, homeY) {
  const image = getBackgroundImageForPosition(homeX, homeY);
  let bgSize, bgPosX, bgPosY;
  
  if (boardConfig.imageMode === 'single') {
    // Single image covers entire board
    bgSize = `calc(${boardConfig.width} * var(--tile)) calc(${boardConfig.height} * var(--tile))`;
    bgPosX = -homeX * tilePx;
    bgPosY = -homeY * tilePx;
  } else if (boardConfig.imageMode === 'horizontal') {
    // Each image covers half the board width, full height
    const halfWidth = boardConfig.width / 2;
    bgSize = `calc(${halfWidth} * var(--tile)) calc(${boardConfig.height} * var(--tile))`;
    // Adjust position based on which half the tile is in
    if (homeX < halfWidth) {
      bgPosX = -homeX * tilePx;
    } else {
      bgPosX = -(homeX - halfWidth) * tilePx;
    }
    bgPosY = -homeY * tilePx;
  } else if (boardConfig.imageMode === 'vertical') {
    // Each image covers full width, half the board height
    const halfHeight = boardConfig.height / 2;
    bgSize = `calc(${boardConfig.width} * var(--tile)) calc(${halfHeight} * var(--tile))`;
    bgPosX = -homeX * tilePx;
    // Adjust position based on which half the tile is in
    if (homeY < halfHeight) {
      bgPosY = -homeY * tilePx;
    } else {
      bgPosY = -(homeY - halfHeight) * tilePx;
    }
  }
  
  return { image, bgSize, bgPosX, bgPosY };
}

// Helper function to get background position as calc() expression
function getBackgroundPositionCalc(homeX, homeY) {
  if (boardConfig.imageMode === 'single') {
    // Simple case: just multiply home coordinates by --tile
    return `calc(${-homeX} * var(--tile)) calc(${-homeY} * var(--tile))`;
  } else if (boardConfig.imageMode === 'horizontal') {
    const halfWidth = boardConfig.width / 2;
    let xCalc;
    if (homeX < halfWidth) {
      // Left half: normal offset
      xCalc = `calc(${-homeX} * var(--tile))`;
    } else {
      // Right half: subtract halfWidth to account for second image
      xCalc = `calc(${-(homeX - halfWidth)} * var(--tile))`;
    }
    const yCalc = `calc(${-homeY} * var(--tile))`;
    return `${xCalc} ${yCalc}`;
  } else if (boardConfig.imageMode === 'vertical') {
    const halfHeight = boardConfig.height / 2;
    const xCalc = `calc(${-homeX} * var(--tile))`;
    let yCalc;
    if (homeY < halfHeight) {
      // Top half: normal offset
      yCalc = `calc(${-homeY} * var(--tile))`;
    } else {
      // Bottom half: subtract halfHeight to account for second image
      yCalc = `calc(${-(homeY - halfHeight)} * var(--tile))`;
    }
    return `${xCalc} ${yCalc}`;
  }
  // Fallback
  return `calc(${-homeX} * var(--tile)) calc(${-homeY} * var(--tile))`;
}

/**
 * Helper function to populate gap configuration dropdown
 * @param {HTMLSelectElement} selectElement - The select element to populate
 * @param {string} boardSlug - The board slug to get configurations from
 */
function populateGapConfigDropdown(selectElement, boardSlug) {
  const board = boardRegistry[boardSlug];
  selectElement.innerHTML = '';
  
  board.gapConfigurations.forEach((config, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = config.name;
    selectElement.appendChild(option);
  });
  
  // Set current selection
  selectElement.value = selectedGapConfigIndex;
}

/**
 * Helper function to create a piece (tile or gap)
 * @param {boolean} isGap - Whether this is a gap
 * @param {boolean} isLarge - Whether this is a large piece/gap
 * @param {string} id - Piece ID
 * @param {number} x - X position
 * @param {number} y - Y position
 * @returns {Object} Piece object
 */
function createPiece(isGap, isLarge, id, x, y) {
  const el = document.createElement('div');
  let innerEl = null;
  
  if (isGap) {
    // Gap: create wrapper + inner element
    el.className = isLarge ? 'gap-wrapper big' : 'gap-wrapper';
    innerEl = document.createElement('div');
    innerEl.className = isLarge ? 'gap big' : 'gap';
    el.appendChild(innerEl);
  } else {
    // Regular piece
    el.className = isLarge ? 'tile big' : 'tile small';
  }
  
  // Set background on appropriate element
  const bgEl = isGap ? innerEl : el;
  const { image, bgSize } = getBackgroundStyleForTile(x, y);
  bgEl.style.backgroundImage = `url("${image}")`;
  bgEl.style.backgroundSize = bgSize;
  bgEl.style.backgroundPosition = getBackgroundPositionCalc(x, y);
  
  boardEl.appendChild(el);
  
  return {
    id,
    isGap,
    isLarge,
    x,
    y,
    homeX: x,
    homeY: y,
    el,
    innerEl,
    selected: false
  };
}

// ============================================================================
// INITIALIZATION FUNCTIONS
// ============================================================================

function initTiles() {
  pieces = [];
  pieceById.clear();

  // Get current gap configuration
  const gapConfig = boardConfig.gapConfigurations[selectedGapConfigIndex];
  
  // Build coverage mask for large pieces AND large gaps
  const covered = [...Array(boardConfig.height)].map(()=>Array(boardConfig.width).fill(false));
  
  // Mark all large piece positions as covered (including those that will become large gaps)
  boardConfig.largePieces.forEach(({x,y})=>{
    for(let dy=0; dy<2; dy++){
      for(let dx=0; dx<2; dx++){
        covered[y+dy][x+dx] = true;
      }
    }
  });
  
  // Create large pieces (excluding those that are gaps)
  let bigPieceIdx = 0;
  boardConfig.largePieces.forEach((home) => {
    const isGap = gapConfig.gaps.some(g => g.x === home.x && g.y === home.y);
    if (!isGap) {
      const piece = createPiece(false, true, `B${bigPieceIdx++}`, home.x, home.y);
      pieces.push(piece);
      pieceById.set(piece.id, piece);
    }
  });
  
  // Create large gaps
  let bigGapIdx = 0;
  gapConfig.gaps.forEach((gapPos) => {
    const isLargePiecePosition = boardConfig.largePieces.some(
      lp => lp.x === gapPos.x && lp.y === gapPos.y
    );
    
    if (isLargePiecePosition) {
      const piece = createPiece(true, true, `BG${bigGapIdx++}`, gapPos.x, gapPos.y);
      pieces.push(piece);
      pieceById.set(piece.id, piece);
    }
  });

  // Create small pieces and small gaps
  const isSmallGapIdentity = (x,y) => {
    return gapConfig.gaps.some(g => {
      if (g.x !== x || g.y !== y) return false;
      // Only count as small gap if not a large piece position
      return !boardConfig.largePieces.some(lp => lp.x === x && lp.y === y);
    });
  };
  
  let sIdx = 0;
  let gIdx = 0;
  for(let y=0; y<boardConfig.height; y++){
    for(let x=0; x<boardConfig.width; x++){
      if(covered[y][x]) continue;
      
      const isGap = isSmallGapIdentity(x,y);
      const id = isGap ? `G${gIdx++}` : `S${sIdx++}`;
      
      const piece = createPiece(isGap, false, id, x, y);
      pieces.push(piece);
      pieceById.set(piece.id, piece);
    }
  }
  
  // Set first gap as selected
  const firstGap = pieces.find(p => p.isGap);
  if (firstGap) firstGap.selected = true;
}

function buildGridFromState() {
  grid = [...Array(boardConfig.height)].map(()=>Array(boardConfig.width).fill(null));
  
  // Create a temporary state object for normalizeCoords
  const tempState = {
    boardConfig,
    wrapHorizontal,
    wrapVertical
  };
  
  for (const piece of pieces) {
    if (piece.isLarge) {
      // Large piece or large gap occupies 2×2 cells (with wrapping support)
      for(let dy=0; dy<2; dy++) {
        for(let dx=0; dx<2; dx++) {
          const cellPos = normalizeCoords(tempState, piece.x + dx, piece.y + dy);
          grid[cellPos.y][cellPos.x] = {
            isGap: piece.isGap,
            isLarge: piece.isLarge,
            id: piece.id,
            ox: dx,
            oy: dy
          };
        }
      }
    } else {
      // Small piece or small gap occupies 1 cell
      grid[piece.y][piece.x] = {
        isGap: piece.isGap,
        isLarge: piece.isLarge,
        id: piece.id
      };
    }
  }
}

function switchBoard(boardSlug) {
  // Switch to a different board configuration
  if (!boardRegistry[boardSlug]) {
    console.error(`Unknown board: ${boardSlug}`);
    return;
  }
  
  boardConfig = boardRegistry[boardSlug];
  currentBoardSlug = boardSlug;
  
  // Reset gap configuration index to 0 when switching boards
  selectedGapConfigIndex = 0;
  
  // Update board dimensions
  boardEl.style.width = `calc(${boardConfig.width} * var(--tile))`;
  boardEl.style.height = `calc(${boardConfig.height} * var(--tile))`;
  
  // Reset the puzzle with new board
  resetState();
  
  // Apply board size (handles both auto-fit and manual scaling)
  applyBoardSize();
}

/**
 * Reset puzzle to solved state.
 * All pieces return to their home positions.
 */
function resetState() {
  // Remove any previous piece DOM (will be re-added in initTiles)
  boardEl.querySelectorAll('.tile, .gap-wrapper').forEach(el => el.remove());
  initTiles();

  buildGridFromState();
  renderAll();
}

function resetGapIdentities() {
  // Find pieces that should be gaps based on current gap configuration
  // and toggle their isGap flag without moving anything
  
  const gapConfig = boardConfig.gapConfigurations[selectedGapConfigIndex];
  
  // First, convert all current gaps to regular pieces
  const currentGaps = pieces.filter(p => p.isGap);
  for (const piece of currentGaps) {
    // Convert gap to tile - keep identity and position
    piece.isGap = false;
    piece.selected = false;
  }
  
  // Now find pieces that should be gaps based on configuration
  const newGapPieces = [];
  for (const gapPos of gapConfig.gaps) {
    // Check if this is a large piece position
    const isLargePiecePosition = boardConfig.largePieces.some(
      lp => lp.x === gapPos.x && lp.y === gapPos.y
    );
    
    // Find the piece with this identity (homeX, homeY)
    const piece = pieces.find(p =>
      p.homeX === gapPos.x &&
      p.homeY === gapPos.y &&
      p.isLarge === isLargePiecePosition
    );
    
    if (piece) {
      newGapPieces.push(piece);
    }
  }
  
  // Convert selected pieces to gaps - keep their identities and positions
  for (const piece of newGapPieces) {
    // Convert tile to gap - keep identity and position
    piece.isGap = true;
    piece.selected = false;
  }
  
  // Select first gap
  if (newGapPieces.length > 0) {
    newGapPieces[0].selected = true;
  }
  
  // Rebuild grid with new gap positions
  buildGridFromState();
  
  // Update DOM to reflect new gap assignments
  updatePieceDOMForGapChangesImpl(getState());
  renderAll();
}


/**
 * Randomize which cells act as gaps by selecting new positions and
 * assigning them new identities based on those positions.
 * This converts current gaps to tiles and selected tiles to gaps.
 */
function randomizeGapIdentities() {
  // Use unseeded random number generator
  const randomInt = (max) => Math.floor(Math.random() * max);
  performGapRandomizationImpl(getState(), randomInt);
  
  // Update DOM to reflect new gap assignments
  updatePieceDOMForGapChangesImpl(getState());
  buildGridFromState();
  renderAll();
}

// ============================================================================
// GAME MODE MANAGEMENT
// ============================================================================

function updateUIForMode() {
  if (gameMode === 'challenge') {
    // Challenge mode: hide Shuffle and Settings, show Give Up, show challenge info
    shuffleBtn.style.display = 'none';
    settingsBtn.style.display = 'none';
    giveUpBtn.style.display = 'inline-block';
    challengeInfo.style.display = 'block';
    challengeSeedDisplay.textContent = challengeSeed;
    challengeStepsDisplay.textContent = challengeSteps;
    challengeMovesDisplay.textContent = challengeMoveCount;
    resetBtn.textContent = 'Restart';
    // Update Give Up button text based on solved state
    giveUpBtn.textContent = challengeSolved ? 'Free Play' : 'Give Up';
  } else {
    // Free Play mode: show Shuffle and Settings, hide Give Up, hide challenge info
    shuffleBtn.style.display = 'inline-block';
    settingsBtn.style.display = 'inline-block';
    giveUpBtn.style.display = 'none';
    challengeInfo.style.display = 'none';
    resetBtn.textContent = 'Reset';
  }
}

function updateMoveCount() {
  if (gameMode === 'challenge') {
    challengeMovesDisplay.textContent = challengeMoveCount;
  }
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function updateTimer() {
  if (!timerPaused && timerStartTime !== null) {
    const currentTime = Date.now();
    const elapsed = Math.floor((currentTime - timerStartTime + timerElapsedTime) / 1000);
    // Always update the display content, even when hidden
    // This ensures the correct time is shown when visibility changes or challenge completes
    challengeTimerDisplay.textContent = formatTime(elapsed);
  }
}

function startTimer() {
  if (gameMode !== 'challenge') return;
  
  // Clear any existing interval first
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  // Reset timer state
  timerStartTime = Date.now();
  timerElapsedTime = 0;
  timerPaused = false;
  
  // Restore timer hidden state from localStorage
  const savedTimerHidden = localStorage.getItem('timerHidden') === 'true';
  timerHidden = savedTimerHidden;
  
  // Update display
  challengeTimerDisplay.textContent = '0:00';
  if (timerHidden) {
    challengeTimerDisplay.style.display = 'none';
    timerShowBtn.style.display = '';
  } else {
    challengeTimerDisplay.style.display = '';
    timerShowBtn.style.display = 'none';
  }
  
  // Update pause button
  timerToggleBtn.textContent = '⏸';
  timerToggleBtn.setAttribute('aria-label', 'Pause timer');
  timerToggleBtn.setAttribute('title', 'Pause');
  
  // Create interval - this runs regardless of visibility
  timerInterval = setInterval(updateTimer, 100);
}

function pauseTimer() {
  if (timerPaused || !timerStartTime) return;
  
  timerPaused = true;
  const currentTime = Date.now();
  timerElapsedTime += (currentTime - timerStartTime);
  timerToggleBtn.textContent = '▶';
  timerToggleBtn.setAttribute('aria-label', 'Resume timer');
  timerToggleBtn.setAttribute('title', 'Resume');
  boardEl.classList.add('paused');
}

function resumeTimer() {
  if (!timerPaused) return;
  
  timerPaused = false;
  timerStartTime = Date.now();
  timerToggleBtn.textContent = '⏸';
  timerToggleBtn.setAttribute('aria-label', 'Pause timer');
  timerToggleBtn.setAttribute('title', 'Pause');
  boardEl.classList.remove('paused');
  boardEl.focus();
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  timerStartTime = null;
  timerElapsedTime = 0;
  timerPaused = false;
  timerHidden = false;
  boardEl.classList.remove('paused');
  challengeTimerDisplay.textContent = '0:00';
  challengeTimerDisplay.style.display = '';
  timerShowBtn.style.display = 'none';
  timerToggleBtn.textContent = '⏸';
  timerToggleBtn.setAttribute('aria-label', 'Pause timer');
  timerToggleBtn.setAttribute('title', 'Pause');
}

function freezeTimer() {
  // Stop timer updates without applying blur (used when puzzle is solved)
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  timerStartTime = null;
  // Keep timerPaused as false to prevent blur
  timerPaused = false;
  boardEl.classList.remove('paused');
}

function updateURL() {
  // Update browser URL to reflect current game mode
  const url = new URL(window.location);
  
  if (gameMode === 'challenge' && challengeSeed !== null && challengeSteps !== null) {
    // Challenge mode: add seed, steps, board, gapConfig, randomizeGaps, and wrapping parameters
    url.searchParams.set('seed', challengeSeed);
    url.searchParams.set('steps', challengeSteps);
    url.searchParams.set('board', challengeBoard || currentBoardSlug);
    url.searchParams.set('gapConfig', selectedGapConfigIndex.toString());
    if (challengeRandomizeGaps) {
      url.searchParams.set('randomizeGaps', 'true');
    } else {
      url.searchParams.delete('randomizeGaps');
    }
    if (challengeWrapHorizontal) {
      url.searchParams.set('wrapH', 'true');
    } else {
      url.searchParams.delete('wrapH');
    }
    if (challengeWrapVertical) {
      url.searchParams.set('wrapV', 'true');
    } else {
      url.searchParams.delete('wrapV');
    }
  } else {
    // Free Play mode: remove challenge parameters
    url.searchParams.delete('seed');
    url.searchParams.delete('steps');
    url.searchParams.delete('board');
    url.searchParams.delete('gapConfig');
    url.searchParams.delete('randomizeGaps');
    url.searchParams.delete('wrapH');
    url.searchParams.delete('wrapV');
  }
  
  // Update URL without reloading the page
  window.history.pushState({}, '', url);
}

function switchToFreePlay() {
  gameMode = 'freeplay';
  challengeSeed = null;
  challengeSteps = null;
  challengeBoard = null;
  challengeRandomizeGaps = false;
  challengeWrapHorizontal = false;
  challengeWrapVertical = false;
  challengeMoveCount = 0;
  challengeSolved = false;
  stopTimer();
  updateUIForMode();
  updateURL(); // Update URL when switching to Free Play
  renderAll(); // Restore gap highlighting for Free Play mode
  // Don't reset the board - keep current state
  // Keep wrapping settings from challenge (don't reset wrapHorizontal/wrapVertical)
  
  // Reapply board size since challenge box appearance affects available space
  if (autoFitEnabled) {
    applyBoardSize();
  }
}

async function startChallenge(seed, steps, boardSlug = null, gapConfigIndex = 0, randomizeGaps = false, wrapH = false, wrapV = false) {
  gameMode = 'challenge';
  challengeSeed = seed;
  challengeSteps = steps;
  challengeBoard = boardSlug || currentBoardSlug;
  challengeRandomizeGaps = randomizeGaps;
  challengeWrapHorizontal = wrapH;
  challengeWrapVertical = wrapV;
  challengeMoveCount = 0;
  challengeSolved = false;
  
  // Apply wrapping settings
  wrapHorizontal = wrapH;
  wrapVertical = wrapV;
  
  // Stop any existing timer and remove paused state
  stopTimer();
  
  // Switch board if different from current
  if (challengeBoard !== currentBoardSlug) {
    switchBoard(challengeBoard);
  }
  
  // Apply gap configuration
  selectedGapConfigIndex = gapConfigIndex;
  
  updateUIForMode();
  updateURL(); // Update URL when starting challenge
  
  // Reapply board size since challenge box appearance affects available space
  if (autoFitEnabled) {
    applyBoardSize();
  }
  
  // Reset to solved state first
  resetState();
  
  // Then shuffle with the challenge seed and randomize flag
  await shuffle(steps, seed, randomizeGaps);
  
  updatePieceDOMForGapChangesImpl(getState());
  buildGridFromState();
  renderAll();
  
  // Start timer after shuffle completes
  startTimer();
}

function checkWinCondition() {
  // Check if all pieces (including gaps) are in their home positions
  for (const piece of pieces) {
    if (piece.x !== piece.homeX || piece.y !== piece.homeY) {
      return false;
    }
  }
  return true;
}

async function handleWin() {
  challengeSolved = true;
  freezeTimer(); // Stop timer without blur effect
  updateUIForMode();
  renderAll(); // Remove gap selection highlighting immediately
  
  // Wait for animation to complete (80ms transition time)
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Get final time
  const finalTime = challengeTimerDisplay.textContent;
  
  // Show custom congratulations dialog
  congratsMessage.textContent = `You solved the challenge in ${challengeMoveCount} moves and with a time of ${finalTime}!`;
  congratsDialog.style.display = 'flex';
  congratsOkBtn.focus(); // Focus OK button for keyboard controls
}

// ============================================================================
// STATE OBJECT FACTORY
// ============================================================================

/**
 * Create state object for passing to modules
 * @returns {Object} State object with all necessary properties and methods
 */
function getState() {
  return {
    // Configuration
    boardConfig,
    tilePx,
    baseTilePx,
    currentBoardSlug,
    selectedGapConfigIndex,
    
    // Data structures
    pieces,
    pieceById,
    grid,
    
    // Flags
    wrapHorizontal,
    wrapVertical,
    gameMode,
    challengeSolved,
    timerPaused,
    isShuffling,
    
    // Counters
    challengeMoveCount,
    
    // DOM elements
    boardEl,
    
    // Functions
    renderAll: () => renderAll(),
    checkWinCondition: () => checkWinCondition(),
    handleWin: () => handleWin(),
    updateMoveCount: () => updateMoveCount(),
    buildGridFromState: () => buildGridFromState(),
    calculateLargePieceDestination: (piece, dx, dy) => calculateLargePieceDestination(getState(), piece, dx, dy),
    incrementMoveCount: () => {
      challengeMoveCount++;
      updateMoveCount();
    }
  };
}

// ============================================================================
// WRAPPER FUNCTIONS FOR MODULES
// ============================================================================

function renderAll() {
  renderAllImpl(getState());
}

async function shuffle(steps, seed = null, randomizeGaps = false) {
  // Disable buttons before shuffle
  shuffleBtn.disabled = true;
  resetBtn.disabled = true;
  challengeBtn.disabled = true;
  settingsBtn.disabled = true;
  
  const state = getState();
  await shuffleImpl(state, steps, seed, randomizeGaps);
  
  // Update mutable state from state object
  isShuffling = state.isShuffling;
  
  // Update UI after shuffle
  buildGridFromState();
  renderAll();
  
  // Re-enable buttons after shuffle
  shuffleBtn.disabled = false;
  resetBtn.disabled = false;
  challengeBtn.disabled = false;
  settingsBtn.disabled = false;
}

// ============================================================================
// WRAPPING HELPER FUNCTIONS
// ============================================================================

/**
 * Check if any large pieces are currently wrapped in the given direction
 * @param {boolean} checkHorizontal - Check for horizontal wrapping
 * @param {boolean} checkVertical - Check for vertical wrapping
 * @returns {boolean} True if any large piece is wrapped in the specified direction
 */
function hasWrappedLargePieces(checkHorizontal, checkVertical) {
  const bigPieces = pieces.filter(p => p.isLarge && !p.isGap);
  const state = getState();
  
  for (const piece of bigPieces) {
    // Calculate all 4 cell positions with normalization
    const cells = [
      normalizeCoords(state, piece.x, piece.y),           // Top-left
      normalizeCoords(state, piece.x + 1, piece.y),       // Top-right
      normalizeCoords(state, piece.x, piece.y + 1),       // Bottom-left
      normalizeCoords(state, piece.x + 1, piece.y + 1)    // Bottom-right
    ];
    
    // Check if piece spans board edges (cells are not contiguous)
    if (checkHorizontal) {
      const spansHorizontal = (Math.abs(cells[0].x - cells[1].x) > 1 || Math.abs(cells[2].x - cells[3].x) > 1);
      if (spansHorizontal) return true;
    }
    
    if (checkVertical) {
      const spansVertical = (Math.abs(cells[0].y - cells[2].y) > 1 || Math.abs(cells[1].y - cells[3].y) > 1);
      if (spansVertical) return true;
    }
  }
  
  return false;
}

// ============================================================================
// DISPLAY SETTINGS
// ============================================================================

/**
 * Determines optimal challenge box position based on available space
 * Returns 'above' or 'right' based on which gives more room for the board
 */
function determineOptimalChallengePosition() {
  if (gameMode !== 'challenge') return 'right'; // Default when not in challenge mode
  
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const padding = 16;
  
  // Challenge box dimensions (from CSS)
  const challengeBoxMinWidth = 220;
  const challengeBoxPadding = 32;
  const challengeBoxBorder = 2;
  const gap = 8;
  
  // Measure toolbar height
  const toolbar = document.querySelector('.toolbar');
  const toolbarHeight = toolbar ? toolbar.offsetHeight : 0;
  
  // Estimate challenge box height when above (compact horizontal layout)
  // This is approximate - actual height depends on content wrapping
  const estimatedChallengeBoxHeightAbove = 60; // Typical height for horizontal layout
  
  // Calculate available space for BOARD with challenge box on RIGHT
  const horizontalSpaceRight = challengeBoxMinWidth + challengeBoxPadding + challengeBoxBorder + gap;
  const availableWidthRight = viewportWidth - padding - horizontalSpaceRight;
  const availableHeightRight = viewportHeight - padding - toolbarHeight;
  
  // Calculate available space for BOARD with challenge box ABOVE
  const availableWidthAbove = viewportWidth - padding;
  const availableHeightAbove = viewportHeight - padding - toolbarHeight - estimatedChallengeBoxHeightAbove - gap;
  
  // Calculate potential board area for each position
  // For RIGHT position: calculate max board size
  const tileSizeRight = Math.min(
    Math.floor(availableWidthRight / boardConfig.width),
    Math.floor(availableHeightRight / boardConfig.height)
  );
  const boardAreaRight = (tileSizeRight * boardConfig.width) * (tileSizeRight * boardConfig.height);
  
  // For ABOVE position: calculate max board size
  const tileSizeAbove = Math.min(
    Math.floor(availableWidthAbove / boardConfig.width),
    Math.floor(availableHeightAbove / boardConfig.height)
  );
  const boardAreaAbove = (tileSizeAbove * boardConfig.width) * (tileSizeAbove * boardConfig.height);
  
  // Choose position that gives larger board area
  return boardAreaAbove > boardAreaRight ? 'above' : 'right';
}

// Function to apply board size (either auto-fit or manual scale)
// Uses iterative approach for board size changes to ensure proper sizing
function applyBoardSize() {
  if (autoFitEnabled) {
    document.body.classList.add('auto-fit');
    // Use iterative approach to ensure board is properly sized
    // Repeat until board size stabilizes (max 20 iterations)
    let iteration = 0;
    let lastBoardWidth = 0;
    
    const applyIteration = () => {
      // Apply scaling (includes auto-positioning logic)
      updateAutoFitScale();
      
      // Check if we should continue iterating
      const newBoardWidth = boardEl.offsetWidth;
      
      if (iteration < 20) {
        lastBoardWidth = newBoardWidth;
        iteration++;
        // Schedule next iteration after DOM settles
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(applyIteration, 10);
          });
        });
      }
    };
    
    applyIteration();
  } else {
    document.body.classList.remove('auto-fit');
    
    // Manual mode: apply explicit position if not auto
    if (gameMode === 'challenge') {
      if (challengeBoxPosition === 'auto') {
        const optimalPosition = determineOptimalChallengePosition();
        const effectiveAbove = (optimalPosition === 'above');
        document.body.classList.toggle('challenge-auto-above', effectiveAbove);
        document.body.classList.remove('challenge-above');
      } else {
        const manualAbove = (challengeBoxPosition === 'above');
        document.body.classList.toggle('challenge-above', manualAbove);
        document.body.classList.remove('challenge-auto-above');
      }
    }
    
    // Apply manual board size scale
    const scaledTilePx = Math.floor(baseTilePx * (boardSizeScale / 100));
    document.documentElement.style.setProperty('--tile', `${scaledTilePx}px`);
    tilePx = scaledTilePx;
    // Update board dimensions
    boardEl.style.width = `calc(${boardConfig.width} * var(--tile))`;
    boardEl.style.height = `calc(${boardConfig.height} * var(--tile))`;
    // Re-render to update positions
    renderAll();
  }
}

// Function to calculate and apply scaling
function updateAutoFitScale() {
  if (!autoFitEnabled) {
    return;
  }
  
  // AUTO-POSITIONING LOGIC: Determine optimal position if in auto mode
  let effectiveChallengeAbove = false;
  if (gameMode === 'challenge') {
    if (challengeBoxPosition === 'auto') {
      const optimalPosition = determineOptimalChallengePosition();
      effectiveChallengeAbove = (optimalPosition === 'above');
      
      // Apply the auto-determined position
      document.body.classList.toggle('challenge-auto-above', effectiveChallengeAbove);
      document.body.classList.remove('challenge-above'); // Remove manual class
    } else {
      // Manual mode: use the explicit setting
      effectiveChallengeAbove = (challengeBoxPosition === 'above');
      document.body.classList.remove('challenge-auto-above'); // Remove auto class
      document.body.classList.toggle('challenge-above', effectiveChallengeAbove);
    }
  }
  
  // Disable transitions during resize to prevent timing issues
  boardEl.classList.add('no-transitions');
  
  // Get viewport dimensions
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const padding = 16; // Account for body margins (8px each side)
  
  // Calculate additional horizontal space needed for challenge box if it's to the right of the board
  let challengeBoxWidthSpace = 0;
  if (gameMode === 'challenge' && !effectiveChallengeAbove) {
    // Challenge box is to the right: account for gap + full challenge box width
    const gap = 8; // gap between board and challenge box (from CSS .game-container)
    const challengeBoxMinWidth = 220; // min-width from CSS .challenge-info
    const challengeBoxPadding = 32; // padding: 16px on each side (from CSS .challenge-info)
    const challengeBoxBorder = 2; // border: 1px on each side (from CSS .challenge-info)
    challengeBoxWidthSpace = gap + challengeBoxMinWidth + challengeBoxPadding + challengeBoxBorder;
  }
  
  // Calculate vertical space used by other elements
  let verticalSpace = padding; // Body margins
  
  // Add toolbar height (accounts for wrapping on small screens)
  const toolbar = document.querySelector('.toolbar');
  if (toolbar) {
    verticalSpace += toolbar.offsetHeight;
  }
  
  // Add challenge box height if it's above the board
  if (gameMode === 'challenge' && effectiveChallengeAbove) {
    const challengeInfo = document.getElementById('challengeInfo');
    if (challengeInfo) {
      verticalSpace += challengeInfo.offsetHeight;
      // Add gap between challenge box and board (from CSS .game-container)
      verticalSpace += 8;
    }
  }
  
  // Calculate what the board dimensions WOULD BE at base tile size
  const baseBoardWidthPx = boardConfig.width * baseTilePx;
  const baseBoardHeightPx = boardConfig.height * baseTilePx;
  
  // Determine tile size based on width constraint
  let targetTilePxWidth;
  if (baseBoardWidthPx + padding + challengeBoxWidthSpace > viewportWidth) {
    // Calculate new tile size to fit viewport width
    targetTilePxWidth = Math.floor((viewportWidth - padding - challengeBoxWidthSpace) / boardConfig.width);
  } else {
    // Board fits naturally in width, use base tile size
    targetTilePxWidth = baseTilePx;
  }
  
  // Determine tile size based on height constraint
  let targetTilePxHeight;
  const availableHeight = viewportHeight - verticalSpace;
  if (baseBoardHeightPx > availableHeight) {
    // Calculate new tile size to fit viewport height
    targetTilePxHeight = Math.floor(availableHeight / boardConfig.height);
  } else {
    // Board fits naturally in height, use base tile size
    targetTilePxHeight = baseTilePx;
  }
  
  // Use the smaller of the two constraints to ensure board fits in both dimensions
  const targetTilePx = Math.min(targetTilePxWidth, targetTilePxHeight);
  
  // Apply the changes
  document.documentElement.style.setProperty('--tile', `${targetTilePx}px`);
  tilePx = targetTilePx;
  
  // Update board dimensions
  boardEl.style.width = `calc(${boardConfig.width} * var(--tile))`;
  boardEl.style.height = `calc(${boardConfig.height} * var(--tile))`;
  
  // Re-render to update tile positions
  renderAll();
  
  // Re-enable transitions after a brief delay
  setTimeout(() => {
    boardEl.classList.remove('no-transitions');
  }, 50);
}

// ============================================================================
// EVENT HANDLERS - BUTTONS
// ============================================================================

resetBtn.addEventListener('click', () => {
  if (gameMode === 'challenge') {
    // In challenge mode, reset recreates the challenge with the same settings
    startChallenge(challengeSeed, challengeSteps, challengeBoard, selectedGapConfigIndex, challengeRandomizeGaps, challengeWrapHorizontal, challengeWrapVertical);
  } else {
    // In free play mode, reset returns to solved state
    resetState();
  }
});

shuffleBtn.addEventListener('click', () => shuffle(250, null, false));

giveUpBtn.addEventListener('click', () => {
  switchToFreePlay();
  boardEl.focus();
});

// Timer display click handler - hides the timer
challengeTimerDisplay.addEventListener('click', () => {
  if (gameMode !== 'challenge') return;
  
  timerHidden = true;
  localStorage.setItem('timerHidden', 'true');
  challengeTimerDisplay.style.display = 'none';
  timerShowBtn.style.display = '';
});

// Timer show button handler - shows the timer
timerShowBtn.addEventListener('click', () => {
  timerHidden = false;
  localStorage.setItem('timerHidden', 'false');
  
  // Update display immediately when showing
  if (timerStartTime !== null && !timerPaused) {
    const currentTime = Date.now();
    const elapsed = Math.floor((currentTime - timerStartTime + timerElapsedTime) / 1000);
    challengeTimerDisplay.textContent = formatTime(elapsed);
  } else if (timerPaused) {
    const elapsed = Math.floor(timerElapsedTime / 1000);
    challengeTimerDisplay.textContent = formatTime(elapsed);
  }
  
  challengeTimerDisplay.style.display = '';
  timerShowBtn.style.display = 'none';
});

// Timer toggle button handler
timerToggleBtn.addEventListener('click', () => {
  // Disable button when challenge is solved
  if (challengeSolved) return;
  
  if (timerPaused) {
    resumeTimer();
  } else {
    pauseTimer();
  }
});

// ============================================================================
// EVENT HANDLERS - SETTINGS DIALOG
// ============================================================================

settingsBtn.addEventListener('click', () => {
  // Set current board in dropdown
  settingsBoardSelect.value = currentBoardSlug;
  // Populate gap configuration dropdown
  populateGapConfigDropdown(settingsGapConfigSelect, currentBoardSlug);
  // Set current wrapping state
  wrapHorizontalCheckbox.checked = wrapHorizontal;
  wrapVerticalCheckbox.checked = wrapVertical;
  settingsDialog.style.display = 'flex';
  settingsBoardSelect.focus();
});

settingsCancelBtn.addEventListener('click', () => {
  settingsDialog.style.display = 'none';
  boardEl.focus();
});

// Board select change handler - applies instantly
settingsBoardSelect.addEventListener('change', () => {
  const selectedBoard = settingsBoardSelect.value;
  
  // Reset gap configuration to first option before other actions
  selectedGapConfigIndex = 0;
  
  // Repopulate gap config dropdown for new board
  populateGapConfigDropdown(settingsGapConfigSelect, selectedBoard);
  
  // Switch board if different
  if (selectedBoard !== currentBoardSlug) {
    switchBoard(selectedBoard);
  }
});

// Gap config select change handler - applies instantly
settingsGapConfigSelect.addEventListener('change', () => {
  selectedGapConfigIndex = parseInt(settingsGapConfigSelect.value);
  resetState(); // Rebuild with new gap configuration
});

// Allow Escape to close
settingsDialog.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    settingsCancelBtn.click();
  }
});

// Close settings dialog when clicking outside
settingsDialog.addEventListener('mousedown', (e) => {
  if (e.target === settingsDialog) {
    settingsCancelBtn.click();
  }
});

// Gap control button handlers
resetGapsBtn.addEventListener('click', () => {
  resetGapIdentities();
});

randomizeGapsBtn.addEventListener('click', () => {
  randomizeGapIdentities();
});

// Wrapping checkbox handlers for Free Play
wrapHorizontalCheckbox.addEventListener('change', () => {
  const newValue = wrapHorizontalCheckbox.checked;
  
  // If disabling horizontal wrapping, check for wrapped large pieces
  if (!newValue && wrapHorizontal) {
    // Check if any large pieces are currently wrapped horizontally
    if (hasWrappedLargePieces(true, false)) {
      // Reset board to solved state
      wrapHorizontal = newValue;
      resetState();
      return;
    }
  }
  
  wrapHorizontal = newValue;
  renderAll(); // Re-render to show/hide duplicates
});

wrapVerticalCheckbox.addEventListener('change', () => {
  const newValue = wrapVerticalCheckbox.checked;
  
  // If disabling vertical wrapping, check for wrapped large pieces
  if (!newValue && wrapVertical) {
    // Check if any large pieces are currently wrapped vertically
    if (hasWrappedLargePieces(false, true)) {
      // Reset board to solved state
      wrapVertical = newValue;
      resetState();
      return;
    }
  }
  
  wrapVertical = newValue;
  renderAll(); // Re-render to show/hide duplicates
});

// ============================================================================
// EVENT HANDLERS - CHALLENGE DIALOG
// ============================================================================

challengeBtn.addEventListener('click', () => {
  // Set current board in dropdown
  challengeBoardSelect.value = currentBoardSlug;
  // Populate gap configuration dropdown
  populateGapConfigDropdown(challengeGapConfigSelect, currentBoardSlug);
  // Set current wrapping state for challenge
  challengeWrapHorizontalCheckbox.checked = wrapHorizontal;
  challengeWrapVerticalCheckbox.checked = wrapVertical;
  challengeDialog.style.display = 'flex';
  seedInput.focus();
});

// Challenge board select change handler - updates gap config dropdown
challengeBoardSelect.addEventListener('change', () => {
  const selectedBoard = challengeBoardSelect.value;
  
  // Reset gap configuration to first option before other actions
  selectedGapConfigIndex = 0;
  
  // Repopulate gap config dropdown for new board
  populateGapConfigDropdown(challengeGapConfigSelect, selectedBoard);
});

// Difficulty preset buttons
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const steps = btn.getAttribute('data-steps');
    stepsInput.value = steps;
    stepsInput.focus();
  });
});

challengeCancelBtn.addEventListener('click', () => {
  challengeDialog.style.display = 'none';
  boardEl.focus();
});

// Daily Challenge button handler
dailyChallengeBtn.addEventListener('click', () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dailySeed = `${year}${month}${day}`;
  seedInput.value = dailySeed;
});

challengeStartBtn.addEventListener('click', async () => {
  const seedValue = seedInput.value.trim();
  const steps = parseInt(stepsInput.value) || 250;
  const boardSlug = challengeBoardSelect.value;
  const gapConfigIndex = parseInt(challengeGapConfigSelect.value);
  const randomizeGaps = randomizeGapsCheckbox.checked;
  const wrapH = challengeWrapHorizontalCheckbox.checked;
  const wrapV = challengeWrapVerticalCheckbox.checked;
  
  // Close dialog
  challengeDialog.style.display = 'none';
  
  // Determine seed: use provided value or generate random
  let seed;
  if (seedValue === '') {
    // Generate random seed (0 to 2^32-1 for LCG compatibility)
    seed = Math.floor(Math.random() * 4294967296);
    console.log(`Random seed generated: ${seed}`);
  } else {
    // Use provided numeric seed
    seed = parseInt(seedValue);
    console.log(`Using seed: ${seed}`);
  }
  
  // Start the challenge
  await startChallenge(seed, steps, boardSlug, gapConfigIndex, randomizeGaps, wrapH, wrapV);
  
  boardEl.focus();
});

// Allow Enter key to start challenge
challengeDialog.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    challengeStartBtn.click();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    challengeCancelBtn.click();
  }
});

// ============================================================================
// EVENT HANDLERS - CONGRATULATIONS DIALOG
// ============================================================================

congratsOkBtn.addEventListener('click', () => {
  congratsDialog.style.display = 'none';
  boardEl.focus();
});

// Allow Enter/Escape to close congrats dialog
congratsDialog.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === 'Escape') {
    e.preventDefault();
    congratsOkBtn.click();
  }
});

// ============================================================================
// EVENT HANDLERS - DISPLAY SETTINGS DIALOG
// ============================================================================

displayBtn.addEventListener('click', () => {
  // Set current values in dialog
  const currentTheme = localStorage.getItem('theme') || 'auto';
  themeSelect.value = currentTheme;
  autoScaleCheckbox.checked = autoFitEnabled;
  challengePositionSelect.value = challengeBoxPosition;
  boardSizeSlider.value = boardSizeScale;
  boardSizeValue.textContent = `${boardSizeScale}%`;
  boardSizeSlider.disabled = autoFitEnabled;
  
  displayDialog.style.display = 'flex';
  themeSelect.focus();
});

displayCloseBtn.addEventListener('click', () => {
  displayDialog.style.display = 'none';
  boardEl.focus();
});

// Theme dropdown handler - applies instantly
themeSelect.addEventListener('change', () => {
  const theme = themeSelect.value;
  localStorage.setItem('theme', theme);
  applyTheme(theme);
});

// Auto-scale checkbox handler - applies instantly
autoScaleCheckbox.addEventListener('change', () => {
  autoFitEnabled = autoScaleCheckbox.checked;
  boardSizeSlider.disabled = autoFitEnabled;
  
  // Apply positioning immediately when toggling auto-scale
  if (!autoFitEnabled && gameMode === 'challenge') {
    // When disabling auto-scale, apply position immediately
    if (challengeBoxPosition === 'auto') {
      const optimalPosition = determineOptimalChallengePosition();
      const effectiveAbove = (optimalPosition === 'above');
      document.body.classList.toggle('challenge-auto-above', effectiveAbove);
      document.body.classList.remove('challenge-above');
    } else {
      const manualAbove = (challengeBoxPosition === 'above');
      document.body.classList.toggle('challenge-above', manualAbove);
      document.body.classList.remove('challenge-auto-above');
    }
  }
  
  applyBoardSize();
  localStorage.setItem('autoFit', autoFitEnabled ? 'enabled' : 'disabled');
});

// Challenge box position dropdown handler - applies instantly
challengePositionSelect.addEventListener('change', () => {
  challengeBoxPosition = challengePositionSelect.value;
  localStorage.setItem('challengeBoxPosition', challengeBoxPosition);
  
  // Reapply board size to trigger repositioning
  if (autoFitEnabled) {
    applyBoardSize();
  } else {
    // Manual scaling: apply position immediately
    if (gameMode === 'challenge') {
      if (challengeBoxPosition === 'auto') {
        const optimalPosition = determineOptimalChallengePosition();
        const effectiveAbove = (optimalPosition === 'above');
        document.body.classList.toggle('challenge-auto-above', effectiveAbove);
        document.body.classList.remove('challenge-above');
      } else {
        const manualAbove = (challengeBoxPosition === 'above');
        document.body.classList.toggle('challenge-above', manualAbove);
        document.body.classList.remove('challenge-auto-above');
      }
    }
  }
});

// Board size slider handler - applies instantly
boardSizeSlider.addEventListener('input', () => {
  boardSizeScale = parseInt(boardSizeSlider.value);
  boardSizeValue.textContent = `${boardSizeScale}%`;
  if (!autoFitEnabled) {
    applyBoardSize();
  }
});

// Save board size when slider change is complete
boardSizeSlider.addEventListener('change', () => {
  localStorage.setItem('boardSize', boardSizeScale.toString());
});

// Allow Escape to close display dialog
displayDialog.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    displayCloseBtn.click();
  }
});

// Close display dialog when clicking outside
displayDialog.addEventListener('mousedown', (e) => {
  if (e.target === displayDialog) {
    displayCloseBtn.click();
  }
});

// ============================================================================
// EVENT HANDLERS - HELP DIALOG
// ============================================================================

helpBtn.addEventListener('click', () => {
  helpDialog.style.display = 'flex';
  helpCloseBtn.focus();
});

helpCloseBtn.addEventListener('click', () => {
  helpDialog.style.display = 'none';
  boardEl.focus();
});

// Allow Enter/Escape to close help dialog
helpDialog.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === 'Escape') {
    e.preventDefault();
    helpCloseBtn.click();
  }
});

// Close dialogs when clicking outside (on overlay)
challengeDialog.addEventListener('mousedown', (e) => {
  if (e.target === challengeDialog) {
    challengeCancelBtn.click();
  }
});

congratsDialog.addEventListener('mousedown', (e) => {
  if (e.target === congratsDialog) {
    congratsOkBtn.click();
  }
});

helpDialog.addEventListener('mousedown', (e) => {
  if (e.target === helpDialog) {
    helpCloseBtn.click();
  }
});

// ============================================================================
// WINDOW RESIZE HANDLER
// ============================================================================

// Update scale when window is resized
let resizeTimeout;
window.addEventListener('resize', () => {
  if (autoFitEnabled) {
    // Debounce resize events with requestAnimationFrame
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      requestAnimationFrame(() => {
        updateAutoFitScale();
      });
    }, 10);
  }
});

// ============================================================================
// URL PARAMETER HANDLING
// ============================================================================

// Parse URL query parameters and auto-start challenge if present
function checkURLParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const seedParam = urlParams.get('seed');
  const stepsParam = urlParams.get('steps');
  const boardParam = urlParams.get('board');
  const gapConfigParam = urlParams.get('gapConfig');
  const randomizeGapsParam = urlParams.get('randomizeGaps');
  const wrapHParam = urlParams.get('wrapH');
  const wrapVParam = urlParams.get('wrapV');
  
  // Only auto-start if both seed and steps parameters exist and are non-empty
  if (seedParam !== null && seedParam.trim() !== '' &&
      stepsParam !== null && stepsParam.trim() !== '') {
    const seed = parseInt(seedParam);
    const steps = parseInt(stepsParam) || 250;
    const boardSlug = boardParam && boardRegistry[boardParam] ? boardParam : 'default';
    const gapConfigIndex = gapConfigParam ? parseInt(gapConfigParam) : 0;
    const randomizeGaps = randomizeGapsParam === 'true';
    const wrapH = wrapHParam === 'true';
    const wrapV = wrapVParam === 'true';
    
    console.log(`Auto-starting challenge from URL: seed=${seed}, steps=${steps}, board=${boardSlug}, gapConfig=${gapConfigIndex}, randomizeGaps=${randomizeGaps}, wrapH=${wrapH}, wrapV=${wrapV}`);
    
    // Start challenge after initialization
    setTimeout(async () => {
      await startChallenge(seed, steps, boardSlug, gapConfigIndex, randomizeGaps, wrapH, wrapV);
      boardEl.focus();
    }, 0);
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Helper function to apply theme based on selection
function applyTheme(theme) {
  if (theme === 'auto') {
    // Use system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.classList.toggle('dark-mode', prefersDark);
  } else if (theme === 'dark') {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
}

// Load saved preferences
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
  applyTheme(savedTheme);
} else {
  // Migrate old darkMode setting if it exists
  if (localStorage.getItem('darkMode') === 'enabled') {
    localStorage.setItem('theme', 'dark');
    applyTheme('dark');
    localStorage.removeItem('darkMode'); // Clean up old setting
  } else {
    // Default to auto
    localStorage.setItem('theme', 'auto');
    applyTheme('auto');
  }
}

// Listen for system theme changes when in auto mode
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  const currentTheme = localStorage.getItem('theme') || 'auto';
  if (currentTheme === 'auto') {
    document.body.classList.toggle('dark-mode', e.matches);
  }
});

// Load auto-fit preference (default to enabled for new users)
const savedAutoFit = localStorage.getItem('autoFit');
if (savedAutoFit === 'disabled') {
  autoFitEnabled = false;
} else {
  // Default to enabled (either explicitly enabled or not set)
  autoFitEnabled = true;
  if (!savedAutoFit) {
    localStorage.setItem('autoFit', 'enabled');
  }
}

// Load challenge box position preference
const savedPosition = localStorage.getItem('challengeBoxPosition');
if (savedPosition && ['auto', 'right', 'above'].includes(savedPosition)) {
  challengeBoxPosition = savedPosition;
} else {
  // Migrate old challengeAbove setting if it exists
  if (localStorage.getItem('challengeAbove') === 'enabled') {
    challengeBoxPosition = 'above';
    localStorage.setItem('challengeBoxPosition', 'above');
    localStorage.removeItem('challengeAbove'); // Clean up old setting
  } else {
    challengeBoxPosition = 'auto'; // Default to auto
  }
}

const savedBoardSize = localStorage.getItem('boardSize');
if (savedBoardSize) {
  boardSizeScale = parseInt(savedBoardSize);
}

// Set initial board dimensions
boardEl.style.width = `calc(${boardConfig.width} * var(--tile))`;
boardEl.style.height = `calc(${boardConfig.height} * var(--tile))`;

// Apply board size after preferences are loaded (handles both auto-fit and manual scaling)
applyBoardSize();

// Initialize game state
resetState();

// Initialize input handlers - pass getState function so handlers always get fresh state
initializeInputHandlers(getState);

// Focus board for keyboard controls
boardEl.focus();

// Check URL parameters for auto-start
checkURLParams();