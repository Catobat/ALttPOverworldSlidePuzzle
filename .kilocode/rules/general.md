# Slide Puzzle Game - AI Instructions

## Project Overview
This is a browser-based slide puzzle game with a unique 8×8 grid with mixed-size pieces and dual-gap mechanics. The project is split into three files: HTML for structure, CSS for styling, and JavaScript for game logic.

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

1. **Default Board** (`defaultBoard`) - Slug: `'default'`
   - **Grid Size**: 8×8 (64 cells total)
   - **Image Mode**: `'single'` - One image for entire board
   - **Background Image**: `lightworld.png`
   - **Pieces**: 30 small (1×1) + 8 large (2×2)
   - **Gaps**: 2 gaps at positions (7,6) and (7,7)
   - **Large Pieces**: Top-left corners at (0,0), (3,0), (5,0), (0,3), (3,3), (6,3), (0,6), (5,6)

2. **Horizontal Board** (`horizontalBoard`) - Slug: `'horizontal'`
   - **Grid Size**: 16×8 (128 cells total) - double width
   - **Image Mode**: `'horizontal'` - Two images side by side
   - **Background Images**:
     - Left half (x: 0-7): `lightworld.png`
     - Right half (x: 8-15): `darkworld.png`
   - **Pieces**: 60 small (1×1) + 16 large (2×2)
   - **Gaps**: 2 gaps at positions (15,6) and (15,7) - bottom right of right half
   - **Large Pieces**: Left half mirrors default layout, right half duplicates it shifted 8 tiles right

3. **Vertical Board** (`verticalBoard`) - Slug: `'vertical'`
   - **Grid Size**: 8×16 (128 cells total) - double height
   - **Image Mode**: `'vertical'` - Two images stacked vertically
   - **Background Images**:
     - Top half (y: 0-7): `lightworld.png`
     - Bottom half (y: 8-15): `darkworld.png`
   - **Pieces**: 60 small (1×1) + 16 large (2×2)
   - **Gaps**: 2 gaps at positions (7,14) and (7,15) - bottom right of bottom half
   - **Large Pieces**: Top half mirrors default layout, bottom half duplicates it shifted 8 tiles down

#### Board Configuration Structure
```javascript
const boardConfig = {
  width: 8,              // Board width in tiles
  height: 8,             // Board height in tiles
  imageMode: 'single',   // 'single', 'horizontal', or 'vertical'
  images: {
    primary: 'lightworld.png',    // Primary image (or only image for single mode)
    secondary: 'darkworld.png'    // Secondary image (for horizontal/vertical modes)
  },
  gapPositions: [{x: 7, y: 6}, {x: 7, y: 7}],  // Default gap positions
  largePieces: [         // Large piece top-left corners
    {x: 0, y: 0}, {x: 3, y: 0}, {x: 5, y: 0},
    {x: 0, y: 3}, {x: 3, y: 3}, {x: 6, y: 3},
    {x: 0, y: 6}, {x: 5, y: 6}
  ]
};
```

#### Image Mode Behavior
- **`'single'`**: One image covers the entire board. Background size is full board dimensions.
- **`'horizontal'`**: Two images side by side. Each image covers half the board width and full height. Left half uses primary image, right half uses secondary image.
- **`'vertical'`**: Two images stacked. Each image covers full board width and half the height. Top half uses primary image, bottom half uses secondary image.

### Controls

#### Keyboard Controls
- **Spacebar**: Toggle between the two gaps (switches `selectedGapIdx`)
- **Arrow Keys** (↑↓←→): Slide adjacent piece into selected gap
- **WASD**: Alternative arrow key controls

#### Mouse Controls
- **Left Click on Piece**: Move the piece into an adjacent gap
  - If both gaps are adjacent to the piece, uses the currently selected gap
  - If only one gap is adjacent, automatically uses that gap
- **Swipe on Piece**: Drag ≥5 pixels in a direction (up/down/left/right) to move piece that way
  - Swipe threshold: 5 pixels minimum movement
  - Direction determined by dominant axis (horizontal vs vertical)
  - Only moves if a gap exists in the swipe direction
  - Shows 15px visual preview offset during valid swipe
  - Preview animates smoothly (150ms transition)
  - Works even if mouse leaves board area during swipe
  - For large pieces, checks all 4 cells for gap adjacency
- **Drag on Piece**: Click and hold on a piece, then drag over adjacent gaps to move continuously
  - Piece moves when mouse enters the valid drag region of an adjacent gap
  - Valid region: 75% of gap area (excludes the edge closest to the piece)
  - Gap divided into 4×4 grid: accepts 12 out of 16 squares (3×4 rectangle)
  - Allows multiple moves in a single drag operation
  - Disables swipe controls for the duration of the drag
  - Works with both small (1×1) and large (2×2) pieces
  - Updates piece position after each move to enable continued dragging
- **Swipe on Gap**: Drag ≥5 pixels in a direction to swap with the other gap if adjacent
  - Same swipe mechanics as pieces (5px threshold, preview, etc.)
  - Only swaps if the other gap is adjacent in the swipe direction
- **Drag on Gap**: Click and hold on a gap, then drag over the other gap to swap
  - Swaps when mouse enters the other gap's area
  - Allows continuous swapping during a single drag operation
- **Left Click on Gap**:
  - First click on an unselected gap: Selects the gap (updates selection highlighting)
  - Click on an already-selected gap: Counts how many other gaps are adjacent
    - If exactly 1 gap is adjacent: Swaps with that gap (unambiguous)
    - If 0 or 2+ gaps are adjacent: Does nothing (ambiguous or impossible)
    - This ensures gap swapping only happens when the intent is clear

#### Button Controls
- **Reset Button**: Return to solved state (Free Play) or recreate challenge (Challenge Mode)
- **Shuffle Button**: Randomize board with 250 valid moves (Free Play only)
- **Settings Button** (⚙): Change board size with reset warning (Free Play only)
- **Display Button** (☀): Opens display settings dialog for theme, auto-scaling, and board size
- **New Challenge Button**: Start a new challenge with custom or random seed and board selection
- **Give Up Button**: Return to Free Play mode (Challenge Mode only)
- **Help Button** (?): Opens controls reference dialog

### Movement Rules
1. **Small Pieces (1×1)**: Can move into any adjacent gap
2. **Large Pieces (2×2)**: Require BOTH gaps to be properly aligned on the destination face
3. **Gap Swapping**: Adjacent gaps can swap positions using arrow keys
4. **Selection**: Only the selected gap (highlighted with blue outline) accepts moves
5. **Challenge Completion**: When puzzle is solved in Challenge Mode, all moves are locked and gaps lose highlighting until reset or mode switch

## Code Architecture

### File Structure
```
index.html          # Main HTML structure and page layout
puzzle.css           # All styling (tiles, gaps, animations)
puzzle.js            # Game logic and event handling
lightworld.png       # Puzzle image (8×8 tile grid)
.clinerules          # This AI instructions file
```

### UI Layout

#### Toolbar Structure
The toolbar uses flexbox layout with two groups:
- **`.toolbar`**: Main container with `justify-content: space-between` and `max-width` set dynamically to match current board width
- **`.toolbar-left`**: Left-aligned button group containing:
  - Reset button
  - Shuffle button (hidden in Challenge Mode)
  - New Challenge button
  - Give Up button (shown only in Challenge Mode)
- **`.toolbar-right`**: Right-aligned button group containing:
  - Settings button (⚙) - Opens board selection dialog (hidden in Challenge Mode)
  - Display button (☀) - Opens display settings dialog
  - Help button (?) - Opens controls reference dialog
  
This structure ensures the right buttons stay aligned with the puzzle width rather than extending to the window edge.

### Game Modes

The game has two distinct modes:

#### Free Play Mode (Default)
- **Purpose**: Casual play with no tracking or restrictions
- **Features**:
  - Shuffle button available to randomize the puzzle
  - Reset button returns puzzle to solved state
  - No move counting or time tracking
  - Gap selection highlighting always visible
- **UI Elements**: Reset, Shuffle, New Challenge buttons visible

#### Challenge Mode
- **Purpose**: Solve a specific puzzle configuration with move tracking and timing
- **Activation**:
  - Click "New Challenge" button and provide:
    - **Board**: Select board layout (Default, Horizontal, or Vertical)
    - **Seed**: Numeric value (leave empty for random, range: 0 to 2^32-1)
    - **Steps**: Number of shuffle moves (default 250)
  - Or load via URL parameters: `index.html?seed=12345&steps=250&board=horizontal`
- **Features**:
  - Deterministic puzzle generation using seeded RNG
  - Move counter tracks player moves (starts at 0)
  - Timer tracks elapsed time (starts after shuffle completes)
  - Pause/Resume button (⏸/▶) to pause timer and prevent moves
  - Shuffle button hidden (puzzle is fixed)
  - Reset button recreates the same challenge
  - Challenge info box displays seed, steps, move count, and timer
  - Give Up button switches back to Free Play mode
  - **No shuffle animations**: Shuffle executes instantly without visible transitions
  - **URL synchronization**: Browser URL automatically updates to reflect current mode
- **Challenge Info Layout**:
  - Displays seed and shuffling steps as compact text rows
  - Move Count and Timer displayed side-by-side below
  - Each stat has a small label (0.875rem) above large value (1.425rem)
  - Timer includes pause/resume button (⏸/▶) next to time display
  - Challenge box has min-width of 220px to accommodate "M:SS" time without layout shifts
- **Timer Behavior**:
  - Automatically starts when shuffle completes
  - Can be paused/resumed using the pause button (⏸/▶)
  - Pause button has fixed 28x28px size for consistent appearance
  - When paused, all moves and gap switching are disabled
  - When paused, puzzle board applies blur effect (`filter: blur(8px)`)
  - Blur is isolated to board only using `isolation: isolate` to prevent bleeding onto neighbors
  - When resumed, focus returns to the board automatically for immediate keyboard control
  - Stops automatically when puzzle is solved (without blur effect)
  - Timer button is disabled when puzzle is solved (no pause/resume after completion)
  - Displays in M:SS format (e.g., 2:34 for times under 1 hour, 62:15 for 1 hour 2 minutes)
- **Win Condition**:
  - When puzzle is solved, congratulations dialog appears, showing moves and time
  - All moves and gap switching are locked
  - Timer is frozen
  - Gap selection highlighting is removed
  - "Give Up" button changes to "Free Play"
  - Player can reset challenge or return to Free Play
- **UI Elements**: Reset Challenge, Give Up, New Challenge buttons visible
- **Info Display**: Shows "Challenge", seed number, shuffle steps, move count, and timer with pause button

### Key Data Structures

#### Board Configuration
```javascript
boardConfig          // Object defining board layout
  .width             // Board width in tiles (8)
  .height            // Board height in tiles (8)
  .gapPositions[]    // Array of default gap positions [{x, y}, ...]
  .largePieces[]     // Array of large piece top-left corners [{x, y}, ...]
```

#### State Variables
```javascript
boardConfig          // Currently active board configuration object
currentBoardSlug     // Current board slug ('default', 'horizontal', 'vertical')
boardRegistry        // Map of board slugs to board configuration objects
grid                 // 2D array: null for gaps, objects for pieces
smallTiles[]         // Array of {id, x, y, homeX, homeY, el}
bigTiles[]           // Array of {id, x, y, homeX, homeY, el}
tileById             // Map for quick tile lookup by ID
gaps[]               // [{id, x, y, homeX, homeY}] - gap objects (length = boardConfig.gapPositions.length)
selectedGapIdx       // Index of selected gap (0 to gaps.length-1)
gameMode             // 'freeplay' or 'challenge'
challengeSeed        // Seed used for current challenge (null in Free Play)
challengeSteps       // Number of shuffle steps for challenge (null in Free Play)
challengeBoard       // Board slug for current challenge (null in Free Play)
challengeMoveCount   // Player's move count in Challenge Mode
isShuffling          // Flag to prevent move counting during shuffle
challengeSolved      // Flag indicating if challenge is completed
timerStartTime       // Timestamp when timer started (null when stopped)
timerElapsedTime     // Accumulated elapsed time in milliseconds
timerInterval        // Interval ID for timer updates (100ms)
timerPaused          // Boolean flag indicating if timer is paused
```

#### Grid Cell Format
- `null`: Empty cell (gap)
- `{type:'small', id}`: Small piece
- `{type:'big', id, ox, oy}`: Part of big piece (ox,oy = offset within 2×2)

### Core Functions

#### Background Image Management
- `getBackgroundImageForPosition(x, y)`: Determines which background image a tile should use
  - **Single mode**: Returns `boardConfig.images.primary` for all positions
  - **Horizontal mode**: Returns `primary` for left half (x < width/2), `secondary` for right half
  - **Vertical mode**: Returns `primary` for top half (y < height/2), `secondary` for bottom half
  - Used by `getBackgroundStyleForTile()` to set correct image per tile

- `getBackgroundStyleForTile(homeX, homeY)`: Calculates complete background styling for a tile
  - Returns object with `{image, bgSize, bgPosX, bgPosY}`
  - **Single mode**:
    - Background size covers full board dimensions
    - Position offset by tile's home coordinates
  - **Horizontal mode**:
    - Background size covers half board width, full height
    - Position adjusted for tiles in right half (subtracts halfWidth from X offset)
  - **Vertical mode**:
    - Background size covers full width, half board height
    - Position adjusted for tiles in bottom half (subtracts halfHeight from Y offset)
  - Used by `initTiles()` and `resetState()` to set tile and gap backgrounds

#### Board Management
- `switchBoard(boardSlug)`: Switches to a different board configuration
  - Validates board slug exists in registry
  - Updates `boardConfig` and `currentBoardSlug`
  - Updates board element dimensions dynamically
  - Calls `resetState()` to rebuild puzzle with new board
  - Used by settings dialog and challenge mode

#### Initialization
- `initTiles()`: Creates tile DOM elements and data structures
  - Builds big tiles first from `boardConfig.largePieces` array
  - Creates small tiles for remaining uncovered, non-gap cells
  - Uses `boardConfig.gapPositions` to identify gap cells
  - **Sets background image dynamically** using `getBackgroundStyleForTile()`
  - Applies `backgroundImage`, `backgroundSize`, and `backgroundPosition` to each tile element
- `buildGridFromState()`: Rebuilds grid array from current tile positions
  - Creates grid with dimensions `boardConfig.width` × `boardConfig.height`
  - Places big tiles (occupying 2×2 cells each)
  - Places small tiles (occupying 1 cell each)
  - Carves out gaps (sets cells to null)
- `resetState()`: Resets to solved state
  - Removes existing tile DOM elements
  - Calls `initTiles()` to recreate tiles
  - Initializes gaps from `boardConfig.gapPositions` using `map()` for flexibility
  - **Sets gap backgrounds dynamically** using `getBackgroundStyleForTile()`
  - Calls `buildGridFromState()` and `renderAll()`

#### Rendering
- `renderAll()`: Updates all tile positions in DOM
  - Iterates through `smallTiles` and `bigTiles`
  - Sets CSS `left` and `top` properties based on x,y coordinates
  - Calls `renderGaps()`
- `renderGaps()`: Updates gap positions and selection highlight
  - Positions gap DOM elements at current gap coordinates
  - Toggles `.selected` class based on `selectedGapIdx`

#### Movement Logic
- `tryMove(dir)`: Main movement function
  - **CRITICAL**: The `dir` parameter is counterintuitive - it specifies where to look for something to move INTO the gap, NOT the direction of movement
    - `tryMove('right')` looks at `g.x - 1` (to the LEFT of the gap)
    - `tryMove('left')` looks at `g.x + 1` (to the RIGHT of the gap)
    - `tryMove('down')` looks at `g.y - 1` (ABOVE the gap)
    - `tryMove('up')` looks at `g.y + 1` (BELOW the gap)
  - **For gap swapping**: To swap with a gap that's to the RIGHT, call `tryMove('left')` (not `tryMove('right')`)
  - Calculates source cell and direction vector from selected gap
  - **Gap Swapping**: If adjacent cell is the other gap, swaps their positions
  - **Small Piece Moves**: Moves piece into gap, gap takes piece's former position
  - **Big Piece Moves**:
    - Calculates destination face cells (must be both gaps)
    - Validates both gaps are properly aligned
    - Moves piece and repositions both gaps to freed cells
    - Maintains gap alignment by row/column
  - Returns true on success, false if move is invalid
- `enumerateValidMoves()`: Returns all legal moves for current state
  - Iterates through both gaps and all four directions
  - Checks validity of each potential move
  - Tags each move with metadata: `isBig` (large piece move) and `isGapSwap` (gap swap move)
  - Used by `shuffle()` function

#### Shuffling
- `shuffle(steps, seed)`: Performs intelligent random valid moves with weighted priorities
  - Disables buttons during shuffle
  - Calls `enumerateValidMoves()` to get legal moves
  - **Anti-reversal logic**: Remembers last move and filters out immediate reversals unless no other options exist
  - **Weighted selection** creates varied, interesting shuffles:
    - **Big piece moves**: 10x weight (highest priority) - encourages moving large pieces
    - **Small piece moves**: 1x weight (normal priority)
    - **Gap swaps**: Very low priority (~10% chance when other moves available) - only used frequently when no alternatives
  - Randomly selects from weighted move pool
  - **Animation behavior**:
    - **Free Play Mode**: Shows smooth 80ms transitions, yields to UI every 10 moves
    - **Challenge Mode**: Disables all transitions via `.no-transitions` class, no delays, instant execution
  - Re-enables buttons when complete
  - Default 250 moves provides good randomization with meaningful piece movements

#### Challenge Management
- `startChallenge(seed, steps, boardSlug)`: Initializes a new challenge
  - Sets game mode to 'challenge'
  - Stores seed, steps, and board slug for reset functionality
  - Switches to specified board if different from current
  - Resets move counter to 0
  - Calls `stopTimer()` to clear any previous timer state
  - Updates URL with seed, steps, and board parameters
  - Resets to solved state then shuffles with seed (no animations)
  - Starts timer after shuffle completes
- `switchToFreePlay()`: Returns to Free Play mode
  - Clears challenge data
  - Stops and resets timer
  - Removes URL parameters
  - Restores gap highlighting
  - Keeps current board state
- `updateURL()`: Synchronizes browser URL with game state
  - Adds `?seed=X&steps=Y&board=Z` parameters in Challenge Mode
  - Removes parameters in Free Play mode
  - Uses `window.history.pushState()` for seamless updates
- `checkURLParams()`: Auto-starts challenge from URL on page load
  - Parses `seed`, `steps`, and `board` query parameters
  - Validates board slug against registry (defaults to 'default' if invalid)
  - Automatically enters Challenge Mode if seed and steps parameters present
  - Enables direct linking and bookmarking of specific challenges with board selection
- `checkWinCondition()`: Verifies if puzzle is solved
  - Checks all tiles are in home positions
  - Checks gaps match `boardConfig.gapPositions`
- `handleWin()`: Handles challenge completion
  - Sets `challengeSolved` flag
  - Calls `freezeTimer()` to stop timer without blur
  - Removes gap highlighting
  - Waits for animation to complete
  - Shows congratulations dialog with move count and time
- `updateUIForMode()`: Updates UI based on current mode
  - Shows/hides appropriate buttons (Settings hidden in Challenge Mode)
  - Updates button text
  - Displays/hides challenge info

#### Timer Functions
- `startTimer()`: Starts the challenge timer
  - Resets elapsed time to 0
  - Sets start timestamp
  - Creates 100ms interval to update display
  - Sets pause button to ⏸ icon
- `pauseTimer()`: Pauses the timer and blurs board
  - Stops timer interval
  - Accumulates elapsed time
  - Sets paused flag to true
  - Adds 'paused' class to board (triggers blur effect)
  - Changes button to ▶ icon
- `resumeTimer()`: Resumes the timer from pause
  - Resets start timestamp
  - Clears paused flag
  - Removes 'paused' class from board (removes blur)
  - Returns focus to board for immediate keyboard control
  - Changes button back to ⏸ icon
- `stopTimer()`: Completely stops and resets timer
  - Clears interval
  - Resets all timer state variables
  - Removes 'paused' class
  - Resets display to "0:00"
  - Changes button back to ⏸ icon
- `freezeTimer()`: Stops timer without blur (used on win)
  - Clears interval
  - Resets timer state but keeps elapsed time in display
  - Does NOT add blur effect (unlike pauseTimer)
  - Preserves final time for congratulations dialog
- `formatTime(ms)`: Converts milliseconds to M:SS format
  - Returns string like "2:34" or "62:15" (no hour formatting)
  - Pads seconds with leading zero
- `updateTimer()`: Updates timer display
  - Calculates elapsed time since start + accumulated time
  - Calls formatTime and updates display element

#### Mouse Control Utilities
The mouse control system uses shared utility functions to eliminate code duplication between swipe and drag controls:

- `getCellsForTile(tile, clickedCell, gridX, gridY)`: Returns array of cells to check for a tile
  - Small pieces (1×1): Returns single cell `[{x, y}]`
  - Big pieces (2×2): Returns all 4 cells of the piece
  - Used by all control methods for consistent cell enumeration

- `findAdjacentGaps(cells, gaps)`: Determines which gaps are adjacent to given cells
  - Returns `{gap0: {adjacent, dx, dy}, gap1: {adjacent, dx, dy}}`
  - Checks all cells against both gaps
  - Stores direction vectors for later use
  - Eliminates duplicate adjacency checking logic

- `vectorToDirection(dx, dy, invert)`: Converts direction vector to tryMove() direction string
  - Normal mode: `dx=1, dy=0` → `'right'` (for piece drag)
  - Inverted mode: `dx=1, dy=0` → `'left'` (for gap drag)
  - Handles the counterintuitive tryMove() direction semantics
  - Used by all control methods for consistent direction calculation

- `isInValidDragRegion(mouseX, mouseY, sourceDx, sourceDy)`: Checks if mouse is in valid 75% drag region
  - Excludes the 1/4 edge closest to the source
  - Works for both piece→gap and gap→piece scenarios
  - Uses quarter-tile calculations for precise region detection

- `detectSwipeDirection(startPos, currentPos, threshold)`: Detects swipe direction from mouse movement
  - Returns direction string or `null` if below threshold
  - Uses dominant axis to determine direction
  - Consistent swipe detection across all handlers

- `isGapInSwipeDirection(cells, gap, swipeDir)`: Checks if gap is in swipe direction relative to cells
  - Iterates through cells checking gap position
  - Returns boolean for quick validation
  - Simplifies swipe validation logic

#### Event Handling
- **Keyboard Events**: Attached to `boardEl`
  - Spacebar: Toggles `selectedGapIdx` and calls `renderGaps()` (blocked when challenge solved)
  - Arrow keys/WASD: Calls `tryMove()` with appropriate direction (blocked when challenge solved)

- **Mouse Events**: Use shared utility functions for consistent behavior
  - **Mousedown** (on `boardEl`): Records initial position, time, and grid cell
  - **Mousemove** (on `boardEl`): Handles drag and swipe preview
    - **Gap Drag Control**: Uses `getCellsForTile()`, `isInValidDragRegion()`, and `vectorToDirection()` with invert=true
    - **Piece Drag Control**: Uses `getCellsForTile()`, `isInValidDragRegion()`, and `vectorToDirection()` with invert=false
    - **Swipe Preview**: Uses `detectSwipeDirection()`, `getCellsForTile()`, and `isGapInSwipeDirection()`
    - Applies 5px threshold for swipe detection
    - Shows 15px visual preview offset during valid swipe
    - Clears preview if swipe becomes invalid or drops below threshold
  - **Mouseup** (on `document`): Completes click or swipe action
    - Uses `detectSwipeDirection()` for swipe detection
    - Uses `getCellsForTile()` for cell enumeration
    - Uses `findAdjacentGaps()` for adjacency checking
    - Uses `isGapInSwipeDirection()` for swipe validation
    - Uses `vectorToDirection()` for direction calculation
    - Clears swipe preview transform
    - If swipe detected (≥5px), moves piece in swipe direction if gap exists
    - If no swipe, uses click behavior (selected gap or only adjacent gap)
  - **Clicking on gap**:
    - First click on unselected gap: Selects the gap (updates `selectedGapIdx`)
    - Click on already-selected gap: Counts how many other gaps are adjacent
      - If exactly 1 gap is adjacent: Swaps with that gap using `tryMove()`
      - If 0 or 2+ gaps are adjacent: Does nothing (ambiguous or impossible)
      - This prevents accidental swaps and ensures clear user intent
    - All gap interactions blocked when challenge is solved

- **Button Events**:
  - Reset button: Calls `resetState()` in Free Play or `startChallenge()` in Challenge Mode
  - Shuffle button: Calls `shuffle(250)` (Free Play only)
  - New Challenge button: Opens challenge dialog
  - Give Up button: Calls `switchToFreePlay()` (Challenge Mode only)

### CSS Variables & Styling
Defined in `puzzle.css`:
- `--tile`: 64px (base tile size)
- `.tile.small`: 1×1 tile (64px)
- `.tile.big`: 2×2 tile (128px)
- `.gap.selected`: Blue outline (rgb(100,200,255))
- Transitions:
  - Position: 80ms ease for smooth sliding animation
  - Transform: 150ms ease for swipe preview animation
- `will-change`: left, top, transform (for GPU acceleration)
- `.no-transitions`: Disables all tile and gap transitions (used during Challenge Mode shuffle)

### Background Image Positioning
Each piece shows its "home" portion of the image:
```javascript
backgroundPosition: `-${homeX*tilePx}px -${homeY*tilePx}px`
```
Gaps show darkened version (brightness 0.5) of their default positions, maintaining their identity even when moved.

## Development Guidelines

### When Modifying Mouse Controls
1. Use the shared utility functions to maintain consistency:
   - `getCellsForTile()` for cell enumeration
   - `findAdjacentGaps()` for adjacency checking
   - `vectorToDirection()` for direction conversion
   - `isInValidDragRegion()` for drag region validation
   - `detectSwipeDirection()` for swipe detection
   - `isGapInSwipeDirection()` for swipe validation
2. When adding new control methods, reuse these utilities to avoid code duplication
3. Test all control methods (click, swipe, drag) after making changes
4. Remember that `vectorToDirection()` has an `invert` parameter for gap drag control

### When Modifying Movement Logic
1. Always update both the tile/gap positions AND rebuild the grid
2. Call `buildGridFromState()` after position changes
3. Update DOM with `renderAll()` or specific render functions
4. Test with both small and large pieces
5. Ensure gap identity is preserved (gaps remember their home crop)
6. **IMPORTANT**: Remember that `tryMove(dir)` direction is inverted - it looks in the OPPOSITE direction of where you want to move something. The `vectorToDirection()` utility handles this automatically.

### When Adding Features
- Keep the three-file structure (HTML/CSS/JS separation)
- Maintain the 80ms transition timing for consistency in `puzzle.css`
- Preserve the gap identity system (gaps remember their home crop)
- Ensure keyboard focus on board element for controls to work
- Follow the existing pattern of disabling buttons during operations

### When Debugging
- Check `grid` array state (should match visual board)
- Verify `selectedGapIdx` matches visual selection
- Ensure large pieces maintain 2×2 coverage in grid
- Validate gap positions are always null in grid
- Check that `tileById` Map is properly populated

### Image Requirements
- Image must be square and divisible by 8
- Default: 512×512px (64px per tile)
- Format: PNG with transparency support
- Filename: `lightworld.png` (referenced in `puzzle.css` for `.tile` and `.gap` classes)

## Common Modifications

### Change Board Configuration
The board is now configured via the `boardConfig` object, making it easy to create different board layouts:

1. **Change Board Size**:
   - Update `boardConfig.width` and `boardConfig.height`
   - Adjust `boardConfig.largePieces` array for new layout
   - Adjust `boardConfig.gapPositions` array for new gap locations
   - Update CSS `--tile` variable in `puzzle.css` if needed
   - Provide appropriately sized image

2. **Add Multiple Board Configurations**:
   - Create additional board configuration objects with the same structure
   - Implement board selection UI to switch between configurations
   - Simply swap the active `boardConfig` reference to change boards

3. **Support Variable Gap Count**:
   - Add or remove entries in `boardConfig.gapPositions` array
   - Gap initialization uses `map()` to support any number of gaps
   - Ensure gap-related logic handles variable gap counts appropriately

### Change Tile Size
1. Modify CSS variable in `puzzle.css`: `--tile: 64px;`
2. Image dimensions should be `SIZE * tile_size`
3. No JavaScript changes needed (uses computed style)

### Seeded Random Number Generator
The game includes a `SeededRandom` class for deterministic puzzle generation:
- **Accepts numeric seeds only** (0 to 2^32-1 for optimal LCG performance)
- Uses Linear Congruential Generator (LCG) algorithm with parameters from Numerical Recipes
- Ensures identical puzzles across all browsers and operating systems
- Used by `shuffle()` when seed is provided
- **Combines seed, steps, and board**: The shuffle function creates a combined seed using `((seed ^ (steps << 16) ^ (boardHash << 24)) >>> 0)` to ensure that changing the seed, step count, OR board produces a completely different shuffle
  - Board hash values: default=0, horizontal=1, vertical=2
  - Each parameter occupies different bit ranges to avoid collisions
  - XOR-based approach with bit shifting avoids overflow issues
  - Provides good bit mixing while staying within valid 32-bit unsigned integer range
- Random seed generation uses full 32-bit range: `Math.floor(Math.random() * 4294967296)`

### Move Counting System
In Challenge Mode, moves are tracked:
- `challengeMoveCount` increments on every successful move
- Counter does NOT increment during shuffle (controlled by `isShuffling` flag)
- Counter resets to 0 when starting or resetting a challenge
- Displayed in challenge info box during gameplay
- Shown in congratulations dialog when puzzle is solved

### Win Detection System
Challenge Mode includes automatic win detection:
- `checkWinCondition()` called after each move
- Verifies all tiles are in home positions
- Verifies gaps are in default positions
- When solved:
  - `handleWin()` is called
  - All moves are blocked
  - Gap highlighting is removed
  - Congratulations dialog appears after animation
  - "Give Up" button changes to "Free Play"

### Add Undo Functionality
1. Maintain move history stack
2. Store state snapshots (tile positions, gap positions, selectedGapIdx)
3. Implement reverse move logic
4. Add undo button that pops from history and restores state

## Testing Checklist

### Free Play Mode
- [ ] Small pieces move in all 4 directions
- [ ] Large pieces move only with both gaps aligned
- [ ] Gap selection toggles with spacebar
- [ ] Adjacent gaps can swap positions
- [ ] Reset button returns to solved state
- [ ] Shuffle creates solvable configuration
- [ ] Image crops display correctly on all pieces
- [ ] Transitions are smooth (80ms)
- [ ] Keyboard focus works after page load
- [ ] WASD keys work as alternative controls

### Challenge Mode
- [ ] New Challenge dialog opens and accepts numeric seed/steps
- [ ] Random seed generates when field is empty (0 to 2^32-1)
- [ ] Same seed produces identical puzzle
- [ ] Shuffle executes instantly without visible animations
- [ ] URL updates with seed and steps parameters
- [ ] Direct URL access auto-starts challenge (e.g., `?seed=12345&steps=250`)
- [ ] Move counter starts at 0 and increments correctly
- [ ] Move counter doesn't increment during shuffle
- [ ] Shuffle button is hidden
- [ ] Give Up button is visible
- [ ] Challenge info displays seed, steps, and moves
- [ ] Reset Challenge recreates same puzzle
- [ ] Win detection triggers when puzzle is solved
- [ ] Congratulations dialog shows after animation
- [ ] All moves are blocked when solved
- [ ] Gap highlighting is removed when solved
- [ ] "Give Up" changes to "Free Play" when solved
- [ ] Switching to Free Play preserves board state and removes URL parameters
- [ ] Gap highlighting restores when switching to Free Play

## Performance Notes
- `shuffle()` behavior varies by mode:
  - **Free Play**: Uses `await` every 10 moves to prevent UI freezing, shows animations
  - **Challenge Mode**: Runs at full speed with no delays, disables transitions for instant execution
- CSS transitions in `puzzle.css` handled by browser (GPU accelerated with `will-change`)
- `.no-transitions` class disables all tile/gap transitions during Challenge Mode shuffle
- `buildGridFromState()` is O(n²) but n=8 so negligible
- No memory leaks: tiles reused on reset via `initTiles()`
- `tileById` Map provides O(1) tile lookup

## Browser Compatibility
- Modern browsers (ES6+ required)
- CSS Grid and Flexbox support needed
- Tested on Chrome, Firefox, Safari, Edge
- Mouse and keyboard controls supported
- Touch events: Mouse click events work on touch devices
- Uses `will-change` CSS property for performance

## Display Settings

The game includes a unified display settings dialog accessed via the sun icon (☀) in the toolbar:

### Display Settings Dialog
- **Display Button**: Sun icon (☀) in right toolbar group
- **Settings Include**:
  - **Dark theme**: Checkbox to toggle between light and dark modes
  - **Challenge box above board**: Checkbox to position challenge info box above the board instead of to the right
  - **Auto-scale to fit screen**: Checkbox to enable automatic board resizing for mobile devices
  - **Board size**: Slider to manually adjust board size from 50% to 200% (disabled when auto-scale is enabled)
- **Instant Application**: All settings apply immediately without requiring confirmation
- **Persistence**: All preferences saved to localStorage and restored on page load

### Challenge Box Position
- **Default Position**: Challenge info box appears to the right of the puzzle board
- **Above Board Position**: When enabled via Display Settings, challenge box moves above the board
- **Layout Changes**:
  - **Right Side (default)**: Vertical layout with full info display
    - Title at top
    - Seed and steps on separate rows
    - Move count and timer in columns below with large values
    - Min-width of 220px to prevent layout shifts
  - **Above Board**: Horizontal compact layout
    - Uses CSS `order: -1` to position above board
    - All information arranged in a single row
    - Title, seed, and steps appear on the left
    - Move count and timer on the right
    - Smaller fonts for compact display
    - Width constrained to content (uses `width: auto` and `align-self: flex-start`)
- **Benefits of Above Board**:
  - Board can use full window width
  - Particularly useful for larger boards (Horizontal 16×8, Vertical 8×16)
  - Better for mobile/narrow viewports
  - Reduces horizontal scrolling on small screens
- **CSS Implementation**:
  - Controlled by `body.challenge-above` class
  - Game container switches from row to column layout via flexbox
  - Challenge info rows display inline with spacing
  - Stats group changes from vertical to horizontal with baseline alignment

### Dark Mode
- **Implementation**: Adds/removes `dark-mode` class on body element
- **Styling**: Dark mode styles defined in `puzzle.css`
  - Background: #1a1a1a (dark)
  - Text: #e0e0e0 (light)
  - Buttons: #2a2a2a background with #555 borders
  - Challenge info: Translucent blue background maintained
  - Dialogs: #2a2a2a background with adjusted colors
  - Form inputs: Dark backgrounds with light text
  - Primary buttons: Adjusted blue tones for dark mode
  - All UI elements styled for consistency in dark mode

### Auto-Scale Mode
- **Default State**: Off by default
- **How It Works**: When enabled, adjusts the `--tile` CSS variable to fit the viewport
- **Calculation**: `newTileSize = (viewportWidth - 40px - challengeBoxSpace) / boardConfig.width`
  - 40px padding accounts for body margins
  - `challengeBoxSpace` accounts for challenge info box width when positioned to the right (274px total)
  - Tile size rounds down to nearest pixel
- **Iterative Sizing**: Uses an iterative approach for non-resize events to ensure proper sizing
  - Repeatedly applies scaling and checks if board width changed
  - Continues until board size stabilizes or max iterations reached (20)
  - Each iteration waits for DOM to settle (double RAF + 10ms delay)
  - Only used for setting changes and board switches, not window resize
- **Responsive**: Updates automatically when window is resized (single-pass for performance)
- **Board-Aware**: Recalculates when switching between board sizes (Default 8×8, Horizontal 16×8, Vertical 8×16)
- **Mode-Aware**: Recalculates when switching between Free Play and Challenge Mode (challenge box affects available space)
- **Layout-Aware**: Recalculates when changing challenge box position (above vs right side)

### Manual Board Size
- **Range**: 50% to 200% in 10% increments
- **Default**: 100% (64px tiles)
- **Behavior**: Disabled when auto-scale is enabled
- **Implementation**: Scales the base tile size by the selected percentage

### Implementation Details

#### State Variables
```javascript
baseTilePx        // Constant: original tile size (64px)
tilePx            // Variable: current tile size (changes with settings)
autoFitEnabled    // Boolean: whether auto-scale is active
boardSizeScale    // Number: manual board size percentage (50-200)
```

#### Key Functions
- `applyBoardSize()`: Applies either auto-scale or manual board size
  - Adds/removes `auto-fit` class on body element
  - **Auto-scale enabled**: Uses iterative approach to ensure proper sizing
    - Repeats `updateAutoFitScale()` up to 20 times
    - Checks board width after each iteration
    - Stops when board size stabilizes (no change between iterations)
    - Each iteration scheduled via `requestAnimationFrame` + 10ms delay
    - Ensures board is properly sized even when DOM hasn't fully settled
  - **Manual scale**: Applies percentage-based scaling
    - Updates toolbar max-width and board dimensions
    - Calls `renderAll()` to update tile positions
  
- `updateAutoFitScale()`: Calculates and applies responsive sizing (single pass)
  - Measures viewport width
  - Accounts for challenge box space when positioned to the right
  - Compares against board width at base tile size
  - If board is too wide: calculates new tile size, updates CSS variable, updates `tilePx`
  - If board fits naturally: resets to base tile size
  - Updates toolbar max-width to match board width dynamically
  - Updates board dimensions via calc() expressions
  - Calls `renderAll()` to reposition tiles
  - Temporarily disables transitions during resize (via `.no-transitions` class)

- `getBackgroundPositionCalc(homeX, homeY)`: Generates CSS calc() expressions for background positioning
  - Returns calc() expressions that reference `var(--tile)`
  - Backgrounds automatically adjust when `--tile` changes
  - **Single mode**: Simple offset multiplication
  - **Horizontal mode**: Adjusts X offset for right half tiles (subtracts halfWidth)
  - **Vertical mode**: Adjusts Y offset for bottom half tiles (subtracts halfHeight)
  - Used by `initTiles()` and `resetState()` to set tile/gap backgrounds

#### Integration Points (Auto-Fit Triggers)
When auto-scale is enabled, `applyBoardSize()` is called in these scenarios:
- **Initialization**: Applied on page load after preferences are loaded
- **Auto-scale toggle**: When enabling/disabling auto-scale in display settings
- **Board switching**: When changing board layout (Default/Horizontal/Vertical)
- **Board size slider**: When manually adjusting board size (only if auto-scale is disabled)
- **Challenge box position**: When toggling challenge box position (above vs right side)
- **Game mode changes**: When switching between Free Play and Challenge Mode
- **Window resize**: Uses single-pass `updateAutoFitScale()` (debounced, no iteration for performance)

### Background Positioning Strategy
To support dynamic tile resizing:
- **Approach**: CSS calc() expressions
- **Benefits**: Backgrounds automatically scale when `--tile` variable changes
- **Multi-image handling**: `getBackgroundPositionCalc()` correctly offsets tiles in horizontal/vertical boards

### Mobile Compatibility
- **Touch Controls**: Work correctly at all scales
- **Coordinate Mapping**: Uses natural element dimensions (no transform-based scaling)
- **Visual Alignment**: Board dimensions match interactive areas perfectly
- **Responsive**: Updates dynamically when device is rotated or window resized

### Performance Considerations
- Disables transitions during resize operations to prevent visual glitches
- Uses debounced resize events to avoid excessive recalculations
- Double requestAnimationFrame ensures DOM layout is complete before measuring
- Toolbar max-width updates synchronously with board width changes

## Dialogs

All dialogs support the following dismissal methods:
- Clicking outside the dialog (on the overlay background) using mousedown event
- Keyboard shortcuts (Enter/Escape as appropriate for each dialog)
- Clicking the designated close/cancel button

### Help Dialog
- Opened by clicking the "?" help button in the toolbar
- Displays comprehensive controls reference organized by input method:
  - **Keyboard**: Spacebar for gap switching, arrow keys/WASD for movement
  - **Mouse Click**: Click piece to move, click gap to select
  - **Mouse Swipe**: Swipe piece or gap to move in that direction
  - **Mouse Drag**: Drag piece over gaps or gap over pieces for continuous movement
- Includes note about large piece and gap swap mechanics
- Contains "Got it" button to close
- Enter/Escape keys close dialog
- Click outside dialog to close
- Returns focus to board when closed

### Settings Dialog
- Opened by "Settings" button (⚙) in Free Play mode only
- Contains:
  - Board selection dropdown with three options:
    - Default (8×8)
    - Horizontal (16×8)
    - Vertical (8×16)
  - Warning message: "Changing the board will reset the puzzle to its solved state"
  - Apply button
  - Cancel button
- Enter key applies changes
- Escape key cancels
- Click outside dialog to cancel
- Applies board change and resets puzzle when confirmed

### Challenge Dialog
- Opened by "New Challenge" button
- Contains:
  - Board selection dropdown (same options as Settings dialog)
  - Seed input field (type="number", optional, min=0)
    - "Daily Challenge" button next to seed input
    - Clicking "Daily Challenge" populates seed with today's date in YYYYMMDD format (e.g., 20251125)
    - Enables sharing daily challenges with consistent seeds across all players
  - Steps input field (type="number", default 250, min=1, max=10000)
  - Difficulty preset buttons: Easy (50), Normal (250), Hard (1000), Very Hard (10000)
  - Start Challenge button
  - Cancel button
- Board selection defaults to currently active board
- Enter key starts challenge
- Escape key cancels
- Click outside dialog to cancel
- Generates random seed (0 to 2^32-1) if field is empty
- Only accepts numeric seeds for deterministic LCG behavior

### Display Settings Dialog
- Opened by "Display" button (☀) in toolbar
- Contains:
  - Dark theme checkbox - Toggles dark mode instantly
  - Auto-scale checkbox - Enables automatic board resizing, disables size slider when active
  - Board size slider - Adjusts board size from 50% to 200% (disabled when auto-scale is enabled)
  - Close button
- All settings apply instantly (no confirmation needed)
- Escape key closes dialog
- Click outside dialog to close
- Returns focus to board when closed

### Congratulations Dialog
- Appears when challenge is solved
- Shows after 100ms delay (allows animation to complete)
- Displays move count and time
- Contains OK button
- Enter/Escape keys close dialog
- Click outside dialog to close
- Returns focus to board when closed

## Key Implementation Details

### Gap Identity System
Gaps maintain their identity throughout the game:
- Each gap has an `id` ('G0' or 'G1')
- Each gap remembers its `homeX` and `homeY` for image cropping
- Gap DOM elements have fixed `background-position` based on home
- When gaps move, their identity follows them (not their position)

### Large Piece Movement Algorithm
In `tryMove()` for big pieces:
1. Calculate destination face cells (2 cells in movement direction)
2. Calculate freed cells (2 cells on opposite face)
3. Verify both destination cells are gaps
4. Verify selected gap is one of the destination cells
5. Map each gap to corresponding freed cell (aligned by row/col)
6. Move piece and reposition both gaps simultaneously

### Shuffle Algorithm
`shuffle(steps, seed)` ensures solvability with intelligent move selection:
- Only uses valid moves from current state
- Never creates impossible configurations
- Uses `enumerateValidMoves()` to get legal moves with metadata
- **Animation control**: Detects game mode and disables transitions in Challenge Mode

**Move Selection Strategy:**
1. **Anti-reversal**: Tracks last move (`lastMove` variable local to shuffle function)
   - Filters out moves that would immediately reverse the previous move
   - Only allows reversal if it's the only available move
   - Prevents pointless back-and-forth oscillations

2. **Weighted Priorities**: Creates weighted array for random selection
   - **Big piece moves** (2×2 tiles): Added 10 times → 10x probability
     - Encourages more frequent large piece movements
     - Makes shuffles more visually interesting and challenging
   - **Small piece moves** (1×1 tiles): Added 1 time → normal probability
   - **Gap swaps** (adjacent gaps swapping positions): Very low priority
     - Only 10% chance of being included when other moves exist
     - Used normally only when they're the sole available move
     - Prevents excessive gap repositioning without piece movement

3. **Fallback Safety**: If weighted array is empty (rare edge case), uses all filtered moves

4. **Mode-Specific Behavior**:
   - **Free Play Mode**: Shows animations, yields to UI periodically
   - **Challenge Mode**: Adds `.no-transitions` class to board, runs at full speed, no delays

**Result**: Default 250 moves creates well-randomized, solvable puzzles with:
- Frequent large piece movements (more challenging)
- Minimal pointless gap swaps (more purposeful)
- No immediate move reversals (more efficient randomization)
- Guaranteed solvability (only valid moves used)
- Hidden shuffle sequence in Challenge Mode (no information leakage)