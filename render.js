/**
 * render.js - Rendering logic
 * 
 * This module contains functions for updating the DOM to reflect the current game state,
 * including handling wrapped large pieces and gap selection highlighting.
 */

import { normalizeCoords } from './moves.js';

/**
 * Get background style for a tile based on its home position
 * @param {Object} state - Game state object
 * @param {number} homeX - Home X coordinate
 * @param {number} homeY - Home Y coordinate
 * @returns {Object} {image, bgSize} for background styling
 */
function getBackgroundStyleForTile(state, homeX, homeY) {
  const boardConfig = state.boardConfig;
  
  // Determine which image to use
  let image;
  if (boardConfig.imageMode === 'single') {
    image = boardConfig.images.primary;
  } else if (boardConfig.imageMode === 'horizontal') {
    const halfWidth = boardConfig.width / 2;
    image = homeX < halfWidth ? boardConfig.images.primary : boardConfig.images.secondary;
  } else if (boardConfig.imageMode === 'vertical') {
    const halfHeight = boardConfig.height / 2;
    image = homeY < halfHeight ? boardConfig.images.primary : boardConfig.images.secondary;
  } else {
    image = boardConfig.images.primary;
  }
  
  // Calculate background size
  let bgSize;
  if (boardConfig.imageMode === 'single') {
    bgSize = `calc(${boardConfig.width} * var(--tile)) calc(${boardConfig.height} * var(--tile))`;
  } else if (boardConfig.imageMode === 'horizontal') {
    const halfWidth = boardConfig.width / 2;
    bgSize = `calc(${halfWidth} * var(--tile)) calc(${boardConfig.height} * var(--tile))`;
  } else if (boardConfig.imageMode === 'vertical') {
    const halfHeight = boardConfig.height / 2;
    bgSize = `calc(${boardConfig.width} * var(--tile)) calc(${halfHeight} * var(--tile))`;
  } else {
    bgSize = `calc(${boardConfig.width} * var(--tile)) calc(${boardConfig.height} * var(--tile))`;
  }
  
  return { image, bgSize };
}

/**
 * Get background position as calc() expression
 * @param {Object} state - Game state object
 * @param {number} homeX - Home X coordinate
 * @param {number} homeY - Home Y coordinate
 * @returns {string} CSS calc() expression for background-position
 */
function getBackgroundPositionCalc(state, homeX, homeY) {
  const boardConfig = state.boardConfig;
  
  if (boardConfig.imageMode === 'single') {
    return `calc(${-homeX} * var(--tile)) calc(${-homeY} * var(--tile))`;
  } else if (boardConfig.imageMode === 'horizontal') {
    const halfWidth = boardConfig.width / 2;
    let xCalc;
    if (homeX < halfWidth) {
      xCalc = `calc(${-homeX} * var(--tile))`;
    } else {
      xCalc = `calc(${-(homeX - halfWidth)} * var(--tile))`;
    }
    const yCalc = `calc(${-homeY} * var(--tile))`;
    return `${xCalc} ${yCalc}`;
  } else if (boardConfig.imageMode === 'vertical') {
    const halfHeight = boardConfig.height / 2;
    const xCalc = `calc(${-homeX} * var(--tile))`;
    let yCalc;
    if (homeY < halfHeight) {
      yCalc = `calc(${-homeY} * var(--tile))`;
    } else {
      yCalc = `calc(${-(homeY - halfHeight)} * var(--tile))`;
    }
    return `${xCalc} ${yCalc}`;
  }
  return `calc(${-homeX} * var(--tile)) calc(${-homeY} * var(--tile))`;
}

/**
 * Updates all piece positions in DOM
 * @param {Object} state - Game state object
 */
export function renderAll(state) {
  const tilePx = state.tilePx;
  const boardEl = state.boardEl;
  const boardConfig = state.boardConfig;
  
  for (const piece of state.pieces) {
    // Remove any existing duplicate elements
    const duplicates = boardEl.querySelectorAll(`[data-duplicate-of="${piece.id}"]`);
    duplicates.forEach(dup => dup.remove());
    
    if (piece.isLarge) {
      // For large pieces/gaps with wrapping, we need to render segments based on wrap direction
      // Calculate all 4 cell positions with normalization
      const cells = [
        normalizeCoords(state, piece.x, piece.y),           // Top-left
        normalizeCoords(state, piece.x + 1, piece.y),       // Top-right
        normalizeCoords(state, piece.x, piece.y + 1),       // Bottom-left
        normalizeCoords(state, piece.x + 1, piece.y + 1)    // Bottom-right
      ];
      
      // Check if piece spans board edges (cells are not contiguous)
      const spansHorizontal = (state.wrapHorizontal &&
        (Math.abs(cells[0].x - cells[1].x) > 1 || Math.abs(cells[2].x - cells[3].x) > 1));
      const spansVertical = (state.wrapVertical &&
        (Math.abs(cells[0].y - cells[2].y) > 1 || Math.abs(cells[1].y - cells[3].y) > 1));
      
      if (spansHorizontal && spansVertical) {
        // Piece/gap spans both directions - render as 4 individual 1×1 cells
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
          
          if (piece.isGap) {
            // Large gap cell
            const dupWrapper = document.createElement('div');
            dupWrapper.className = 'gap-wrapper big-cell';
            dupWrapper.setAttribute('data-duplicate-of', piece.id);
            dupWrapper.setAttribute('data-cell-offset', `${offset.ox},${offset.oy}`);
            
            // Apply selection visual for wrapped large gaps
            const showSelection = piece.selected && !(state.gameMode === 'challenge' && state.challengeSolved);
            if (showSelection) {
              dupWrapper.classList.add('selected');
            }
            
            const dupInner = document.createElement('div');
            dupInner.className = 'gap';
            dupWrapper.appendChild(dupInner);
            
            dupWrapper.style.left = `${cell.x * tilePx}px`;
            dupWrapper.style.top = `${cell.y * tilePx}px`;
            dupWrapper.style.width = `${tilePx}px`;
            dupWrapper.style.height = `${tilePx}px`;
            
            const { image, bgSize } = getBackgroundStyleForTile(state, piece.homeX, piece.homeY);
            dupInner.style.backgroundImage = `url("${image}")`;
            dupInner.style.backgroundSize = bgSize;
            dupInner.style.backgroundPosition = getBackgroundPositionCalc(state, piece.homeX + offset.ox, piece.homeY + offset.oy);
            
            boardEl.appendChild(dupWrapper);
          } else {
            // Large piece cell
            const dup = document.createElement('div');
            dup.className = 'tile big-cell';
            dup.setAttribute('data-duplicate-of', piece.id);
            dup.setAttribute('data-cell-offset', `${offset.ox},${offset.oy}`);
            
            dup.style.left = `${cell.x * tilePx}px`;
            dup.style.top = `${cell.y * tilePx}px`;
            dup.style.width = `${tilePx}px`;
            dup.style.height = `${tilePx}px`;
            
            const { image, bgSize } = getBackgroundStyleForTile(state, piece.homeX, piece.homeY);
            dup.style.backgroundImage = `url("${image}")`;
            dup.style.backgroundSize = bgSize;
            dup.style.backgroundPosition = getBackgroundPositionCalc(state, piece.homeX + offset.ox, piece.homeY + offset.oy);
            
            boardEl.appendChild(dup);
          }
        }
      } else if (spansHorizontal) {
        // Piece/gap spans horizontally only - render as 2 vertical strips (1×2 each)
        piece.el.style.display = 'none';
        
        if (piece.isGap) {
          // Large gap - left strip
          const leftWrapper = document.createElement('div');
          leftWrapper.className = 'gap-wrapper big';
          leftWrapper.setAttribute('data-duplicate-of', piece.id);
          leftWrapper.setAttribute('data-strip', 'left');
          
          // Apply selection visual for wrapped large gaps
          const showSelection = piece.selected && !(state.gameMode === 'challenge' && state.challengeSolved);
          if (showSelection) {
            leftWrapper.classList.add('selected');
          }
          
          const leftInner = document.createElement('div');
          leftInner.className = 'gap big';
          leftWrapper.appendChild(leftInner);
          
          leftWrapper.style.left = `${cells[0].x * tilePx}px`;
          leftWrapper.style.top = `${cells[0].y * tilePx}px`;
          leftWrapper.style.width = `${tilePx}px`;
          leftWrapper.style.height = `${2 * tilePx}px`;
          
          const { image: imgLeft, bgSize: bgSizeLeft } = getBackgroundStyleForTile(state, piece.homeX, piece.homeY);
          leftInner.style.backgroundImage = `url("${imgLeft}")`;
          leftInner.style.backgroundSize = bgSizeLeft;
          leftInner.style.backgroundPosition = getBackgroundPositionCalc(state, piece.homeX, piece.homeY);
          
          boardEl.appendChild(leftWrapper);
          
          // Large gap - right strip
          const rightWrapper = document.createElement('div');
          rightWrapper.className = 'gap-wrapper big';
          rightWrapper.setAttribute('data-duplicate-of', piece.id);
          rightWrapper.setAttribute('data-strip', 'right');
          
          // Apply selection visual for wrapped large gaps
          if (showSelection) {
            rightWrapper.classList.add('selected');
          }
          
          const rightInner = document.createElement('div');
          rightInner.className = 'gap big';
          rightWrapper.appendChild(rightInner);
          
          rightWrapper.style.left = `${cells[1].x * tilePx}px`;
          rightWrapper.style.top = `${cells[1].y * tilePx}px`;
          rightWrapper.style.width = `${tilePx}px`;
          rightWrapper.style.height = `${2 * tilePx}px`;
          
          const { image: imgRight, bgSize: bgSizeRight } = getBackgroundStyleForTile(state, piece.homeX, piece.homeY);
          rightInner.style.backgroundImage = `url("${imgRight}")`;
          rightInner.style.backgroundSize = bgSizeRight;
          rightInner.style.backgroundPosition = getBackgroundPositionCalc(state, piece.homeX + 1, piece.homeY);
          
          boardEl.appendChild(rightWrapper);
        } else {
          // Large piece - left strip
          const leftStrip = document.createElement('div');
          leftStrip.className = 'tile big';
          leftStrip.setAttribute('data-duplicate-of', piece.id);
          leftStrip.setAttribute('data-strip', 'left');
          
          leftStrip.style.left = `${cells[0].x * tilePx}px`;
          leftStrip.style.top = `${cells[0].y * tilePx}px`;
          leftStrip.style.width = `${tilePx}px`;
          leftStrip.style.height = `${2 * tilePx}px`;
          
          const { image: imgLeft, bgSize: bgSizeLeft } = getBackgroundStyleForTile(state, piece.homeX, piece.homeY);
          leftStrip.style.backgroundImage = `url("${imgLeft}")`;
          leftStrip.style.backgroundSize = bgSizeLeft;
          leftStrip.style.backgroundPosition = getBackgroundPositionCalc(state, piece.homeX, piece.homeY);
          
          boardEl.appendChild(leftStrip);
          
          // Large piece - right strip
          const rightStrip = document.createElement('div');
          rightStrip.className = 'tile big';
          rightStrip.setAttribute('data-duplicate-of', piece.id);
          rightStrip.setAttribute('data-strip', 'right');
          
          rightStrip.style.left = `${cells[1].x * tilePx}px`;
          rightStrip.style.top = `${cells[1].y * tilePx}px`;
          rightStrip.style.width = `${tilePx}px`;
          rightStrip.style.height = `${2 * tilePx}px`;
          
          const { image: imgRight, bgSize: bgSizeRight } = getBackgroundStyleForTile(state, piece.homeX, piece.homeY);
          rightStrip.style.backgroundImage = `url("${imgRight}")`;
          rightStrip.style.backgroundSize = bgSizeRight;
          rightStrip.style.backgroundPosition = getBackgroundPositionCalc(state, piece.homeX + 1, piece.homeY);
          
          boardEl.appendChild(rightStrip);
        }
      } else if (spansVertical) {
        // Piece/gap spans vertically only - render as 2 horizontal strips (2×1 each)
        piece.el.style.display = 'none';
        
        if (piece.isGap) {
          // Large gap - top strip
          const topWrapper = document.createElement('div');
          topWrapper.className = 'gap-wrapper big';
          topWrapper.setAttribute('data-duplicate-of', piece.id);
          topWrapper.setAttribute('data-strip', 'top');
          
          // Apply selection visual for wrapped large gaps
          const showSelection = piece.selected && !(state.gameMode === 'challenge' && state.challengeSolved);
          if (showSelection) {
            topWrapper.classList.add('selected');
          }
          
          const topInner = document.createElement('div');
          topInner.className = 'gap big';
          topWrapper.appendChild(topInner);
          
          topWrapper.style.left = `${cells[0].x * tilePx}px`;
          topWrapper.style.top = `${cells[0].y * tilePx}px`;
          topWrapper.style.width = `${2 * tilePx}px`;
          topWrapper.style.height = `${tilePx}px`;
          
          const { image: imgTop, bgSize: bgSizeTop } = getBackgroundStyleForTile(state, piece.homeX, piece.homeY);
          topInner.style.backgroundImage = `url("${imgTop}")`;
          topInner.style.backgroundSize = bgSizeTop;
          topInner.style.backgroundPosition = getBackgroundPositionCalc(state, piece.homeX, piece.homeY);
          
          boardEl.appendChild(topWrapper);
          
          // Large gap - bottom strip
          const bottomWrapper = document.createElement('div');
          bottomWrapper.className = 'gap-wrapper big';
          bottomWrapper.setAttribute('data-duplicate-of', piece.id);
          bottomWrapper.setAttribute('data-strip', 'bottom');
          
          // Apply selection visual for wrapped large gaps
          if (showSelection) {
            bottomWrapper.classList.add('selected');
          }
          
          const bottomInner = document.createElement('div');
          bottomInner.className = 'gap big';
          bottomWrapper.appendChild(bottomInner);
          
          bottomWrapper.style.left = `${cells[2].x * tilePx}px`;
          bottomWrapper.style.top = `${cells[2].y * tilePx}px`;
          bottomWrapper.style.width = `${2 * tilePx}px`;
          bottomWrapper.style.height = `${tilePx}px`;
          
          const { image: imgBottom, bgSize: bgSizeBottom } = getBackgroundStyleForTile(state, piece.homeX, piece.homeY);
          bottomInner.style.backgroundImage = `url("${imgBottom}")`;
          bottomInner.style.backgroundSize = bgSizeBottom;
          bottomInner.style.backgroundPosition = getBackgroundPositionCalc(state, piece.homeX, piece.homeY + 1);
          
          boardEl.appendChild(bottomWrapper);
        } else {
          // Large piece - top strip
          const topStrip = document.createElement('div');
          topStrip.className = 'tile big';
          topStrip.setAttribute('data-duplicate-of', piece.id);
          topStrip.setAttribute('data-strip', 'top');
          
          topStrip.style.left = `${cells[0].x * tilePx}px`;
          topStrip.style.top = `${cells[0].y * tilePx}px`;
          topStrip.style.width = `${2 * tilePx}px`;
          topStrip.style.height = `${tilePx}px`;
          
          const { image: imgTop, bgSize: bgSizeTop } = getBackgroundStyleForTile(state, piece.homeX, piece.homeY);
          topStrip.style.backgroundImage = `url("${imgTop}")`;
          topStrip.style.backgroundSize = bgSizeTop;
          topStrip.style.backgroundPosition = getBackgroundPositionCalc(state, piece.homeX, piece.homeY);
          
          boardEl.appendChild(topStrip);
          
          // Large piece - bottom strip
          const bottomStrip = document.createElement('div');
          bottomStrip.className = 'tile big';
          bottomStrip.setAttribute('data-duplicate-of', piece.id);
          bottomStrip.setAttribute('data-strip', 'bottom');
          
          bottomStrip.style.left = `${cells[2].x * tilePx}px`;
          bottomStrip.style.top = `${cells[2].y * tilePx}px`;
          bottomStrip.style.width = `${2 * tilePx}px`;
          bottomStrip.style.height = `${tilePx}px`;
          
          const { image: imgBottom, bgSize: bgSizeBottom } = getBackgroundStyleForTile(state, piece.homeX, piece.homeY);
          bottomStrip.style.backgroundImage = `url("${imgBottom}")`;
          bottomStrip.style.backgroundSize = bgSizeBottom;
          bottomStrip.style.backgroundPosition = getBackgroundPositionCalc(state, piece.homeX, piece.homeY + 1);
          
          boardEl.appendChild(bottomStrip);
        }
      } else {
        // Piece/gap doesn't span edge - render normally as 2×2
        piece.el.style.display = '';
        piece.el.style.left = `${piece.x * tilePx}px`;
        piece.el.style.top = `${piece.y * tilePx}px`;
        
        // Update selection visual for large gaps
        if (piece.isGap) {
          const showSelection = piece.selected && !(state.gameMode === 'challenge' && state.challengeSolved);
          piece.el.classList.toggle('selected', showSelection);
        }
      }
    } else {
      // Small pieces and gaps - render normally
      piece.el.style.left = `${piece.x * tilePx}px`;
      piece.el.style.top = `${piece.y * tilePx}px`;
      
      // Update selection visual (for gaps only)
      if (piece.isGap) {
        const showSelection = piece.selected && !(state.gameMode === 'challenge' && state.challengeSolved);
        piece.el.classList.toggle('selected', showSelection);
      }
    }
  }
}

/**
 * Update DOM elements to reflect current isGap flags on pieces.
 * Converts pieces between tiles and gaps based on their isGap property.
 * @param {Object} state - Game state object
 */
export function updatePieceDOMForGapChanges(state) {
  for (const piece of state.pieces) {
    const shouldBeGap = piece.isGap;
    const isCurrentlyGap = piece.el.classList.contains('gap-wrapper');
    
    // Skip if already in correct state
    if (shouldBeGap === isCurrentlyGap) continue;
    
    if (shouldBeGap) {
      // Convert tile to gap
      const newEl = document.createElement('div');
      newEl.className = piece.isLarge ? 'gap-wrapper big' : 'gap-wrapper';
      const innerEl = document.createElement('div');
      innerEl.className = piece.isLarge ? 'gap big' : 'gap';
      newEl.appendChild(innerEl);
      
      // Use existing identity for background
      const { image, bgSize } = getBackgroundStyleForTile(state, piece.homeX, piece.homeY);
      innerEl.style.backgroundImage = `url("${image}")`;
      innerEl.style.backgroundSize = bgSize;
      innerEl.style.backgroundPosition = getBackgroundPositionCalc(state, piece.homeX, piece.homeY);
      
      // Replace in DOM
      piece.el.parentNode.replaceChild(newEl, piece.el);
      piece.el = newEl;
      piece.innerEl = innerEl;
    } else {
      // Convert gap to tile
      const newEl = document.createElement('div');
      newEl.className = piece.isLarge ? 'tile big' : 'tile small';
      
      // Use existing identity for background
      const { image, bgSize } = getBackgroundStyleForTile(state, piece.homeX, piece.homeY);
      newEl.style.backgroundImage = `url("${image}")`;
      newEl.style.backgroundSize = bgSize;
      newEl.style.backgroundPosition = getBackgroundPositionCalc(state, piece.homeX, piece.homeY);
      
      // Replace in DOM
      piece.el.parentNode.replaceChild(newEl, piece.el);
      piece.el = newEl;
      piece.innerEl = null;
    }
  }
}