/**
 * shuffle.js - Shuffle algorithm and quality scoring
 *
 * This module contains the intelligent shuffle algorithm that creates
 * solvable puzzles with weighted move selection and quality scoring.
 */

import { normalizeCoords, enumerateValidMoves, tryMove } from './moves.js';

// ============================================================================
// SEEDED RANDOM NUMBER GENERATOR
// ============================================================================

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

// ============================================================================
// GAP RANDOMIZATION
// ============================================================================

/**
 * Shared function to randomize which pieces act as gaps.
 * Toggles isGap flag on pieces to convert between gaps and tiles.
 * Keeps the number of small gaps and large gaps the same, but randomizes which pieces act as gaps.
 * NOTE: This function only updates data (isGap flags and selected property).
 * Caller must handle UI updates (buildGridFromState and renderAll).
 * @param {Object} state - Game state object
 * @param {Function} randomInt - Random integer function (for seeded or unseeded randomness)
 */
export function performGapRandomization(state, randomInt) {
  const gapConfig = state.boardConfig.gapConfigurations[state.selectedGapConfigKey];
  
  // Count small and large gaps in configuration
  let numSmallGaps = 0;
  let numLargeGaps = 0;
  
  for (const gapPos of gapConfig.gaps) {
    const isLargePiecePosition = state.boardConfig.largePieces.some(
      lp => lp.x === gapPos.x && lp.y === gapPos.y
    );
    
    if (isLargePiecePosition) {
      numLargeGaps++;
    } else {
      numSmallGaps++;
    }
  }

  // Filter small pieces only (current small gaps and small tiles)
  const smallPieces = state.pieces.filter(p => !p.isLarge);
  
  // Filter large pieces only (current large gaps and large tiles)
  const largePieces = state.pieces.filter(p => p.isLarge);
  
  // Randomly select which small pieces should be gaps
  const shuffledSmall = [...smallPieces];
  for (let i = shuffledSmall.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [shuffledSmall[i], shuffledSmall[j]] = [shuffledSmall[j], shuffledSmall[i]];
  }
  const newSmallGapPieces = shuffledSmall.slice(0, numSmallGaps);
  
  // Randomly select which large pieces should be gaps
  const shuffledLarge = [...largePieces];
  for (let i = shuffledLarge.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [shuffledLarge[i], shuffledLarge[j]] = [shuffledLarge[j], shuffledLarge[i]];
  }
  const newLargeGapPieces = shuffledLarge.slice(0, numLargeGaps);
  
  // Convert all pieces to regular tiles first (just toggle isGap flag)
  for (const piece of smallPieces) {
    if (piece.isGap) {
      piece.isGap = false;
      piece.selected = false;
    }
  }
  
  for (const piece of largePieces) {
    if (piece.isGap) {
      piece.isGap = false;
      piece.selected = false;
    }
  }
  
  // Convert selected pieces to gaps (just toggle isGap flag)
  for (const piece of newSmallGapPieces) {
    piece.isGap = true;
    piece.selected = false;
  }
  
  for (const piece of newLargeGapPieces) {
    piece.isGap = true;
    piece.selected = false;
  }
  
  // Combine all new gaps and select first one
  const allNewGaps = [...newSmallGapPieces, ...newLargeGapPieces];
  if (allNewGaps.length > 0) {
    allNewGaps[0].selected = true;
  }
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
 * @param {Object} state - Game state object
 * @param {Object} gap1 - First gap with x, y
 * @param {Object} gap2 - Second gap with x, y
 * @returns {number} Manhattan distance
 */
export function gapDistance(state, gap1, gap2) {
  let dx = Math.abs(gap1.x - gap2.x);
  let dy = Math.abs(gap1.y - gap2.y);
  
  // If horizontal wrapping is enabled, use shortest path
  if (state.wrapHorizontal) {
    const wrapDx = state.boardConfig.width - dx;
    dx = Math.min(dx, wrapDx);
  }
  
  // If vertical wrapping is enabled, use shortest path
  if (state.wrapVertical) {
    const wrapDy = state.boardConfig.height - dy;
    dy = Math.min(dy, wrapDy);
  }
  
  return dx + dy;
}

/**
 * Calculate weight for a move based on gap distance heuristic
 * Encourages moves that bring gaps closer together as urgency builds
 * @param {Object} state - Game state object
 * @param {Object} move - Move object with gapIdx and dir
 * @param {number} urgency - Current urgency factor (0 to 1)
 * @param {Array} gapPieces - Cached array of gap pieces
 * @returns {number} Weight multiplier for this move
 */
export function calculateDistanceWeight(state, move, urgency, gapPieces) {
  if (move.isGapSwap || move.isBig || gapPieces.length < 2) {
    return 1.0; // Don't apply heuristic to gap swaps, big piece moves, or single gap
  }
  
  // Calculate current distance between gaps
  const currentDistance = gapDistance(state, gapPieces[0], gapPieces[1]);
  
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
  const normalizedNew = normalizeCoords(state, newX, newY);
  newX = normalizedNew.x;
  newY = normalizedNew.y;
  
  // Calculate distance after move using wrapping-aware distance
  const newDistance = gapDistance(state, normalizedNew, otherGap);
  
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
 * @param {Object} state - Game state object
 * @returns {number} Sum of Manhattan distances for all large pieces
 */
export function calculateShuffleScore(state) {
  let totalDistance = 0;
  
  const bigPieces = state.pieces.filter(p => p.isLarge && !p.isGap);
  for (const piece of bigPieces) {
    let dx = Math.abs(piece.x - piece.homeX);
    let dy = Math.abs(piece.y - piece.homeY);
    
    // If horizontal wrapping is enabled, use shortest path
    if (state.wrapHorizontal) {
      const wrapDx = state.boardConfig.width - dx;
      dx = Math.min(dx, wrapDx);
    }
    
    // If vertical wrapping is enabled, use shortest path
    if (state.wrapVertical) {
      const wrapDy = state.boardConfig.height - dy;
      dy = Math.min(dy, wrapDy);
    }
    
    const manhattanDistance = dx + dy;
    totalDistance += manhattanDistance;
  }
  
  return totalDistance;
}

/**
 * Perform intelligent random valid moves with weighted priorities
 * @param {Object} state - Game state object
 * @param {number} steps - Number of shuffle moves to perform
 * @param {number|null} seed - Optional seed for deterministic shuffling
 * @param {boolean} randomizeGaps - Whether to randomize gap positions before shuffling
 * @param {Function} getBackgroundStyleForTile - Function to get background style for a tile
 * @param {Function} getBackgroundPositionCalc - Function to get background position as calc() expression
 * @returns {Promise<void>}
 */
export async function shuffle(state, steps, seed = null, randomizeGaps = false) {
  state.isShuffling = true; // Set flag to prevent move counting
  
  // In Challenge Mode, disable animations to hide shuffle sequence
  const isChallenge = state.gameMode === 'challenge';
  if (isChallenge) {
    state.boardEl.classList.add('no-transitions');
  }
  
  // Create random number generator (seeded or random)
  // Combine seed, steps, and board to create a unique seed for this shuffle
  // This ensures that changing any parameter produces a different shuffle
  // Using XOR with bit shifting to avoid overflow and ensure good bit mixing
  // Hash the board slug string to a number for seed mixing
  const boardHash = state.currentBoardSlug.split('').reduce((hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 0);
  // Hash the gap config key string to a number for seed mixing
  const gapConfigHash = state.selectedGapConfigKey.split('').reduce((hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 0);
  const combinedSeed = seed !== null ? ((seed ^ (steps << 16) ^ (boardHash << 24) ^ (gapConfigHash << 8) ^ (randomizeGaps << 12) ^ (state.wrapHorizontal << 13) ^ (state.wrapVertical << 14)) >>> 0) : null;
  const rng = combinedSeed !== null ? new SeededRandom(combinedSeed) : null;
  const random = () => rng ? rng.next() : Math.random();
  const randomInt = (max) => rng ? rng.nextInt(max) : Math.floor(Math.random() * max);
  
  // If randomizeGaps is enabled, use the shared gap randomization function
  if (randomizeGaps) {
    performGapRandomization(state, randomInt);
    // CRITICAL: Update DOM to convert tiles to gaps and vice versa
    // This must happen before buildGridFromState() and renderAll()
    state.updatePieceDOMForGapChanges();
    // CRITICAL: Rebuild grid after gap randomization
    state.buildGridFromState();
  }
  
  let lastMove = null; // Remember last move to avoid immediate reversal
  let movesSinceLastBigPiece = 0; // Track moves since last large piece moved (adaptive urgency)
  
  // Cache gap pieces once at the start to avoid repeated filtering
  let cachedGapPieces = state.pieces.filter(p => p.isGap);
  
  try {
    for (let i=0; i<steps; i++) {
      const moves = enumerateValidMoves(state, cachedGapPieces);
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
            const distanceWeight = calculateDistanceWeight(state, move, urgency, cachedGapPieces);
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
      state.pieces.forEach(p => p.selected = false);
      m.gap.selected = true;
      
      tryMove(state, m.dir, m.gap, cachedGapPieces);
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
      state.boardEl.classList.remove('no-transitions');
    }
    
    // Randomly select one of the gaps to hide which was used last
    // Reuse cached gap pieces if available, otherwise filter
    const gapPieces = cachedGapPieces;
    if (gapPieces.length > 0) {
      const randomGapIdx = randomInt(gapPieces.length);
      state.pieces.forEach(p => p.selected = false);
      gapPieces[randomGapIdx].selected = true;
    }
    
    state.isShuffling = false; // Clear flag after shuffle completes
    
    // Calculate and log shuffle quality score
    const shuffleScore = calculateShuffleScore(state);
    console.log(`Shuffle complete. Score: ${shuffleScore} (sum of Manhattan distances for large pieces)`);
  }
}