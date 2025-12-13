# Slide Puzzle Game - AI Instructions

## Project Overview
This is a browser-based slide puzzle game with a unique 8×8 grid with mixed-size pieces and multi-gap mechanics. The game supports both small (1×1) and large (2×2) pieces, as well as small (1×1) and large (2×2) gaps. The project is split into three files: HTML for structure, CSS for styling, and JavaScript for game logic.

## Game Mechanics

### Board Configuration
The game supports multiple board configurations with different layouts and background image modes. Players can switch between boards using the Settings dialog (Free Play) or select a board when starting a challenge.

#### Board Selection System
- **Free Play Mode**: Settings button (⚙) opens dialog to change board (resets puzzle)
- **Challenge Mode**: Board selection included in "New Challenge" dialog
- **URL Parameter**: Board encoded in challenge URLs as `?board=default|horizontal|vertical`
- **Board Registry**: `boardRegistry` object maps slugs to board configurations
- **Current Board**: Tracked via `currentBoardSlug` variable
- **Dynamic Sizing**: Board dimensions update automatically when switching

#### Available Board Configurations

1. **Default Board** - Slug: `'default'` - 8×8 grid, single image mode
2. **Horizontal Board** - Slug: `'horizontal'` - 16×8 grid, two images side by side
3. **Vertical Board** - Slug: `'vertical'` - 8×16 grid, two images stacked vertically
4. **Classic Board** - Slug: `'classic'` - 8×8 grid, all 1×1 pieces, single gap

#### Board Configuration Structure
```javascript
const boardConfig = {
  width: 8,              // Board width in tiles
  height: 8,             // Board height in tiles
  imageMode: 'single',   // 'single', 'horizontal', or 'vertical'
  images: {
    primary: 'lightworld.png',
    secondary: 'darkworld.png'  // For horizontal/vertical modes
  },
  largePieces: [{x, y}, ...],   // Large piece top-left corners
  wrapHorizontal: false,         // Enable horizontal wrapping
  wrapVertical: false,           // Enable vertical wrapping
  gapConfigurations: [           // Available gap configurations
    {
      name: "2 small gaps (bottom right)",
      gaps: [{x: 7, y: 6}, {x: 7, y: 7}]
    }
  ]
};
```

#### Image Mode Behavior
- **`'single'`**: One image covers the entire board
- **`'horizontal'`**: Two images side by side (left half uses primary, right half uses secondary)
- **`'vertical'`**: Two images stacked (top half uses primary, bottom half uses secondary)

### Gap Configuration System

Each board can have multiple gap placement options for variety.

**Gap Configuration Structure**:
- Each board has a `gapConfigurations` array with one or more gap placement options
- Each configuration has `name` (descriptive) and `gaps` (array of `{x, y}` positions)

**Gap Size Determination**:
- Gap size determined automatically based on position
- If gap position matches a large piece position, it becomes a large gap (2×2)
- Otherwise, it becomes a small gap (1×1)

**Identity vs Position**:
- **Identity** (`homeX`, `homeY`): Which board cell the gap represents; defines its background crop
- **Position** (`x`, `y`): Where the gap currently is on the board
- Background crop based on identity, not current position
- Win condition: all gaps must return to their identity positions

**When Randomizing Gaps**:
- New cells selected to become gaps
- Pieces toggle between acting as gaps or tiles (via `isGap` flag)
- All pieces keep their original identities (homeX, homeY unchanged)
- Small and large gaps randomized separately to maintain count

### Large Gap System

Large gaps are 2×2 gaps that function similarly to large pieces but act as empty spaces.

#### Configuration
- Defined in `gapConfigurations` array
- Automatic detection: if gap position matches large piece position, it becomes large gap
- Uses same `{x, y}` format as small gaps

#### Type System
- **Flags**: `isGap: true` and `isLarge: true`
- **Grid Representation**: Occupies 4 cells with `{isGap: true, isLarge: true, id, ox, oy}`

#### Movement Behavior

**Small Piece Movement**:
- Can move into small gaps (1×1)
- Cannot move into large gaps (must remain connected as 2×2 blocks)

**Large Piece Movement**:
- Can move into 2 aligned small gaps
- Can swap positions with large gaps
- Both entities exchange positions completely when swapping

**Large Gap Movement**:
- Can move into 2 aligned small pieces or small gaps
- Works similarly to large piece movement but in reverse
- Destination cells must be properly aligned (same row or column)

**Gap Swapping**:
- Small gaps can swap with other small gaps
- Large gaps can swap with other large gaps
- **Size Matching Required**: Small gaps cannot swap with large gaps

### Wrapping System

The game supports optional horizontal and vertical wrapping, creating a toroidal topology.

#### Wrapping Modes

**Horizontal Wrapping**: Pieces can move from rightmost column to leftmost column and vice versa
**Vertical Wrapping**: Pieces can move from bottom row to top row and vice versa
**Combined Wrapping**: Creates true toroidal topology; large pieces can span board edges

#### State Management

**Free Play Mode**:
- `wrapHorizontal` and `wrapVertical` boolean flags
- Settings persist in localStorage
- **Safety Check**: When disabling wrapping, checks if large pieces are wrapped; auto-resets board if needed

**Challenge Mode**:
- `challengeWrapHorizontal` and `challengeWrapVertical` flags (independent of Free Play)
- Wrapping settings included in challenge URL parameters (`wrapH`, `wrapV`)

#### Coordinate Normalization

**Core Function**: `normalizeCoords(x, y)`
- Wraps coordinates using modulo arithmetic: `((coord % size) + size) % size`
- Handles negative coordinates correctly
- Used throughout codebase for consistent coordinate handling

#### Wrapped Rendering

When wrapping is enabled, 2×2 entities that span board edges are rendered intelligently:
- **No edge spanning**: Single 2×2 element
- **Horizontal edge only**: 2 vertical strips (1×2 each)
- **Vertical edge only**: 2 horizontal strips (2×1 each)
- **Both edges**: 4 individual cells (1×1 each)

Implementation uses duplicate DOM elements with `data-duplicate-of` attribute.

#### URL Parameters

Challenge URLs include:
- `seed`: Challenge seed (numeric)
- `steps`: Number of shuffle steps
- `board`: Board slug
- `gapConfig`: Gap configuration index
- `randomizeGaps`: Whether gaps were randomized
- `wrapH`, `wrapV`: Wrapping enabled flags

### Controls

#### Keyboard Controls
- **Spacebar**: Toggle between gaps
- **Arrow Keys** (↑↓←→): Slide adjacent piece into selected gap
- **WASD**: Alternative arrow key controls

#### Mouse Controls
- **Left Click on Piece**: Move piece into adjacent gap
- **Swipe on Piece**: Drag ≥5 pixels to move in that direction (shows 15px preview)
- **Drag on Piece**: Click and hold, drag over gaps to move continuously (75% valid region)
- **Swipe on Gap**: Drag ≥5 pixels to swap with adjacent gap
- **Drag on Gap**: Click and hold, drag over other gap to swap
- **Left Click on Gap**: Select gap, or swap if exactly 1 adjacent gap

#### Button Controls
- **Reset Button**: Return to solved state (Free Play) or recreate challenge (Challenge Mode)
- **Shuffle Button**: Randomize board with 250 valid moves (Free Play only)
- **Edit Board Button**: Change board configuration (Free Play only)
- **New Challenge Button**: Start challenge with custom or random seed
- **Give Up Button**: Return to Free Play mode (Challenge Mode only)
- **Display Button** (⚙): Opens display settings dialog
- **Help Button** (?): Opens controls reference dialog

### Movement Rules

#### Basic Movement
1. **Small Pieces (1×1)**: Can move into any adjacent gap
2. **Large Pieces (2×2)**: Can move into 2 aligned small gaps OR swap with a large gap
3. **Gap Swapping**: Adjacent gaps can swap, but only if same size
4. **Selection**: Only selected gap (blue outline) accepts moves
5. **Challenge Completion**: When solved, all moves locked and gaps lose highlighting

## Code Architecture

### File Structure
```
index.html          # Main HTML structure and page layout
puzzle.css          # All styling (tiles, gaps, animations)
puzzle.js           # Core game logic, state management, UI handlers (ES6 module)
moves.js            # Movement logic and validation (ES6 module)
input.js            # Input handling - mouse, touch, keyboard (ES6 module)
shuffle.js          # Shuffle algorithm and quality scoring (ES6 module)
render.js           # DOM rendering and visual updates (ES6 module)
lightworld.png      # Puzzle image (8×8 tile grid)
darkworld.png       # Secondary puzzle image (for horizontal/vertical boards)
AGENTS.md           # AI agent rules and guidelines
Documentation.md    # This technical documentation file
README.md           # Player-facing documentation
```

### Module Organization

The codebase uses ES6 modules for better organization and maintainability:

**[`puzzle.js`](puzzle.js)** - Main entry point and core logic
- Board configurations and registry
- State management (pieces, grid, game mode, timers)
- Initialization functions
- Game mode management
- Challenge management
- Gap randomization
- Display settings
- UI event handlers
- State object factory (`getState()`)
- Imports from other modules and provides state via `getState()` function

**[`moves.js`](moves.js)** - Movement logic
- `normalizeCoords(state, x, y)` - Coordinate wrapping
- `calculateLargePieceDestination(state, piece, dx, dy)` - Large piece movement helper
- `tryMove(state, dir, gap, cachedGapPieces, dryRun)` - Main movement function
- `enumerateValidMoves(state, cachedGapPieces)` - Valid move enumeration
- All movement validation and grid update logic

**[`input.js`](input.js)** - Input handling
- `initializeInputHandlers(getStateFn)` - Sets up all event listeners
- Keyboard, mouse, and touch controls
- Shared utility functions for cell enumeration, adjacency detection, direction conversion
- Event handlers for pointer and keyboard events
- Returns cleanup function for removing event listeners

**[`shuffle.js`](shuffle.js)** - Shuffle algorithm
- `shuffle(state, steps, seed, randomizeGaps)` - Main shuffle function
- `performGapRandomization(state, randomInt)` - Gap randomization logic
- Distance calculation and move weighting functions
- Hybrid weighting system with adaptive urgency

**[`render.js`](render.js)** - Rendering logic
- `renderAll(state)` - Updates all piece positions in DOM
- `updatePieceDOMForGapChanges(state)` - Updates DOM for gap/tile conversions
- Handles wrapped large pieces (splits into segments when spanning edges)
- Manages selection highlighting and background image positioning

### State Object Pattern

Modules receive a state object containing all necessary data and functions:
```javascript
const state = {
  // Configuration
  boardConfig, tilePx, baseTilePx, currentBoardSlug,
  
  // Data structures
  pieces, pieceById, grid,
  
  // Flags
  wrapHorizontal, wrapVertical, gameMode, challengeSolved, timerPaused, isShuffling,
  
  // Counters
  challengeMoveCount,
  
  // DOM elements
  boardEl,
  
  // Functions
  renderAll, checkWinCondition, handleWin, updateMoveCount, buildGridFromState,
  calculateLargePieceDestination
};
```

This pattern:
- Avoids passing many individual parameters
- Makes dependencies explicit
- Easier to test and maintain
- Allows modules to access only what they need

### Game Modes

The game has two distinct modes:

#### Free Play Mode (Default)
- Casual play with no tracking or restrictions
- Shuffle button available
- Reset returns to solved state
- No move counting or time tracking
- Gap selection highlighting always visible

#### Challenge Mode
- Solve specific puzzle configuration with move tracking and timing
- **Activation**: Via "New Challenge" button or URL parameters
- **Features**:
  - Deterministic puzzle generation using seeded RNG
  - Move counter (starts at 0)
  - Timer with pause/resume button (⏸/▶)
  - No shuffle animations (instant execution)
  - URL synchronization
- **Timer Behavior**:
  - Starts after shuffle completes
  - Can be paused (disables moves, blurs board)
  - Can be hidden (continues running in background)
  - Stops when puzzle solved
- **Win Condition**:
  - Congratulations dialog appears
  - All moves locked
  - Gap highlighting removed
  - "Give Up" changes to "Free Play"

### Key Data Structures

#### Board Configuration
```javascript
boardConfig          // Object defining board layout
  .width             // Board width in tiles
  .height            // Board height in tiles
  .largePieces[]     // Array of large piece top-left corners
  .wrapHorizontal    // Enable horizontal wrapping
  .wrapVertical      // Enable vertical wrapping
  .gapConfigurations[] // Array of gap configuration options
```

#### State Variables
```javascript
boardConfig          // Currently active board configuration
currentBoardSlug     // Current board slug
selectedGapConfigIndex // Index into gapConfigurations
grid                 // 2D array: {isGap, isLarge, id, ox, oy} or null
pieces[]             // Unified array: {id, isGap, isLarge, x, y, homeX, homeY, el, innerEl, selected}
pieceById            // Map for quick piece lookup by ID
gameMode             // 'freeplay' or 'challenge'
challengeSeed        // Seed for current challenge
challengeSteps       // Number of shuffle steps
challengeMoveCount   // Player's move count
isShuffling          // Flag to prevent move counting during shuffle
challengeSolved      // Flag indicating if challenge completed
wrapHorizontal       // Horizontal wrapping in Free Play
wrapVertical         // Vertical wrapping in Free Play
challengeWrapHorizontal  // Horizontal wrapping in Challenge
challengeWrapVertical    // Vertical wrapping in Challenge
autoFitEnabled       // Auto-scale mode flag
boardSizeScale       // Board size percentage (50-200%)
```

#### Grid Cell Format
- `null`: Empty cell
- `{isGap: true, isLarge: false, id}`: Small gap (1×1)
- `{isGap: true, isLarge: true, id, ox, oy}`: Large gap cell (2×2)
- `{isGap: false, isLarge: false, id}`: Small piece (1×1)
- `{isGap: false, isLarge: true, id, ox, oy}`: Large piece cell (2×2)

#### Piece Object Format
```javascript
{
  id: 'S0' | 'B0' | 'G0' | 'BG0',  // Unique identifier
  isGap: boolean,          // True if acts as gap
  isLarge: boolean,        // True if 2×2 entity
  x: number,               // Current position (top-left for 2×2)
  y: number,
  homeX: number,           // Identity position (for background crop)
  homeY: number,
  el: HTMLElement,         // DOM element
  innerEl: HTMLElement | null,  // Inner element (gaps only)
  selected: boolean        // True if gap is selected
}
```

## Development Guidelines

### When Modifying Mouse Controls
1. Use shared utility functions: `getCellsForTile()`, `findAdjacentGaps()`, `vectorToDirection()`, etc.
2. Reuse utilities to avoid code duplication
3. Test all control methods after changes
4. Remember `vectorToDirection()` has `invert` parameter for gap drag control

### When Modifying Movement Logic
1. Always update both piece positions AND grid state
2. Use incremental grid updates in `tryMove()` - modify only affected cells
3. Only call `buildGridFromState()` when necessary (shuffle, reset, gap randomization)
4. Test with both small and large pieces
5. Ensure gap identity preserved (gaps remember home crop)
6. **IMPORTANT**: `tryMove(dir)` direction is inverted - looks OPPOSITE direction of movement
7. **CRITICAL FOR LARGE GAPS**: Source position lookup must look BEYOND gap's 2×2 extent
8. **MOUSE CONTROL ADJACENCY**: Check ALL 4 cells of large gap, not just top-left

### When Adding Features
- Keep three-file structure (HTML/CSS/JS separation)
- Maintain 80ms transition timing in `puzzle.css`
- Preserve gap identity system
- Ensure keyboard focus on board element
- Follow existing pattern of disabling buttons during operations

### When Debugging
- Check `grid` array state matches visual board
- Verify gap `piece.selected` flags match visual selection
- Ensure large pieces maintain 2×2 coverage in grid
- Validate gap cells use correct format in grid
- Check `pieceById` Map properly populated
- Verify `pieces` array contains all game objects

## Display Settings

The game includes a display settings dialog accessed via the cog icon (⚙):

### Display Settings Dialog
- **Theme**: Auto (system preference), Light, or Dark
- **Challenge box position**: Auto (optimal), Right of board, or Above board
- **Auto-scale to fit screen**: Automatic board resizing (enabled by default)
- **Board size**: Manual slider 50-200% (disabled when auto-scale enabled)
- All settings apply instantly and persist in localStorage

### Challenge Box Position
- **Auto Mode**: Automatically determines optimal position based on available space
- **Manual Modes**: Force position to right or above board
- **Layout Changes**: Vertical layout (right) vs horizontal compact layout (above)

### Theme System
- **Auto Mode**: Detects system preference, updates automatically
- **Light/Dark Modes**: Force specific theme
- Dark mode styles defined in `puzzle.css`

### Auto-Scale Mode
- Adjusts `--tile` CSS variable to fit viewport
- Considers both width and height constraints
- Updates on window resize, board switch, mode change
- Uses iterative approach for proper sizing
- Single-pass on resize for performance

## Dialogs

All dialogs support dismissal via:
- Clicking outside dialog
- Keyboard shortcuts (Enter/Escape)
- Close/cancel button

### Modal Dialog Responsive Behavior
For screens ≤600px wide:
- Dialogs adapt for mobile usability
- Full-width layout with vertical scrolling
- Buttons stack vertically
- Touch-friendly scrolling enabled

### Help Dialog
- Displays comprehensive controls reference
- Organized by input method (keyboard, mouse click, swipe, drag)

### Settings Dialog
- Board selection dropdown
- Gap configuration dropdown
- Gap control buttons (Reset Gaps, Randomize Gaps)
- Wrapping checkboxes
- Free Play mode only

### Challenge Dialog
- Board and gap configuration selection
- Randomize gaps checkbox
- Wrapping checkboxes
- Seed input (optional, numeric)
- Daily Challenge button (populates today's date)
- Steps input with difficulty presets
- Generates random seed if empty

### Display Settings Dialog
- Theme dropdown
- Challenge box position dropdown
- Auto-scale checkbox
- Board size slider

### Congratulations Dialog
- Appears when challenge solved
- Shows move count and time
- Contains OK button

## Key Implementation Details

### Unified Piece System
- All game objects in single `pieces[]` array
- `isGap` flag determines gap vs regular piece
- `isLarge` flag determines 2×2 entity
- Easy conversion via flag toggling

### Gap Randomization System
- Converts pieces to/from gaps by toggling `isGap` flag
- Preserves all piece identities (homeX, homeY unchanged)
- Separates small and large pieces for randomization
- No object creation/destruction

### Large Piece Movement Algorithm
- Uses `calculateLargePieceDestination()` helper
- Handles both 2 aligned small gaps and large gap swapping

### Shuffle Algorithm
Ensures solvability with intelligent move selection:

**Move Selection Strategy**:
1. **Anti-reversal**: Filters out immediate reversals
2. **Hybrid Weighting System**:
   - Gap Distance Heuristic: Encourages gap convergence
   - Adaptive Urgency: Increases bias when large pieces haven't moved
   - Base Weights: Big pieces 10x, small pieces 1x, gap swaps low priority
3. **Mode-Specific Behavior**: Animations in Free Play, instant in Challenge Mode

**Result**: Well-randomized, solvable puzzles with meaningful piece movements.

### Seeded Random Number Generator
- Uses Linear Congruential Generator (LCG) algorithm
- Accepts numeric seeds (0 to 2^32-1)
- Ensures identical puzzles across all browsers
- Combines seed, steps, and board for unique shuffles

## Performance Notes
- Incremental grid updates in `tryMove()` instead of full rebuild
- Skips DOM rendering during Challenge Mode shuffle
- Caches gap pieces array
- CSS transitions GPU accelerated with `will-change`
- `.no-transitions` class for instant Challenge Mode shuffle
- `buildGridFromState()` only called when necessary
- `pieceById` Map provides O(1) lookup