(() => {
  // Board configuration object - defines the puzzle layout
  // This structure allows for easy board switching in the future
  
  // Image mode determines how background images are applied:
  // - 'single': One image for entire board
  // - 'horizontal': Two images side by side (left/right halves)
  // - 'vertical': Two images stacked (top/bottom halves)
  
  // Gap Identity System:
  //
  // The `gapIdentities` array defines which board cells are "gap cells" by identity.
  // Each coordinate represents:
  // 1. A cell that acts as a gap in the SOLVED state
  // 2. The background image crop that gap will display (its visual identity)
  // 3. A cell that should NOT have a tile created for it during initialization
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
    gapIdentities: [    // Gap identity positions (array of {x, y})
      {x: 7, y: 6},
      {x: 7, y: 7}
    ],
    largePieces: [      // Large piece top-left corners (array of {x, y})
      {x: 0, y: 0}, {x: 3, y: 0}, {x: 5, y: 0},
      {x: 0, y: 3}, {x: 3, y: 3}, {x: 6, y: 3},
      {x: 0, y: 6}, {x: 5, y: 6}
    ],
    wrapHorizontal: false,  // Enable horizontal wrapping
    wrapVertical: false     // Enable vertical wrapping
  };
  
  const horizontalBoard = {
    width: 16,          // Double width: 16 tiles
    height: 8,          // Same height: 8 tiles
    imageMode: 'horizontal',
    images: {
      primary: 'lightworld.png',   // Left half (x: 0-7)
      secondary: 'darkworld.png'   // Right half (x: 8-15)
    },
    gapIdentities: [    // Gap identity positions in bottom right corner of right half
      {x: 15, y: 6},
      {x: 15, y: 7}
    ],
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
    wrapVertical: false     // Enable vertical wrapping
  };
  
  const verticalBoard = {
    width: 8,           // Same width: 8 tiles
    height: 16,         // Double height: 16 tiles
    imageMode: 'vertical',
    images: {
      primary: 'lightworld.png',   // Top half (y: 0-7)
      secondary: 'darkworld.png'   // Bottom half (y: 8-15)
    },
    gapIdentities: [    // Gap identity positions in bottom right corner of bottom half
      {x: 7, y: 14},
      {x: 7, y: 15}
    ],
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
    wrapVertical: false     // Enable vertical wrapping
  };
  
  // Board registry for easy lookup
  const boardRegistry = {
    'default': defaultBoard,
    'horizontal': horizontalBoard,
    'vertical': verticalBoard
  };
  
  // Currently active board configuration
  let boardConfig = defaultBoard;
  let currentBoardSlug = 'default';
  
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
  const settingsApplyBtn = document.getElementById('settingsApplyBtn');
  const settingsCancelBtn = document.getElementById('settingsCancelBtn');
  const resetGapsBtn = document.getElementById('resetGapsBtn');
  const randomizeGapsBtn = document.getElementById('randomizeGapsBtn');
  const wrapHorizontalCheckbox = document.getElementById('wrapHorizontalCheckbox');
  const wrapVerticalCheckbox = document.getElementById('wrapVerticalCheckbox');
  const displayDialog = document.getElementById('displayDialog');
  const darkModeCheckbox = document.getElementById('darkModeCheckbox');
  const autoScaleCheckbox = document.getElementById('autoScaleCheckbox');
  const challengeAboveCheckbox = document.getElementById('challengeAboveCheckbox');
  const boardSizeSlider = document.getElementById('boardSizeSlider');
  const boardSizeValue = document.getElementById('boardSizeValue');
  const displayCloseBtn = document.getElementById('displayCloseBtn');
  const challengeDialog = document.getElementById('challengeDialog');
  const challengeBoardSelect = document.getElementById('challengeBoardSelect');
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

  // Seeded Random Number Generator (LCG algorithm)
  // This ensures deterministic results across all browsers and operating systems
  class SeededRandom {
    constructor(seed) {
      // Seed must be a number
      this.seed = Number(seed);
      this.current = this.seed;
    }

    // Linear Congruential Generator
    // Using parameters from Numerical Recipes
    next() {
      this.current = (this.current * 1664525 + 1013904223) % 4294967296;
      return this.current / 4294967296;
    }

    // Return random integer between 0 (inclusive) and max (exclusive)
    nextInt(max) {
      return Math.floor(this.next() * max);
    }
  }

  // State - Unified piece system
  // All pieces (including gaps) stored in a single array
  let grid; // 2D array: null=empty; or {type:'small'|'big'|'gap', id, ox, oy}
  let pieces = []; // Unified array: {id, type, isGap, x, y, homeX, homeY, el, innerEl, selected}
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
  let challengeAbove = false; // Challenge box position: false = right side, true = above board

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
   * Normalize coordinates with wrapping
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Object} Normalized {x, y} coordinates
   */
  function normalizeCoords(x, y) {
    let nx = x;
    let ny = y;
    
    if (wrapHorizontal) {
      nx = ((x % boardConfig.width) + boardConfig.width) % boardConfig.width;
    }
    
    if (wrapVertical) {
      ny = ((y % boardConfig.height) + boardConfig.height) % boardConfig.height;
    }
    
    return { x: nx, y: ny };
  }

  /**
   * Check if coordinates are valid (within bounds or wrapping enabled)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} True if valid
   */
  function isValidCoord(x, y) {
    if (wrapHorizontal) {
      // X can be any value with wrapping
      if (y < 0 || y >= boardConfig.height) return false;
    } else {
      if (x < 0 || x >= boardConfig.width || y < 0 || y >= boardConfig.height) return false;
    }
    
    if (wrapVertical) {
      // Y can be any value with wrapping
      if (x < 0 || x >= boardConfig.width) return false;
    } else {
      if (x < 0 || x >= boardConfig.width || y < 0 || y >= boardConfig.height) return false;
    }
    
    return true;
  }

  /**
   * Helper function to create a piece (tile or gap)
   * @param {string} type - 'small', 'big', or 'gap'
   * @param {string} id - Piece ID
   * @param {number} x - X position
   * @param {number} y - Y position
   * @returns {Object} Piece object
   */
  function createPiece(type, id, x, y) {
    const isGap = (type === 'gap');
    const el = document.createElement('div');
    let innerEl = null;
    
    if (isGap) {
      // Gap: create wrapper + inner element
      el.className = 'gap-wrapper';
      innerEl = document.createElement('div');
      innerEl.className = 'gap';
      el.appendChild(innerEl);
    } else {
      // Regular piece
      el.className = `tile ${type}`;
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
      type,
      isGap,
      x,
      y,
      homeX: x,
      homeY: y,
      el,
      innerEl,
      selected: false
    };
  }

  function initTiles() {
    pieces = [];
    pieceById.clear();

    // Make a quick mask for big home coverage
    const covered = [...Array(boardConfig.height)].map(()=>Array(boardConfig.width).fill(false));
    boardConfig.largePieces.forEach(({x,y})=>{
      for(let dy=0; dy<2; dy++){
        for(let dx=0; dx<2; dx++){
          covered[y+dy][x+dx] = true;
        }
      }
    });
    
    // Create big pieces first
    boardConfig.largePieces.forEach((home, i) => {
      const piece = createPiece('big', `B${i}`, home.x, home.y);
      pieces.push(piece);
      pieceById.set(piece.id, piece);
    });

    // Create small pieces AND gaps
    const isGapIdentity = (x,y) => boardConfig.gapIdentities.some(g => g.x===x && g.y===y);
    let sIdx = 0;
    let gIdx = 0;
    for(let y=0; y<boardConfig.height; y++){
      for(let x=0; x<boardConfig.width; x++){
        if(covered[y][x]) continue;
        
        const isGap = isGapIdentity(x,y);
        const type = isGap ? 'gap' : 'small';
        const id = isGap ? `G${gIdx++}` : `S${sIdx++}`;
        
        const piece = createPiece(type, id, x, y);
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
    
    for (const piece of pieces) {
      if (piece.type === 'big') {
        // Big piece occupies 2×2 cells (with wrapping support)
        for(let dy=0; dy<2; dy++) {
          for(let dx=0; dx<2; dx++) {
            const cellPos = normalizeCoords(piece.x + dx, piece.y + dy);
            grid[cellPos.y][cellPos.x] = {
              type: 'big',
              id: piece.id,
              ox: dx,
              oy: dy
            };
          }
        }
      } else {
        // Small piece or gap occupies 1 cell
        grid[piece.y][piece.x] = {
          type: piece.type,  // 'small' or 'gap'
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
    // Find pieces that should be gaps based on board configuration
    // and toggle their isGap flag without moving anything
    
    // First, convert all current gaps to regular pieces
    const currentGaps = pieces.filter(p => p.isGap);
    for (const piece of currentGaps) {
      // Convert gap to tile - keep identity and position
      piece.isGap = false;
      piece.type = 'small';
      
      // Update DOM structure: replace gap-wrapper with tile
      const newEl = document.createElement('div');
      newEl.className = 'tile small';
      
      // Use existing identity for background (homeX, homeY unchanged)
      const { image, bgSize } = getBackgroundStyleForTile(piece.homeX, piece.homeY);
      newEl.style.backgroundImage = `url("${image}")`;
      newEl.style.backgroundSize = bgSize;
      newEl.style.backgroundPosition = getBackgroundPositionCalc(piece.homeX, piece.homeY);
      
      // Replace in DOM
      piece.el.parentNode.replaceChild(newEl, piece.el);
      piece.el = newEl;
      piece.innerEl = null;
      piece.selected = false;
    }
    
    // Now find pieces with the original gap identities and convert them to gaps
    const newGapPieces = [];
    for (const gapIdentity of boardConfig.gapIdentities) {
      // Find the piece with this identity (homeX, homeY)
      const piece = pieces.find(p =>
        p.homeX === gapIdentity.x &&
        p.homeY === gapIdentity.y &&
        (p.type === 'small' || p.type === 'gap')
      );
      
      if (piece) {
        newGapPieces.push(piece);
      }
    }
    
    // Convert selected pieces to gaps - keep their identities and positions
    for (const piece of newGapPieces) {
      // Convert tile to gap - keep identity and position
      piece.isGap = true;
      piece.type = 'gap';
      
      // Update DOM structure: replace tile with gap-wrapper
      const newEl = document.createElement('div');
      newEl.className = 'gap-wrapper';
      const innerEl = document.createElement('div');
      innerEl.className = 'gap';
      newEl.appendChild(innerEl);
      
      // Use existing identity for background (homeX, homeY unchanged)
      const { image, bgSize } = getBackgroundStyleForTile(piece.homeX, piece.homeY);
      innerEl.style.backgroundImage = `url("${image}")`;
      innerEl.style.backgroundSize = bgSize;
      innerEl.style.backgroundPosition = getBackgroundPositionCalc(piece.homeX, piece.homeY);
      
      // Replace in DOM
      piece.el.parentNode.replaceChild(newEl, piece.el);
      piece.el = newEl;
      piece.innerEl = innerEl;
      piece.selected = false;
    }
    
    // Select first gap
    if (newGapPieces.length > 0) {
      newGapPieces[0].selected = true;
    }
    
    // Rebuild grid with new gap positions
    buildGridFromState();
    renderAll();
  }

  /**
   * Shared function to randomize which pieces act as gaps.
   * Toggles isGap flag on pieces to convert between gaps and tiles.
   * @param {Function} randomInt - Random integer function (for seeded or unseeded randomness)
   */
  function performGapRandomization(randomInt) {
    const numGaps = boardConfig.gapIdentities.length;

    // Filter small pieces only (current gaps and small tiles)
    const smallPieces = pieces.filter(p => p.type === 'small' || p.type === 'gap');
    
    // Randomly select which pieces should be gaps
    const shuffled = [...smallPieces];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const newGapPieces = shuffled.slice(0, numGaps);
    
    // Convert all small pieces to regular tiles first
    for (const piece of smallPieces) {
      if (piece.isGap) {
        // Convert gap to tile - keep identity (homeX, homeY)
        piece.isGap = false;
        piece.type = 'small';
        
        // Update DOM structure: replace gap-wrapper with tile
        const newEl = document.createElement('div');
        newEl.className = 'tile small';
        
        // Use existing identity for background (homeX, homeY unchanged)
        const { image, bgSize } = getBackgroundStyleForTile(piece.homeX, piece.homeY);
        newEl.style.backgroundImage = `url("${image}")`;
        newEl.style.backgroundSize = bgSize;
        newEl.style.backgroundPosition = getBackgroundPositionCalc(piece.homeX, piece.homeY);
        
        // Replace in DOM
        piece.el.parentNode.replaceChild(newEl, piece.el);
        piece.el = newEl;
        piece.innerEl = null;
        piece.selected = false;
      }
    }
    
    // Convert selected pieces to gaps - keep their identities
    for (const piece of newGapPieces) {
      // Convert tile to gap - keep identity (homeX, homeY)
      piece.isGap = true;
      piece.type = 'gap';
      
      // DO NOT change homeX/homeY - pieces keep their identities
      
      // Update DOM structure: replace tile with gap-wrapper
      const newEl = document.createElement('div');
      newEl.className = 'gap-wrapper';
      const innerEl = document.createElement('div');
      innerEl.className = 'gap';
      newEl.appendChild(innerEl);
      
      // Use existing identity for background (homeX, homeY unchanged)
      const { image, bgSize } = getBackgroundStyleForTile(piece.homeX, piece.homeY);
      innerEl.style.backgroundImage = `url("${image}")`;
      innerEl.style.backgroundSize = bgSize;
      innerEl.style.backgroundPosition = getBackgroundPositionCalc(piece.homeX, piece.homeY);
      
      // Replace in DOM
      piece.el.parentNode.replaceChild(newEl, piece.el);
      piece.el = newEl;
      piece.innerEl = innerEl;
      piece.selected = false;
    }
    
    // Select first gap
    if (newGapPieces.length > 0) {
      newGapPieces[0].selected = true;
    }

    // Rebuild grid with new gap positions
    buildGridFromState();
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
    performGapRandomization(randomInt);
  }

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
      if (!timerHidden) {
        challengeTimerDisplay.textContent = formatTime(elapsed);
      }
    }
  }

  function startTimer() {
    if (gameMode !== 'challenge') return;
    
    timerStartTime = Date.now();
    timerElapsedTime = 0;
    timerPaused = false;
    
    // Restore timer hidden state from localStorage
    const savedTimerHidden = localStorage.getItem('timerHidden') === 'true';
    timerHidden = savedTimerHidden;
    
    challengeTimerDisplay.textContent = '0:00';
    if (timerHidden) {
      challengeTimerDisplay.style.display = 'none';
      timerShowBtn.style.display = '';
    } else {
      challengeTimerDisplay.style.display = '';
      timerShowBtn.style.display = 'none';
    }
    
    timerToggleBtn.textContent = '⏸';
    timerToggleBtn.setAttribute('aria-label', 'Pause timer');
    timerToggleBtn.setAttribute('title', 'Pause');
    
    if (timerInterval) clearInterval(timerInterval);
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
      // Challenge mode: add seed, steps, board, randomizeGaps, and wrapping parameters
      url.searchParams.set('seed', challengeSeed);
      url.searchParams.set('steps', challengeSteps);
      url.searchParams.set('board', challengeBoard || currentBoardSlug);
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
    renderGaps(); // Restore gap highlighting for Free Play mode
    // Don't reset the board - keep current state
    // Keep wrapping settings from challenge (don't reset wrapHorizontal/wrapVertical)
    
    // Reapply board size since challenge box appearance affects available space
    if (autoFitEnabled) {
      applyBoardSize();
    }
  }

  async function startChallenge(seed, steps, boardSlug = null, randomizeGaps = false, wrapH = false, wrapV = false) {
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
    renderGaps(); // Remove gap selection highlighting immediately
    
    // Wait for animation to complete (80ms transition time)
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Get final time
    const finalTime = challengeTimerDisplay.textContent;
    
    // Show custom congratulations dialog
    congratsMessage.textContent = `You solved the challenge in ${challengeMoveCount} moves and with a time of ${finalTime}!`;
    congratsDialog.style.display = 'flex';
  }

  function renderAll() {
    for (const piece of pieces) {
      // Remove any existing duplicate elements
      const duplicates = boardEl.querySelectorAll(`[data-duplicate-of="${piece.id}"]`);
      duplicates.forEach(dup => dup.remove());
      
      if (piece.type === 'big') {
        // For large pieces with wrapping, we need to render segments based on wrap direction
        // Calculate all 4 cell positions with normalization
        const cells = [
          normalizeCoords(piece.x, piece.y),           // Top-left
          normalizeCoords(piece.x + 1, piece.y),       // Top-right
          normalizeCoords(piece.x, piece.y + 1),       // Bottom-left
          normalizeCoords(piece.x + 1, piece.y + 1)    // Bottom-right
        ];
        
        // Check if piece spans board edges (cells are not contiguous)
        const spansHorizontal = (wrapHorizontal &&
          (Math.abs(cells[0].x - cells[1].x) > 1 || Math.abs(cells[2].x - cells[3].x) > 1));
        const spansVertical = (wrapVertical &&
          (Math.abs(cells[0].y - cells[2].y) > 1 || Math.abs(cells[1].y - cells[3].y) > 1));
        
        if (spansHorizontal && spansVertical) {
          // Piece spans both directions - render as 4 individual 1×1 cells
          piece.el.style.display = 'none';
          
          const offsets = [
            {ox: 0, oy: 0}, // Top-left
            {ox: 1, oy: 0}, // Top-right
            {ox: 0, oy: 1}, // Bottom-left
            {ox: 1, oy: 1}  // Bottom-right
          ];
          
          for (let i = 0; i < 4; i++) {
            const cell = cells[i];
            const offset = offsets[i];
            
            const dup = document.createElement('div');
            dup.className = 'tile big-cell';
            dup.setAttribute('data-duplicate-of', piece.id);
            dup.setAttribute('data-cell-offset', `${offset.ox},${offset.oy}`);
            
            dup.style.left = `${cell.x * tilePx}px`;
            dup.style.top = `${cell.y * tilePx}px`;
            dup.style.width = `${tilePx}px`;
            dup.style.height = `${tilePx}px`;
            
            const { image, bgSize } = getBackgroundStyleForTile(piece.homeX, piece.homeY);
            dup.style.backgroundImage = `url("${image}")`;
            dup.style.backgroundSize = bgSize;
            dup.style.backgroundPosition = getBackgroundPositionCalc(piece.homeX + offset.ox, piece.homeY + offset.oy);
            
            boardEl.appendChild(dup);
          }
        } else if (spansHorizontal) {
          // Piece spans horizontally only - render as 2 vertical strips (1×2 each)
          piece.el.style.display = 'none';
          
          // Left strip (cells 0 and 2: top-left and bottom-left)
          const leftStrip = document.createElement('div');
          leftStrip.className = 'tile big';
          leftStrip.setAttribute('data-duplicate-of', piece.id);
          leftStrip.setAttribute('data-strip', 'left');
          
          leftStrip.style.left = `${cells[0].x * tilePx}px`;
          leftStrip.style.top = `${cells[0].y * tilePx}px`;
          leftStrip.style.width = `${tilePx}px`;
          leftStrip.style.height = `${2 * tilePx}px`;
          
          const { image: imgLeft, bgSize: bgSizeLeft } = getBackgroundStyleForTile(piece.homeX, piece.homeY);
          leftStrip.style.backgroundImage = `url("${imgLeft}")`;
          leftStrip.style.backgroundSize = bgSizeLeft;
          leftStrip.style.backgroundPosition = getBackgroundPositionCalc(piece.homeX, piece.homeY);
          
          boardEl.appendChild(leftStrip);
          
          // Right strip (cells 1 and 3: top-right and bottom-right)
          const rightStrip = document.createElement('div');
          rightStrip.className = 'tile big';
          rightStrip.setAttribute('data-duplicate-of', piece.id);
          rightStrip.setAttribute('data-strip', 'right');
          
          rightStrip.style.left = `${cells[1].x * tilePx}px`;
          rightStrip.style.top = `${cells[1].y * tilePx}px`;
          rightStrip.style.width = `${tilePx}px`;
          rightStrip.style.height = `${2 * tilePx}px`;
          
          const { image: imgRight, bgSize: bgSizeRight } = getBackgroundStyleForTile(piece.homeX, piece.homeY);
          rightStrip.style.backgroundImage = `url("${imgRight}")`;
          rightStrip.style.backgroundSize = bgSizeRight;
          rightStrip.style.backgroundPosition = getBackgroundPositionCalc(piece.homeX + 1, piece.homeY);
          
          boardEl.appendChild(rightStrip);
        } else if (spansVertical) {
          // Piece spans vertically only - render as 2 horizontal strips (2×1 each)
          piece.el.style.display = 'none';
          
          // Top strip (cells 0 and 1: top-left and top-right)
          const topStrip = document.createElement('div');
          topStrip.className = 'tile big';
          topStrip.setAttribute('data-duplicate-of', piece.id);
          topStrip.setAttribute('data-strip', 'top');
          
          topStrip.style.left = `${cells[0].x * tilePx}px`;
          topStrip.style.top = `${cells[0].y * tilePx}px`;
          topStrip.style.width = `${2 * tilePx}px`;
          topStrip.style.height = `${tilePx}px`;
          
          const { image: imgTop, bgSize: bgSizeTop } = getBackgroundStyleForTile(piece.homeX, piece.homeY);
          topStrip.style.backgroundImage = `url("${imgTop}")`;
          topStrip.style.backgroundSize = bgSizeTop;
          topStrip.style.backgroundPosition = getBackgroundPositionCalc(piece.homeX, piece.homeY);
          
          boardEl.appendChild(topStrip);
          
          // Bottom strip (cells 2 and 3: bottom-left and bottom-right)
          const bottomStrip = document.createElement('div');
          bottomStrip.className = 'tile big';
          bottomStrip.setAttribute('data-duplicate-of', piece.id);
          bottomStrip.setAttribute('data-strip', 'bottom');
          
          bottomStrip.style.left = `${cells[2].x * tilePx}px`;
          bottomStrip.style.top = `${cells[2].y * tilePx}px`;
          bottomStrip.style.width = `${2 * tilePx}px`;
          bottomStrip.style.height = `${tilePx}px`;
          
          const { image: imgBottom, bgSize: bgSizeBottom } = getBackgroundStyleForTile(piece.homeX, piece.homeY);
          bottomStrip.style.backgroundImage = `url("${imgBottom}")`;
          bottomStrip.style.backgroundSize = bgSizeBottom;
          bottomStrip.style.backgroundPosition = getBackgroundPositionCalc(piece.homeX, piece.homeY + 1);
          
          boardEl.appendChild(bottomStrip);
        } else {
          // Piece doesn't span edge - render normally as 2×2
          piece.el.style.display = '';
          piece.el.style.left = `${piece.x * tilePx}px`;
          piece.el.style.top = `${piece.y * tilePx}px`;
        }
      } else {
        // Small pieces and gaps - render normally
        piece.el.style.left = `${piece.x * tilePx}px`;
        piece.el.style.top = `${piece.y * tilePx}px`;
        
        // Update selection visual (for gaps only)
        if (piece.isGap) {
          const showSelection = piece.selected && !(gameMode === 'challenge' && challengeSolved);
          piece.el.classList.toggle('selected', showSelection);
        }
      }
    }
  }

  // Helper function for backward compatibility - just calls renderAll
  function renderGaps() {
    renderAll();
  }

  function tryMove(dir, cachedGapPieces = null) {
    // Prevent moves if challenge is solved or timer is paused
    if (gameMode === 'challenge' && (challengeSolved || timerPaused)) {
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
    
    // Get selected gap
    const selectedGap = pieces.find(p => p.isGap && p.selected);
    if (!selectedGap) return false;
    
    // dir: 'up'|'down'|'left'|'right'
    let fromX = selectedGap.x, fromY = selectedGap.y, dx = 0, dy = 0;
    if (dir === 'up') { fromY = selectedGap.y + 1; fromX = selectedGap.x; dx = 0; dy = -1; }
    if (dir === 'down') { fromY = selectedGap.y - 1; fromX = selectedGap.x; dx = 0; dy = 1; }
    if (dir === 'left') { fromX = selectedGap.x + 1; fromY = selectedGap.y; dx = -1; dy = 0; }
    if (dir === 'right'){ fromX = selectedGap.x - 1; fromY = selectedGap.y; dx = 1; dy = 0; }

    // Apply wrapping to source coordinates
    const wrappedFrom = normalizeCoords(fromX, fromY);
    fromX = wrappedFrom.x;
    fromY = wrappedFrom.y;
    
    // Check bounds (with wrapping, coordinates should always be valid after normalization)
    if (!wrapHorizontal && !wrapVertical) {
      // No wrapping: use original boundary check
      if (fromX < 0 || fromX >= boardConfig.width || fromY < 0 || fromY >= boardConfig.height) return false;
    }

    const sourceCell = grid[fromY][fromX];
    if (!sourceCell) return false;
    
    // Determine if we should skip rendering (during shuffle in Challenge Mode)
    const skipRender = isShuffling && gameMode === 'challenge';
    
    // Check if source is another gap (gap swap)
    if (sourceCell.type === 'gap') {
      const otherGap = pieceById.get(sourceCell.id);
      // Swap positions
      [selectedGap.x, selectedGap.y, otherGap.x, otherGap.y] =
        [otherGap.x, otherGap.y, selectedGap.x, selectedGap.y];
      
      // Incremental grid update: just swap the two cells
      grid[selectedGap.y][selectedGap.x] = { type: 'gap', id: selectedGap.id };
      grid[otherGap.y][otherGap.x] = { type: 'gap', id: otherGap.id };
      
      if (!skipRender) renderAll();
      if (gameMode === 'challenge' && !isShuffling) {
        challengeMoveCount++;
        updateMoveCount();
        if (checkWinCondition()) {
          handleWin();
        }
      }
      return true;
    }

    // Regular piece movement (small or big)
    const movingPiece = pieceById.get(sourceCell.id);
    if (!movingPiece) return false;

    if (movingPiece.type === 'small') {
      // Move small piece into the selected gap (with wrapping)
      const newPos = normalizeCoords(movingPiece.x + dx, movingPiece.y + dy);
      movingPiece.x = newPos.x;
      movingPiece.y = newPos.y;

      // Move selected gap to the freed cell
      selectedGap.x = fromX;
      selectedGap.y = fromY;

      // Incremental grid update: swap the two cells
      grid[movingPiece.y][movingPiece.x] = { type: 'small', id: movingPiece.id };
      grid[selectedGap.y][selectedGap.x] = { type: 'gap', id: selectedGap.id };
      
      if (!skipRender) renderAll();
      if (gameMode === 'challenge' && !isShuffling) {
        challengeMoveCount++;
        updateMoveCount();
        if (checkWinCondition()) {
          handleWin();
        }
      }
      return true;
    }

    if (movingPiece.type === 'big') {
      // Determine destination face cells (must be both gaps), and freed cells after move
      let dest = [], freed = [];
      if (dx === 1) { // right
        if (!wrapHorizontal && movingPiece.x + 2 >= boardConfig.width) return false;
        const d1 = normalizeCoords(movingPiece.x+2, movingPiece.y);
        const d2 = normalizeCoords(movingPiece.x+2, movingPiece.y+1);
        dest = [{x:d1.x, y:d1.y}, {x:d2.x, y:d2.y}];
        // Normalize freed cells too
        const f1 = normalizeCoords(movingPiece.x, movingPiece.y);
        const f2 = normalizeCoords(movingPiece.x, movingPiece.y+1);
        freed = [{x:f1.x, y:f1.y}, {x:f2.x, y:f2.y}];
      } else if (dx === -1) { // left
        if (!wrapHorizontal && movingPiece.x - 1 < 0) return false;
        const d1 = normalizeCoords(movingPiece.x-1, movingPiece.y);
        const d2 = normalizeCoords(movingPiece.x-1, movingPiece.y+1);
        dest = [{x:d1.x, y:d1.y}, {x:d2.x, y:d2.y}];
        // Normalize freed cells too
        const f1 = normalizeCoords(movingPiece.x+1, movingPiece.y);
        const f2 = normalizeCoords(movingPiece.x+1, movingPiece.y+1);
        freed = [{x:f1.x, y:f1.y}, {x:f2.x, y:f2.y}];
      } else if (dy === 1) { // down
        if (!wrapVertical && movingPiece.y + 2 >= boardConfig.height) return false;
        const d1 = normalizeCoords(movingPiece.x, movingPiece.y+2);
        const d2 = normalizeCoords(movingPiece.x+1, movingPiece.y+2);
        dest = [{x:d1.x, y:d1.y}, {x:d2.x, y:d2.y}];
        // Normalize freed cells too
        const f1 = normalizeCoords(movingPiece.x, movingPiece.y);
        const f2 = normalizeCoords(movingPiece.x+1, movingPiece.y);
        freed = [{x:f1.x, y:f1.y}, {x:f2.x, y:f2.y}];
      } else if (dy === -1) { // up
        if (!wrapVertical && movingPiece.y - 1 < 0) return false;
        const d1 = normalizeCoords(movingPiece.x, movingPiece.y-1);
        const d2 = normalizeCoords(movingPiece.x+1, movingPiece.y-1);
        dest = [{x:d1.x, y:d1.y}, {x:d2.x, y:d2.y}];
        // Normalize freed cells too
        const f1 = normalizeCoords(movingPiece.x, movingPiece.y+1);
        const f2 = normalizeCoords(movingPiece.x+1, movingPiece.y+1);
        freed = [{x:f1.x, y:f1.y}, {x:f2.x, y:f2.y}];
      }

      // Both dest must be gaps, and the selected gap must be one of them
      const destAreGaps = dest.every(d => {
        const cell = grid[d.y]?.[d.x];
        return cell?.type === 'gap';
      });
      const selectedIsDest = dest.some(d => d.x === selectedGap.x && d.y === selectedGap.y);
      if (!(destAreGaps && selectedIsDest)) return false;

      // Find which gaps are at destination cells
      const gapPieces = cachedGapPieces || pieces.filter(p => p.isGap);
      const gapAt = (c) => gapPieces.find(g => g.x === c.x && g.y === c.y);
      
      const map = [];
      if (dx !== 0) {
        // Align by y
        for (const d of dest) {
          const gap = gapAt(d);
          if (!gap) return false;
          const target = freed.find(f => f.y === d.y);
          map.push({ gap, target });
        }
      } else {
        // dy !== 0, align by x
        for (const d of dest) {
          const gap = gapAt(d);
          if (!gap) return false;
          const target = freed.find(f => f.x === d.x);
          map.push({ gap, target });
        }
      }
      
      // Move the piece (with wrapping)
      const oldPieceX = movingPiece.x;
      const oldPieceY = movingPiece.y;
      const newPos = normalizeCoords(movingPiece.x + dx, movingPiece.y + dy);
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
          const oldCellPos = normalizeCoords(oldPieceX + dx, oldPieceY + dy);
          grid[oldCellPos.y][oldCellPos.x] = null;
        }
      }
      // Set new 2×2 area (with wrapping)
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const newCellPos = normalizeCoords(movingPiece.x + dx, movingPiece.y + dy);
          grid[newCellPos.y][newCellPos.x] = {
            type: 'big',
            id: movingPiece.id,
            ox: dx,
            oy: dy
          };
        }
      }
      // Update gap positions in grid (gaps are already at correct wrapped positions)
      for (const {gap} of map) {
        grid[gap.y][gap.x] = { type: 'gap', id: gap.id };
      }
      
      if (!skipRender) renderAll();
      if (gameMode === 'challenge' && !isShuffling) {
        challengeMoveCount++;
        updateMoveCount();
        if (checkWinCondition()) {
          handleWin();
        }
      }
      return true;
    }

    return false;
  }

  function enumerateValidMoves(gapPieces) {
    const moves = [];
    
    for (const gap of gapPieces) {
      for (const dir of ['up','down','left','right']) {
        let fromX = gap.x, fromY = gap.y;
        if (dir === 'up') fromY = gap.y + 1;
        if (dir === 'down') fromY = gap.y - 1;
        if (dir === 'left') fromX = gap.x + 1;
        if (dir === 'right') fromX = gap.x - 1;
        
        // Check bounds before wrapping (skip if no wrapping and out of bounds)
        if (!wrapHorizontal && (fromX < 0 || fromX >= boardConfig.width)) continue;
        if (!wrapVertical && (fromY < 0 || fromY >= boardConfig.height)) continue;
        
        // Apply wrapping to coordinates
        const wrappedFrom = normalizeCoords(fromX, fromY);
        fromX = wrappedFrom.x;
        fromY = wrappedFrom.y;
        
        const occ = grid[fromY][fromX];
        if (!occ) continue;
        
        // Check if it's a gap swap
        const isGapSwap = (occ.type === 'gap');
        
        if (occ.type === 'small') {
          moves.push({ gap, dir, isBig: false, isGapSwap: false });
        } else if (occ.type === 'big') {
          const piece = pieceById.get(occ.id);
          let dx = 0, dy = 0;
          if (dir === 'up') dy = -1;
          if (dir === 'down') dy = 1;
          if (dir === 'left') dx = -1;
          if (dir === 'right') dx = 1;
          let dest = [];
          if (dx === 1) {
            if (!wrapHorizontal && piece.x + 2 >= boardConfig.width) continue;
            const d1 = normalizeCoords(piece.x+2, piece.y);
            const d2 = normalizeCoords(piece.x+2, piece.y+1);
            dest = [{x:d1.x, y:d1.y}, {x:d2.x, y:d2.y}];
          } else if (dx === -1) {
            if (!wrapHorizontal && piece.x - 1 < 0) continue;
            const d1 = normalizeCoords(piece.x-1, piece.y);
            const d2 = normalizeCoords(piece.x-1, piece.y+1);
            dest = [{x:d1.x, y:d1.y}, {x:d2.x, y:d2.y}];
          } else if (dy === 1) {
            if (!wrapVertical && piece.y + 2 >= boardConfig.height) continue;
            const d1 = normalizeCoords(piece.x, piece.y+2);
            const d2 = normalizeCoords(piece.x+1, piece.y+2);
            dest = [{x:d1.x, y:d1.y}, {x:d2.x, y:d2.y}];
          } else if (dy === -1) {
            if (!wrapVertical && piece.y - 1 < 0) continue;
            const d1 = normalizeCoords(piece.x, piece.y-1);
            const d2 = normalizeCoords(piece.x+1, piece.y-1);
            dest = [{x:d1.x, y:d1.y}, {x:d2.x, y:d2.y}];
          }
          const destAreGaps = dest.every(d => {
            const cell = grid[d.y]?.[d.x];
            return cell?.type === 'gap';
          });
          const selectedIsDest = dest.some(d => d.x === gap.x && d.y === gap.y);
          if (destAreGaps && selectedIsDest) {
            moves.push({ gap, dir, isBig: true, isGapSwap: false });
          }
        } else if (isGapSwap) {
          moves.push({ gap, dir, isBig: false, isGapSwap: true });
        }
      }
    }
    return moves;
  }

  // ============================================================================
  // SHUFFLE ALGORITHM TUNING CONSTANTS
  // ============================================================================
  
  // Adaptive urgency system: tracks moves since last large piece moved
  // Increases bias toward large piece opportunities over time
  const URGENCY_BUILDUP_RATE = 5; // Moves before urgency reaches 1.0 (lower = faster urgency)
  const URGENCY_MAX = 1.0; // Maximum urgency multiplier
  
  // Gap distance heuristic: encourages gaps to move closer as urgency builds
  const DISTANCE_INFLUENCE = 1;           // Multiplier for distance-based weighting (0 = disabled, 1 = full)
  const DISTANCE_WEIGHT_CLOSER = 4;       // Weight multiplier when move brings gaps closer
  const DISTANCE_WEIGHT_FURTHER = 0.25;   // Weight multiplier when move pushes gaps further
  
  // Base weights for move types
  const BIG_PIECE_BASE_WEIGHT = 5;        // Base weight for large piece moves
  const SMALL_PIECE_BASE_WEIGHT = 1;      // Base weight for small piece moves
  const GAP_SWAP_PROBABILITY = 0.1;       // Probability of including gap swaps
  
  // Urgency impact on weights
  const URGENCY_BIG_PIECE_BONUS = 30;     // Additional weight for big pieces at max urgency
  
  // Balance between distance heuristic and adaptive approaches
  const ADAPTIVE_INFLUENCE = 1.0;         // Multiplier for adaptive urgency (0 = disabled, 1 = full)
  
  // ============================================================================
  // SHUFFLE HELPER FUNCTIONS
  // ============================================================================
  
  /**
   * Calculate Manhattan distance between two gaps
   * Takes wrapping into account - uses shortest path
   * @param {Object} gap1 - First gap with x, y
   * @param {Object} gap2 - Second gap with x, y
   * @returns {number} Manhattan distance
   */
  function gapDistance(gap1, gap2) {
    let dx = Math.abs(gap1.x - gap2.x);
    let dy = Math.abs(gap1.y - gap2.y);
    
    // If horizontal wrapping is enabled, use shortest path
    if (wrapHorizontal) {
      const wrapDx = boardConfig.width - dx;
      dx = Math.min(dx, wrapDx);
    }
    
    // If vertical wrapping is enabled, use shortest path
    if (wrapVertical) {
      const wrapDy = boardConfig.height - dy;
      dy = Math.min(dy, wrapDy);
    }
    
    return dx + dy;
  }
  
  /**
   * Calculate weight for a move based on gap distance heuristic
   * Encourages moves that bring gaps closer together as urgency builds
   * @param {Object} move - Move object with gapIdx and dir
   * @param {number} urgency - Current urgency factor (0 to 1)
   * @param {Array} gapPieces - Cached array of gap pieces
   * @returns {number} Weight multiplier for this move
   */
  function calculateDistanceWeight(move, urgency, gapPieces) {
    if (move.isGapSwap || move.isBig || gapPieces.length < 2) {
      return 1.0; // Don't apply heuristic to gap swaps, big piece moves, or single gap
    }
    
    // Calculate current distance between gaps
    const currentDistance = gapDistance(gapPieces[0], gapPieces[1]);
    
    // Predict where the moving gap will be after this move
    const movingGap = move.gap;
    const otherGap = gapPieces.find(g => g !== movingGap);
    if (!otherGap) return 1.0;
    let newX = movingGap.x;
    let newY = movingGap.y;
    
    // Calculate new position based on direction
    // Remember: tryMove direction is inverted (specifies where to look, not where gap moves)
    if (move.dir === 'up') newY++; // Gap moves down (piece from below moves up into gap)
    if (move.dir === 'down') newY--; // Gap moves up
    if (move.dir === 'left') newX++; // Gap moves right
    if (move.dir === 'right') newX--; // Gap moves left
    
    // Normalize new position with wrapping
    const normalizedNew = normalizeCoords(newX, newY);
    newX = normalizedNew.x;
    newY = normalizedNew.y;
    
    // Calculate distance after move using wrapping-aware distance
    const newDistance = gapDistance(normalizedNew, otherGap);
    
    // Determine if move brings gaps closer or pushes them further
    let weight = 1.0;
    if (newDistance < currentDistance) {
      // Move brings gaps closer: apply positive weight scaled by urgency
      weight = 1.0 + (DISTANCE_WEIGHT_CLOSER - 1.0) * urgency * DISTANCE_INFLUENCE;
    } else if (newDistance > currentDistance) {
      // Move pushes gaps further: apply negative weight scaled by urgency
      weight = 1.0 - (1.0 - DISTANCE_WEIGHT_FURTHER) * urgency * DISTANCE_INFLUENCE;
    }
    // If distance unchanged, weight stays 1.0
    
    return weight;
  }
  
  /**
   * Calculate shuffle quality score based on Manhattan distance of large pieces from home
   * Takes wrapping into account - uses shortest path
   * Higher score = more scrambled puzzle
   * @returns {number} Sum of Manhattan distances for all large pieces
   */
  function calculateShuffleScore() {
    let totalDistance = 0;
    
    const bigPieces = pieces.filter(p => p.type === 'big');
    for (const piece of bigPieces) {
      let dx = Math.abs(piece.x - piece.homeX);
      let dy = Math.abs(piece.y - piece.homeY);
      
      // If horizontal wrapping is enabled, use shortest path
      if (wrapHorizontal) {
        const wrapDx = boardConfig.width - dx;
        dx = Math.min(dx, wrapDx);
      }
      
      // If vertical wrapping is enabled, use shortest path
      if (wrapVertical) {
        const wrapDy = boardConfig.height - dy;
        dy = Math.min(dy, wrapDy);
      }
      
      const manhattanDistance = dx + dy;
      totalDistance += manhattanDistance;
    }
    
    return totalDistance;
  }
  
  async function shuffle(steps, seed = null, randomizeGaps = false) {
    shuffleBtn.disabled = true; resetBtn.disabled = true; challengeBtn.disabled = true;
    isShuffling = true; // Set flag to prevent move counting
    
    // In Challenge Mode, disable animations to hide shuffle sequence
    const isChallenge = gameMode === 'challenge';
    if (isChallenge) {
      boardEl.classList.add('no-transitions');
    }
    
    // Create random number generator (seeded or random)
    // Combine seed, steps, and board to create a unique seed for this shuffle
    // This ensures that changing any parameter produces a different shuffle
    // Using XOR with bit shifting to avoid overflow and ensure good bit mixing
    // Board hash: default=0, horizontal=1, vertical=2 (shifted left by 24 bits)
    const boardHash = currentBoardSlug === 'horizontal' ? 1 : currentBoardSlug === 'vertical' ? 2 : 0;
    const combinedSeed = seed !== null ? ((seed ^ (steps << 16) ^ (boardHash << 24) ^ (randomizeGaps << 12) ^ (wrapHorizontal << 13) ^ (wrapVertical << 14)) >>> 0) : null;
    const rng = combinedSeed !== null ? new SeededRandom(combinedSeed) : null;
    const random = () => rng ? rng.next() : Math.random();
    const randomInt = (max) => rng ? rng.nextInt(max) : Math.floor(Math.random() * max);
    
    // If randomizeGaps is enabled, use the shared gap randomization function
    if (randomizeGaps) {
      performGapRandomization(randomInt);
    }
    
    let lastMove = null; // Remember last move to avoid immediate reversal
    let movesSinceLastBigPiece = 0; // Track moves since last large piece moved (adaptive urgency)
    
    // Cache gap pieces once at the start to avoid repeated filtering
    let cachedGapPieces = pieces.filter(p => p.isGap);
    
    try {
      for (let i=0; i<steps; i++) {
        const moves = enumerateValidMoves(cachedGapPieces);
        if (moves.length === 0) break;
        
        // Filter out the reverse of the last move if there are other options
        let filteredMoves = moves;
        if (lastMove !== null) {
          const reverseDir = {
            'up': 'down',
            'down': 'up',
            'left': 'right',
            'right': 'left'
          };
          const reverse = reverseDir[lastMove.dir];
          const nonReverseMoves = moves.filter(m =>
            !(m.gap === lastMove.gap && m.dir === reverse)
          );
          // Only use filtered moves if there are alternatives
          if (nonReverseMoves.length > 0) {
            filteredMoves = nonReverseMoves;
          }
        }
        
        // ====================================================================
        // HYBRID SHUFFLE WEIGHTING SYSTEM
        // Combines gap distance heuristic with adaptive urgency
        // ====================================================================
        
        // Calculate urgency factor (0 to URGENCY_MAX)
        const urgency = Math.min(movesSinceLastBigPiece / URGENCY_BUILDUP_RATE, URGENCY_MAX) * ADAPTIVE_INFLUENCE;
        
        // Create weighted array with hybrid priorities
        const weightedMoves = [];
        const hasNonGapSwapMoves = filteredMoves.some(m => !m.isGapSwap);
        
        for (const move of filteredMoves) {
          if (move.isBig) {
            // Big piece moves: base weight + urgency bonus
            const bigWeight = BIG_PIECE_BASE_WEIGHT + Math.floor(urgency * URGENCY_BIG_PIECE_BONUS);
            for (let i = 0; i < bigWeight; i++) {
              weightedMoves.push(move);
            }
            
          } else if (move.isGapSwap) {
            // Gap swaps: only if no other moves, or with low probability
            if (!hasNonGapSwapMoves) {
              weightedMoves.push(move);
            } else if (random() < GAP_SWAP_PROBABILITY) {
              weightedMoves.push(move);
            }
            
          } else {
            // Small piece moves: apply distance heuristic + urgency adjustment
            
            let weight = SMALL_PIECE_BASE_WEIGHT;
            
            // Apply distance-based weighting (encourages gaps to move closer as urgency builds)
            if (DISTANCE_INFLUENCE > 0) {
              const distanceWeight = calculateDistanceWeight(move, urgency, cachedGapPieces);
              weight *= distanceWeight;
            }
            
            // Apply urgency: as urgency increases, all small piece moves get boosted
            if (ADAPTIVE_INFLUENCE > 0) {
              weight *= (1 + urgency);
            }
            
            // Add move to weighted array based on calculated weight
            const count = Math.max(1, Math.round(weight));
            for (let i = 0; i < count; i++) {
              weightedMoves.push(move);
            }
          }
        }
        
        // If weighted moves is empty (rare edge case), fall back to filtered moves
        if (weightedMoves.length === 0) {
          weightedMoves.push(...filteredMoves);
        }
        
        const m = weightedMoves[randomInt(weightedMoves.length)];
        
        // Select the gap for this move
        pieces.forEach(p => p.selected = false);
        m.gap.selected = true;
        
        tryMove(m.dir, cachedGapPieces);
        lastMove = m; // Remember this move for next iteration
        
        // Update urgency tracker
        if (m.isBig) {
          movesSinceLastBigPiece = 0; // Reset urgency when big piece moves
        } else {
          movesSinceLastBigPiece++; // Increase urgency
        }
        
        // Only yield to UI in Free Play mode (for animation visibility)
        // In Challenge Mode, run at full speed without delays
        if (!isChallenge && (i < 40 || i % 10 === 0)) {
          await new Promise(r=>setTimeout(r, 0));
        }
      }
    } finally {
      // Re-enable transitions after shuffle completes
      if (isChallenge) {
        boardEl.classList.remove('no-transitions');
      }
      
      // Randomly select one of the gaps to hide which was used last
      // Reuse cached gap pieces if available, otherwise filter
      const gapPieces = cachedGapPieces;
      if (gapPieces.length > 0) {
        const randomGapIdx = randomInt(gapPieces.length);
        pieces.forEach(p => p.selected = false);
        gapPieces[randomGapIdx].selected = true;
      }
      buildGridFromState();
      renderAll();
      
      isShuffling = false; // Clear flag after shuffle completes
      shuffleBtn.disabled = false; resetBtn.disabled = false; challengeBtn.disabled = false;
      
      // Calculate and log shuffle quality score
      const shuffleScore = calculateShuffleScore();
      console.log(`Shuffle complete. Score: ${shuffleScore} (sum of Manhattan distances for large pieces)`);
    }
  }

  // Event listeners
  boardEl.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      // Prevent gap switching if challenge is solved or timer is paused
      if (gameMode === 'challenge' && (challengeSolved || timerPaused)) {
        return;
      }
      // Toggle selection between gaps
      const gapPieces = pieces.filter(p => p.isGap);
      const currentlySelected = gapPieces.find(g => g.selected);
      if (currentlySelected && gapPieces.length > 1) {
        const currentIdx = gapPieces.indexOf(currentlySelected);
        const nextIdx = (currentIdx + 1) % gapPieces.length;
        gapPieces.forEach((g, i) => g.selected = (i === nextIdx));
        renderAll();
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
      tryMove(dir);
    }
  });

  // ============================================================================
  // SHARED UTILITY FUNCTIONS FOR MOUSE CONTROLS
  // ============================================================================
  
  /**
   * Get all cells that should be checked for a tile (1 for small, 4 for big)
   * Normalizes coordinates for wrapped pieces
   * @param {Object} tile - The tile object
   * @param {Object} clickedCell - The grid cell data
   * @param {number} gridX - Grid X coordinate (for small pieces)
   * @param {number} gridY - Grid Y coordinate (for small pieces)
   * @returns {Array} Array of {x, y} cell coordinates
   */
  function getCellsForTile(tile, clickedCell, gridX, gridY) {
    if (clickedCell.type === 'big') {
      // For big pieces, normalize all 4 cell coordinates
      const c1 = normalizeCoords(tile.x, tile.y);
      const c2 = normalizeCoords(tile.x + 1, tile.y);
      const c3 = normalizeCoords(tile.x, tile.y + 1);
      const c4 = normalizeCoords(tile.x + 1, tile.y + 1);
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
   * @param {Array} cells - Array of {x, y} cell coordinates to check
   * @returns {Array} Array of {gap, dx, dy} for each adjacent gap
   */
  function findAdjacentGaps(cells) {
    const gapPieces = pieces.filter(p => p.isGap);
    const result = [];
    
    for (const gap of gapPieces) {
      for (const cell of cells) {
        const dx = gap.x - cell.x;
        const dy = gap.y - cell.y;
        
        // Check direct adjacency
        if ((Math.abs(dx) === 1 && dy === 0) || (dx === 0 && Math.abs(dy) === 1)) {
          result.push({ gap, dx, dy });
          break; // Only add each gap once
        }
        
        // Check wrapped adjacency if wrapping is enabled
        if (wrapHorizontal) {
          // Check if gap wraps around horizontally
          if (cell.x === boardConfig.width - 1 && gap.x === 0 && dy === 0) {
            // Gap is at left edge, cell is at right edge (gap is "to the right" via wrapping)
            result.push({ gap, dx: 1, dy: 0 });
            break;
          }
          if (cell.x === 0 && gap.x === boardConfig.width - 1 && dy === 0) {
            // Gap is at right edge, cell is at left edge (gap is "to the left" via wrapping)
            result.push({ gap, dx: -1, dy: 0 });
            break;
          }
        }
        
        if (wrapVertical) {
          // Check if gap wraps around vertically
          if (cell.y === boardConfig.height - 1 && gap.y === 0 && dx === 0) {
            // Gap is at top edge, cell is at bottom edge (gap is "below" via wrapping)
            result.push({ gap, dx: 0, dy: 1 });
            break;
          }
          if (cell.y === 0 && gap.y === boardConfig.height - 1 && dx === 0) {
            // Gap is at bottom edge, cell is at top edge (gap is "above" via wrapping)
            result.push({ gap, dx: 0, dy: -1 });
            break;
          }
        }
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
   * @returns {boolean} True if in valid region
   */
  function isInValidDragRegion(mouseX, mouseY, sourceDx, sourceDy) {
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
   * @param {Array} cells - Array of {x, y} cell coordinates
   * @param {Object} gap - Gap object with x, y
   * @param {string} swipeDir - Swipe direction ('up'/'down'/'left'/'right')
   * @returns {boolean} True if gap is in swipe direction
   */
  function isGapInSwipeDirection(cells, gap, swipeDir) {
    for (const cell of cells) {
      let dx = gap.x - cell.x;
      let dy = gap.y - cell.y;
      
      // Check direct adjacency first
      if (swipeDir === 'right' && dx === 1 && dy === 0) return true;
      if (swipeDir === 'left' && dx === -1 && dy === 0) return true;
      if (swipeDir === 'down' && dx === 0 && dy === 1) return true;
      if (swipeDir === 'up' && dx === 0 && dy === -1) return true;
      
      // Check wrapped adjacency if wrapping is enabled
      if (wrapHorizontal) {
        // Check if gap wraps around horizontally
        if (swipeDir === 'right' && cell.x === boardConfig.width - 1 && gap.x === 0 && dy === 0) return true;
        if (swipeDir === 'left' && cell.x === 0 && gap.x === boardConfig.width - 1 && dy === 0) return true;
      }
      
      if (wrapVertical) {
        // Check if gap wraps around vertically
        if (swipeDir === 'down' && cell.y === boardConfig.height - 1 && gap.y === 0 && dx === 0) return true;
        if (swipeDir === 'up' && cell.y === 0 && gap.y === boardConfig.height - 1 && dx === 0) return true;
      }
    }
    return false;
  }

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
  let dragControlUsed = false; // Flag to disable swipe controls after drag control is used

  // Helper function to get position from either mouse or touch event
  function getEventPosition(e) {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    } else {
      return { x: e.clientX, y: e.clientY };
    }
  }

  function handlePointerStart(e) {
    // Prevent pointer start if challenge is solved
    if (gameMode === 'challenge' && challengeSolved) {
      return;
    }

    // Get pointer position
    const pos = getEventPosition(e);
    
    // Get mouse position relative to board
    const rect = boardEl.getBoundingClientRect();
    const clickX = pos.x - rect.left;
    const clickY = pos.y - rect.top;
    
    // Convert to grid coordinates
    const gridX = Math.floor(clickX / tilePx);
    const gridY = Math.floor(clickY / tilePx);
    
    // Check bounds
    if (gridX < 0 || gridX >= boardConfig.width || gridY < 0 || gridY >= boardConfig.height) {
      return;
    }

    // Store pointer down position and time
    mouseDownPos = { x: pos.x, y: pos.y };
    mouseDownTime = Date.now();
    mouseDownGridPos = { x: gridX, y: gridY };
    
    // Store which gap was selected before this pointer down
    const selectedGap = pieces.find(p => p.isGap && p.selected);
    mouseDownSelectedGapIdx = selectedGap ? pieces.filter(p => p.isGap).indexOf(selectedGap) : 0;
    
    lastDragGapPos = null; // Reset drag tracking for new drag session
    dragControlUsed = false; // Reset drag control flag for new drag session
    
    // Check if we clicked on a gap and select it
    const clickedGap = pieces.find(p => p.isGap && p.x === gridX && p.y === gridY);
    if (clickedGap) {
      pieces.forEach(p => p.selected = false);
      clickedGap.selected = true;
      renderAll();
    }
  }

  boardEl.addEventListener('mousedown', (e) => {
    handlePointerStart(e);
  });
  
  boardEl.addEventListener('touchstart', (e) => {
    // Prevent scrolling on touch devices
    e.preventDefault();
    handlePointerStart(e.touches[0]);
  }, { passive: false });

  // Unified pointer move handler for both mouse and touch events
  function handlePointerMove(e) {
    // Only process if we have a valid mousedown
    if (!mouseDownPos || !mouseDownTime || !mouseDownGridPos) {
      return;
    }

    // Prevent move if challenge is solved
    if (gameMode === 'challenge' && challengeSolved) {
      return;
    }

    // Get current pointer position
    const pos = getEventPosition(e);
    
    // Get position relative to board
    const rect = boardEl.getBoundingClientRect();
    const currentX = pos.x - rect.left;
    const currentY = pos.y - rect.top;
    
    // Convert to grid coordinates
    const currentGridX = Math.floor(currentX / tilePx);
    const currentGridY = Math.floor(currentY / tilePx);
    
    // Check if we started on a gap
    const startCell = grid[mouseDownGridPos.y][mouseDownGridPos.x];
    const startedOnGap = startCell?.type === 'gap';
    
    if (startedOnGap) {
      // GAP DRAG CONTROL: Started on a gap, check if we're over a piece or the other gap
      if (currentGridX >= 0 && currentGridX < boardConfig.width && currentGridY >= 0 && currentGridY < boardConfig.height) {
        const currentCell = grid[currentGridY][currentGridX];
        
        // Check if we're over the other gap
        const startGap = pieces.find(p => p.isGap && p.x === mouseDownGridPos.x && p.y === mouseDownGridPos.y);
        if (!startGap) return; // Safety check
        
        const gapPieces = pieces.filter(p => p.isGap);
        const otherGap = gapPieces.find(g => g !== startGap);
        
        if (currentCell?.type === 'gap' && otherGap && otherGap.x === currentGridX && otherGap.y === currentGridY) {
          // We're over the other gap - check if it's adjacent
          const dx = currentGridX - mouseDownGridPos.x;
          const dy = currentGridY - mouseDownGridPos.y;
          
          if ((Math.abs(dx) === 1 && dy === 0) || (dx === 0 && Math.abs(dy) === 1)) {
            // Other gap is adjacent - swap them
            const gapPosKey = `${currentGridX},${currentGridY}`;
            
            if (lastDragGapPos !== gapPosKey) {
              const swapDir = vectorToDirection(dx, dy, true); // Invert for gap swap
              
              if (swapDir) {
                const moveSuccess = tryMove(swapDir);
                
                if (moveSuccess) {
                  dragControlUsed = true;
                  lastDragGapPos = gapPosKey;
                  // Clear any swipe preview
                  if (swipePreviewActive && swipePreviewTile) {
                    swipePreviewTile.el.style.transform = '';
                    swipePreviewActive = false;
                    swipePreviewTile = null;
                    swipePreviewOffset = { x: 0, y: 0 };
                  }
                  // Update mouseDownGridPos to the new gap position after the swap
                  const selectedGap = pieces.find(p => p.isGap && p.selected);
                  if (selectedGap) {
                    mouseDownGridPos = { x: selectedGap.x, y: selectedGap.y };
                  }
                }
              }
            }
          }
        } else if (currentCell !== null) {
          // We're over a piece - check if it's in the valid drag region
          const cellX = currentX - (currentGridX * tilePx);
          const cellY = currentY - (currentGridY * tilePx);
          
          const piece = pieceById.get(currentCell.id);
          if (piece) {
            // Get cells to check for adjacency
            const cellsToCheck = getCellsForTile(piece, currentCell, currentGridX, currentGridY);
            
            // Find if piece is adjacent to gap and check valid drag region
            let isAdjacent = false;
            let adjacentDir = null;
            
            for (const cell of cellsToCheck) {
              const dx = cell.x - mouseDownGridPos.x;
              const dy = cell.y - mouseDownGridPos.y;
              
              if ((Math.abs(dx) === 1 && dy === 0) || (dx === 0 && Math.abs(dy) === 1)) {
                isAdjacent = true;
                // Check if mouse is in valid drag region
                if (isInValidDragRegion(cellX, cellY, dx, dy)) {
                  adjacentDir = vectorToDirection(dx, dy, true); // Invert for gap drag
                }
                break;
              }
            }
            
            if (isAdjacent && adjacentDir) {
              const piecePosKey = `${currentGridX},${currentGridY}`;
              
              // Only trigger move if this is a different piece than the last one we dragged over
              if (lastDragGapPos !== piecePosKey) {
                const moveSuccess = tryMove(adjacentDir);
                
                if (moveSuccess) {
                  dragControlUsed = true;
                  lastDragGapPos = piecePosKey;
                  // Clear any swipe preview
                  if (swipePreviewActive && swipePreviewTile) {
                    swipePreviewTile.el.style.transform = '';
                    swipePreviewActive = false;
                    swipePreviewTile = null;
                    swipePreviewOffset = { x: 0, y: 0 };
                  }
                  // Update mouseDownGridPos to the new gap position after the move
                  const selectedGap = pieces.find(p => p.isGap && p.selected);
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
      if (currentGridX >= 0 && currentGridX < boardConfig.width && currentGridY >= 0 && currentGridY < boardConfig.height) {
        const currentCell = grid[currentGridY][currentGridX];
        
        if (currentCell?.type === 'gap') {
          // We're over a gap - check if it's in the valid drag region
          const cellX = currentX - (currentGridX * tilePx);
          const cellY = currentY - (currentGridY * tilePx);
          
          const clickedCell = grid[mouseDownGridPos.y][mouseDownGridPos.x];
          if (clickedCell) {
            const piece = pieceById.get(clickedCell.id);
            if (piece) {
              // Get cells to check for adjacency
              const cellsToCheck = getCellsForTile(piece, clickedCell, mouseDownGridPos.x, mouseDownGridPos.y);
              
              // Find if gap is adjacent to piece and check valid drag region
              let isAdjacent = false;
              let adjacentDir = null;
              
              for (const cell of cellsToCheck) {
                const dx = currentGridX - cell.x;
                const dy = currentGridY - cell.y;
                
                if ((Math.abs(dx) === 1 && dy === 0) || (dx === 0 && Math.abs(dy) === 1)) {
                  isAdjacent = true;
                  // Check if mouse is in valid drag region (exclude edge closest to piece)
                  if (isInValidDragRegion(cellX, cellY, dx, dy)) {
                    adjacentDir = vectorToDirection(dx, dy, false); // Normal direction for piece drag
                  }
                  break;
                }
              }
              
              if (isAdjacent && adjacentDir) {
               const gapPosKey = `${currentGridX},${currentGridY}`;
               
               // Only trigger move if this is a different gap than the last one we dragged over
               if (lastDragGapPos !== gapPosKey) {
                 const gap = pieces.find(p => p.isGap && p.x === currentGridX && p.y === currentGridY);
                 if (gap) {
                   pieces.forEach(p => p.selected = false);
                   gap.selected = true;
                   const moveSuccess = tryMove(adjacentDir);
                    
                    if (moveSuccess) {
                      dragControlUsed = true;
                      lastDragGapPos = gapPosKey;
                      if (swipePreviewActive && swipePreviewTile) {
                        swipePreviewTile.el.style.transform = '';
                        swipePreviewActive = false;
                        swipePreviewTile = null;
                        swipePreviewOffset = { x: 0, y: 0 };
                      }
                      mouseDownGridPos = { x: currentGridX, y: currentGridY };
                    }
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
        const clickedCell = grid[gridY][gridX];

        if (!clickedCell || clickedCell.type === 'gap') {
          // Swiping on a gap - check for adjacent piece or other gap
          let targetX = gridX, targetY = gridY;
          if (swipeDir === 'right') targetX++;
          else if (swipeDir === 'left') targetX--;
          else if (swipeDir === 'down') targetY++;
          else if (swipeDir === 'up') targetY--;
          
          if (targetX >= 0 && targetX < boardConfig.width && targetY >= 0 && targetY < boardConfig.height) {
            const targetCell = grid[targetY][targetX];
            
            // Check if target is the other gap
            const clickedGap = pieces.find(p => p.isGap && p.x === gridX && p.y === gridY);
            const gapPieces = pieces.filter(p => p.isGap);
            const otherGap = gapPieces.find(g => g !== clickedGap);
            const isOtherGap = (targetCell?.type === 'gap' && otherGap && otherGap.x === targetX && otherGap.y === targetY);
            
            if (isOtherGap) {
              // No preview for gap swaps
              if (swipePreviewActive && swipePreviewTile) {
                swipePreviewTile.el.style.transform = '';
                swipePreviewActive = false;
                swipePreviewTile = null;
                swipePreviewOffset = { x: 0, y: 0 };
              }
            } else if (targetCell && targetCell.type !== 'gap') {
              // Show preview for piece moving into gap
              const piece = pieceById.get(targetCell.id);
              if (piece) {
                if (swipePreviewActive && swipePreviewTile && swipePreviewTile !== piece) {
                  swipePreviewTile.el.style.transform = '';
                }
                
                const previewOffset = 15;
                let offsetX = 0, offsetY = 0;
                
                // Piece moves opposite to swipe direction
                if (swipeDir === 'right') offsetX = -previewOffset;
                if (swipeDir === 'left') offsetX = previewOffset;
                if (swipeDir === 'down') offsetY = -previewOffset;
                if (swipeDir === 'up') offsetY = previewOffset;
                
                swipePreviewActive = true;
                swipePreviewTile = piece;
                swipePreviewOffset = { x: offsetX, y: offsetY };
                piece.el.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
              }
            } else {
              // Clear preview if no valid target
              if (swipePreviewActive && swipePreviewTile) {
                swipePreviewTile.el.style.transform = '';
                swipePreviewActive = false;
                swipePreviewTile = null;
                swipePreviewOffset = { x: 0, y: 0 };
              }
            }
          }
          return;
        }

        // Swiping on a piece
        const piece = pieceById.get(clickedCell.id);
        if (!piece) return;

        const cellsToCheck = getCellsForTile(piece, clickedCell, gridX, gridY);
        
        // Check if move would be valid
        let validSwipe = false;
        
        if (piece.type === 'small') {
          // For small pieces, just check if any gap is in swipe direction
          const gapPieces = pieces.filter(p => p.isGap);
          validSwipe = gapPieces.some(gap => isGapInSwipeDirection(cellsToCheck, gap, swipeDir));
        } else if (piece.type === 'big') {
          // For big pieces, need to verify BOTH destination cells are gaps
          // Calculate destination cells based on swipe direction
          let dx = 0, dy = 0;
          if (swipeDir === 'right') dx = 1;
          else if (swipeDir === 'left') dx = -1;
          else if (swipeDir === 'down') dy = 1;
          else if (swipeDir === 'up') dy = -1;
          
          // Calculate destination face cells with wrapping support
          let destCells = [];
          if (dx === 1) { // right
            if (!wrapHorizontal && piece.x + 2 >= boardConfig.width) {
              // No wrapping and out of bounds
              destCells = [];
            } else {
              const d1 = normalizeCoords(piece.x + 2, piece.y);
              const d2 = normalizeCoords(piece.x + 2, piece.y + 1);
              destCells = [{x: d1.x, y: d1.y}, {x: d2.x, y: d2.y}];
            }
          } else if (dx === -1) { // left
            if (!wrapHorizontal && piece.x - 1 < 0) {
              // No wrapping and out of bounds
              destCells = [];
            } else {
              const d1 = normalizeCoords(piece.x - 1, piece.y);
              const d2 = normalizeCoords(piece.x - 1, piece.y + 1);
              destCells = [{x: d1.x, y: d1.y}, {x: d2.x, y: d2.y}];
            }
          } else if (dy === 1) { // down
            if (!wrapVertical && piece.y + 2 >= boardConfig.height) {
              // No wrapping and out of bounds
              destCells = [];
            } else {
              const d1 = normalizeCoords(piece.x, piece.y + 2);
              const d2 = normalizeCoords(piece.x + 1, piece.y + 2);
              destCells = [{x: d1.x, y: d1.y}, {x: d2.x, y: d2.y}];
            }
          } else if (dy === -1) { // up
            if (!wrapVertical && piece.y - 1 < 0) {
              // No wrapping and out of bounds
              destCells = [];
            } else {
              const d1 = normalizeCoords(piece.x, piece.y - 1);
              const d2 = normalizeCoords(piece.x + 1, piece.y - 1);
              destCells = [{x: d1.x, y: d1.y}, {x: d2.x, y: d2.y}];
            }
          }
          
          // Check if both destination cells are gaps
          if (destCells.length === 2) {
            const destAreGaps = destCells.every(d => grid[d.y][d.x]?.type === 'gap');
            validSwipe = destAreGaps;
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
          if (swipePreviewActive && swipePreviewTile) {
            swipePreviewTile.el.style.transform = '';
            swipePreviewActive = false;
            swipePreviewTile = null;
            swipePreviewOffset = { x: 0, y: 0 };
          }
        }
      } else {
        // Below threshold, clear preview
        if (swipePreviewActive && swipePreviewTile) {
          swipePreviewTile.el.style.transform = '';
          swipePreviewActive = false;
          swipePreviewTile = null;
          swipePreviewOffset = { x: 0, y: 0 };
        }
      }
    }
  }

  boardEl.addEventListener('mousemove', handlePointerMove);
  
  boardEl.addEventListener('touchmove', (e) => {
    // Prevent scrolling during touch move
    if (mouseDownPos) {
      e.preventDefault();
    }
    handlePointerMove(e);
  }, { passive: false });

  // Unified pointer end handler for both mouse and touch events
  function handlePointerEnd(e) {
    // Prevent pointer end if challenge is solved
    if (gameMode === 'challenge' && challengeSolved) {
      mouseDownPos = null;
      mouseDownTime = null;
      mouseDownGridPos = null;
      mouseDownSelectedGapIdx = null;
      lastDragGapPos = null;
      dragControlUsed = false;
      return;
    }

    // Check if we have a valid pointer down
    if (!mouseDownPos || !mouseDownTime || !mouseDownGridPos) {
      return;
    }

    // Clear swipe preview
    if (swipePreviewActive && swipePreviewTile) {
      swipePreviewTile.el.style.transform = '';
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

    // Check if clicked on a gap
    const clickedGap = pieces.find(p => p.isGap && p.x === gridX && p.y === gridY);
    const gapPieces = pieces.filter(p => p.isGap);
    const clickedGapIdx = clickedGap ? gapPieces.indexOf(clickedGap) : -1;
    
    // Store whether this gap was already selected BEFORE mousedown changed it
    const wasAlreadySelected = (mouseDownSelectedGapIdx === clickedGapIdx);
    
    // Reset tracking
    mouseDownPos = null;
    mouseDownTime = null;
    mouseDownGridPos = null;
    mouseDownSelectedGapIdx = null;
    lastDragGapPos = null;
    dragControlUsed = false;

    if (clickedGap) {
      // Clicked on a gap
      
      if (swipeDir) {
        // Swipe detected - handle swipe behavior
        pieces.forEach(p => p.selected = false);
        clickedGap.selected = true;
        
        // Check if another gap is adjacent in the swipe direction
        const otherGap = gapPieces.find(g => g !== clickedGap);
        if (!otherGap) return;
        
        const dx = otherGap.x - gridX;
        const dy = otherGap.y - gridY;
        
        // Check if other gap is adjacent and in swipe direction
        // tryMove direction is OPPOSITE of where the gap is (it's the direction things move INTO the gap)
        let gapSwapDir = null;
        if (swipeDir === 'right' && dx === 1 && dy === 0) gapSwapDir = 'left';   // other gap is right, so move from left
        if (swipeDir === 'left' && dx === -1 && dy === 0) gapSwapDir = 'right';  // other gap is left, so move from right
        if (swipeDir === 'down' && dx === 0 && dy === 1) gapSwapDir = 'up';      // other gap is down, so move from up
        if (swipeDir === 'up' && dx === 0 && dy === -1) gapSwapDir = 'down';     // other gap is up, so move from down
        
        if (gapSwapDir) {
          // Swap gaps
          tryMove(gapSwapDir);
          return;
        } else {
          // Swipe on gap - move adjacent piece in the OPPOSITE direction into the gap
          // (we're pulling the piece toward us, not pushing the gap away)
          const reverseDir = {
            'up': 'down',
            'down': 'up',
            'left': 'right',
            'right': 'left'
          };
          tryMove(reverseDir[swipeDir]);
          return;
        }
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
          if (wrapHorizontal) {
            // Check if gap wraps around horizontally
            if (gridX === boardConfig.width - 1 && g.x === 0 && dy === 0) return true; // Gap at left edge, clicked gap at right edge
            if (gridX === 0 && g.x === boardConfig.width - 1 && dy === 0) return true; // Gap at right edge, clicked gap at left edge
          }
          
          if (wrapVertical) {
            // Check if gap wraps around vertically
            if (gridY === boardConfig.height - 1 && g.y === 0 && dx === 0) return true; // Gap at top edge, clicked gap at bottom edge
            if (gridY === 0 && g.y === boardConfig.height - 1 && dx === 0) return true; // Gap at bottom edge, clicked gap at top edge
          }
          
          return false;
        });
        
        // Only swap if exactly one gap is adjacent (unambiguous)
        if (adjacentGaps.length === 1) {
          const otherGap = adjacentGaps[0];
          let dx = otherGap.x - gridX;
          let dy = otherGap.y - gridY;
          
          // Adjust dx/dy for wrapped adjacency
          if (wrapHorizontal) {
            if (gridX === boardConfig.width - 1 && otherGap.x === 0) dx = 1; // Wrapped right
            if (gridX === 0 && otherGap.x === boardConfig.width - 1) dx = -1; // Wrapped left
          }
          if (wrapVertical) {
            if (gridY === boardConfig.height - 1 && otherGap.y === 0) dy = 1; // Wrapped down
            if (gridY === 0 && otherGap.y === boardConfig.height - 1) dy = -1; // Wrapped up
          }
          
          // Determine swap direction (tryMove direction is OPPOSITE of where the gap is)
          let gapSwapDir = null;
          if (dx === 1 && dy === 0) gapSwapDir = 'left';   // other gap is right, so move from left
          if (dx === -1 && dy === 0) gapSwapDir = 'right';  // other gap is left, so move from right
          if (dx === 0 && dy === 1) gapSwapDir = 'up';      // other gap is down, so move from up
          if (dx === 0 && dy === -1) gapSwapDir = 'down';   // other gap is up, so move from down
          
          if (gapSwapDir) {
            tryMove(gapSwapDir);
          }
        }
        // If 0 or 2+ adjacent gaps, do nothing (ambiguous or impossible)
        return;
      } else if (!mouseMoved) {
        // Gap was not selected - just select it (only if mouse didn't move)
        pieces.forEach(p => p.selected = false);
        clickedGap.selected = true;
        renderAll();
        return;
      } else {
        // Mouse moved, don't process as click
        return;
      }
    }
    
    // Check what's at the clicked position
    const clickedCell = grid[gridY][gridX];
    if (!clickedCell) return; // No piece at clicked position
    
    const piece = pieceById.get(clickedCell.id);
    if (!piece) return;
    
    // Get cells to check for adjacency
    const cellsToCheck = getCellsForTile(piece, clickedCell, gridX, gridY);
    
    // Find which gaps are adjacent
    const adjacentGaps = findAdjacentGaps(cellsToCheck);
    
    // Determine which gap to use
    let targetGap = null;
    let targetDx = 0, targetDy = 0;

    if (swipeDir) {
      // Swipe detected - use gap in swipe direction
      for (const {gap, dx, dy} of adjacentGaps) {
        if (isGapInSwipeDirection(cellsToCheck, gap, swipeDir)) {
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
        const selectedGap = pieces.find(p => p.isGap && p.selected);
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
    pieces.forEach(p => p.selected = false);
    targetGap.selected = true;
    const dir = vectorToDirection(targetDx, targetDy, false);
    if (dir) {
      tryMove(dir);
    }
  }

  document.addEventListener('mouseup', handlePointerEnd);
  
  document.addEventListener('touchend', (e) => {
    handlePointerEnd(e);
  });
  
  document.addEventListener('touchcancel', (e) => {
    // Touch was cancelled (e.g., system gesture) - clean up state
    if (swipePreviewActive && swipePreviewTile) {
      swipePreviewTile.el.style.transform = '';
      swipePreviewActive = false;
      swipePreviewTile = null;
      swipePreviewOffset = { x: 0, y: 0 };
    }
    
    mouseDownPos = null;
    mouseDownTime = null;
    mouseDownGridPos = null;
    mouseDownSelectedGapIdx = null;
    lastDragGapPos = null;
    dragControlUsed = false;
  });

  resetBtn.addEventListener('click', () => {
    if (gameMode === 'challenge') {
      // In challenge mode, reset recreates the challenge with the same settings
      startChallenge(challengeSeed, challengeSteps, challengeBoard, challengeRandomizeGaps, challengeWrapHorizontal, challengeWrapVertical);
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

  // Settings dialog handlers
  settingsBtn.addEventListener('click', () => {
    // Set current board in dropdown
    settingsBoardSelect.value = currentBoardSlug;
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

  settingsApplyBtn.addEventListener('click', () => {
    const selectedBoard = settingsBoardSelect.value;
    settingsDialog.style.display = 'none';
    
    // Switch board if different
    if (selectedBoard !== currentBoardSlug) {
      switchBoard(selectedBoard);
    }
    
    boardEl.focus();
  });

  // Allow Enter to apply, Escape to cancel
  settingsDialog.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      settingsApplyBtn.click();
    } else if (e.key === 'Escape') {
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
    wrapHorizontal = wrapHorizontalCheckbox.checked;
    renderAll(); // Re-render to show/hide duplicates
  });

  wrapVerticalCheckbox.addEventListener('change', () => {
    wrapVertical = wrapVerticalCheckbox.checked;
    renderAll(); // Re-render to show/hide duplicates
  });

  // Challenge dialog handlers
  challengeBtn.addEventListener('click', () => {
    // Set current board in dropdown
    challengeBoardSelect.value = currentBoardSlug;
    // Set current wrapping state for challenge
    challengeWrapHorizontalCheckbox.checked = wrapHorizontal;
    challengeWrapVerticalCheckbox.checked = wrapVertical;
    challengeDialog.style.display = 'flex';
    seedInput.focus();
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
    await startChallenge(seed, steps, boardSlug, randomizeGaps, wrapH, wrapV);
    
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

  // Congratulations dialog handler
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

  // Display settings dialog handlers
  displayBtn.addEventListener('click', () => {
    // Set current values in dialog
    darkModeCheckbox.checked = document.body.classList.contains('dark-mode');
    autoScaleCheckbox.checked = autoFitEnabled;
    challengeAboveCheckbox.checked = challengeAbove;
    boardSizeSlider.value = boardSizeScale;
    boardSizeValue.textContent = `${boardSizeScale}%`;
    boardSizeSlider.disabled = autoFitEnabled;
    
    displayDialog.style.display = 'flex';
    darkModeCheckbox.focus();
  });

  displayCloseBtn.addEventListener('click', () => {
    displayDialog.style.display = 'none';
    boardEl.focus();
  });

  // Dark mode checkbox handler - applies instantly
  darkModeCheckbox.addEventListener('change', () => {
    const isDarkMode = darkModeCheckbox.checked;
    document.body.classList.toggle('dark-mode', isDarkMode);
    localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');
  });

  // Auto-scale checkbox handler - applies instantly
  autoScaleCheckbox.addEventListener('change', () => {
    autoFitEnabled = autoScaleCheckbox.checked;
    boardSizeSlider.disabled = autoFitEnabled;
    applyBoardSize();
    localStorage.setItem('autoFit', autoFitEnabled ? 'enabled' : 'disabled');
  });

  // Challenge box position checkbox handler - applies instantly
  challengeAboveCheckbox.addEventListener('change', () => {
    challengeAbove = challengeAboveCheckbox.checked;
    document.body.classList.toggle('challenge-above', challengeAbove);
    localStorage.setItem('challengeAbove', challengeAbove ? 'enabled' : 'disabled');
    // Reapply board size since challenge box position affects available space
    if (autoFitEnabled) {
      applyBoardSize();
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
        // Apply scaling
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
    
    // Disable transitions during resize to prevent timing issues
    boardEl.classList.add('no-transitions');
    
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 40; // Account for body margins (20px each side)
    
    // Calculate additional horizontal space needed for challenge box if it's to the right of the board
    let challengeBoxWidthSpace = 0;
    if (gameMode === 'challenge' && !challengeAbove) {
      // Challenge box is to the right: account for gap + full challenge box width
      const gap = 20; // gap between board and challenge box (from CSS .game-container)
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
    if (gameMode === 'challenge' && challengeAbove) {
      const challengeInfo = document.getElementById('challengeInfo');
      if (challengeInfo) {
        verticalSpace += challengeInfo.offsetHeight;
        // Add gap between challenge box and board (from CSS .game-container)
        verticalSpace += 20;
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
  
  // Load saved preferences
  if (localStorage.getItem('darkMode') === 'enabled') {
    document.body.classList.add('dark-mode');
  }
  
  if (localStorage.getItem('autoFit') === 'enabled') {
    autoFitEnabled = true;
  }
  
  if (localStorage.getItem('challengeAbove') === 'enabled') {
    challengeAbove = true;
    document.body.classList.add('challenge-above');
  }
  
  const savedBoardSize = localStorage.getItem('boardSize');
  if (savedBoardSize) {
    boardSizeScale = parseInt(savedBoardSize);
  }

  // Help dialog handlers
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

  // Parse URL query parameters and auto-start challenge if present
  function checkURLParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const seedParam = urlParams.get('seed');
    const stepsParam = urlParams.get('steps');
    const boardParam = urlParams.get('board');
    const randomizeGapsParam = urlParams.get('randomizeGaps');
    const wrapHParam = urlParams.get('wrapH');
    const wrapVParam = urlParams.get('wrapV');
    
    // Only auto-start if both seed and steps parameters exist and are non-empty
    if (seedParam !== null && seedParam.trim() !== '' &&
        stepsParam !== null && stepsParam.trim() !== '') {
      const seed = parseInt(seedParam);
      const steps = parseInt(stepsParam) || 250;
      const boardSlug = boardParam && boardRegistry[boardParam] ? boardParam : 'default';
      const randomizeGaps = randomizeGapsParam === 'true';
      const wrapH = wrapHParam === 'true';
      const wrapV = wrapVParam === 'true';
      
      console.log(`Auto-starting challenge from URL: seed=${seed}, steps=${steps}, board=${boardSlug}, randomizeGaps=${randomizeGaps}, wrapH=${wrapH}, wrapV=${wrapV}`);
      
      // Start challenge after initialization
      setTimeout(async () => {
        await startChallenge(seed, steps, boardSlug, randomizeGaps, wrapH, wrapV);
        boardEl.focus();
      }, 0);
    }
  }

  // Initialize
  // Set initial board dimensions
  boardEl.style.width = `calc(${boardConfig.width} * var(--tile))`;
  boardEl.style.height = `calc(${boardConfig.height} * var(--tile))`;
  
  // Apply board size after preferences are loaded (handles both auto-fit and manual scaling)
  applyBoardSize();
  
  resetState();
  boardEl.focus();
  checkURLParams();
})();