# Slide Puzzle Game

A browser-based slide puzzle game featuring mixed-size pieces and dual-gap mechanics.

## Features

- **Multiple Board Sizes**: Choose from Default (8×8), Horizontal (16×8), or Vertical (8×16) layouts
- **Mixed Piece Sizes**: Small (1×1) and large (2×2) pieces
- **Dual-Gap System**: Two movable gaps that pieces slide into
- **Two Game Modes**:
  - **Free Play**: Casual play with shuffle, reset, and board selection
  - **Challenge Mode**: Solve seeded puzzles with move tracking and shareable URLs

## Controls

### Keyboard
- **Spacebar**: Toggle between gaps
- **Arrow Keys** or **WASD**: Move pieces into selected gap

### Mouse
- **Click on Piece**: Move it into an adjacent gap (uses selected gap if both adjacent)
- **Swipe on Piece**: Drag in a direction to move piece that way (also works with gaps)
- **Drag on Piece**: Hold and drag over adjacent gaps to move continuously (works similarly with gaps)
- **Click on Gap**: Select that gap

### Buttons
- **Reset**: Return to solved state (Free Play) or restart challenge
- **Shuffle**: Randomize the puzzle (Free Play only)
- **Settings**: Change board size (Free Play only)
- **New Challenge**: Start a seeded puzzle with move tracking
- **Give Up**: Return to Free Play mode (Challenge Mode only)

## Challenge Mode

Create deterministic puzzles that can be shared via URL:
```
index.html?seed=12345&steps=250&board=horizontal
```

- Choose a board layout (Default, Horizontal, or Vertical)
- Enter a numeric seed (or leave empty for random)
- Specify shuffle steps (default: 250)
- Track your moves and time
- Share challenges via URL (includes board selection)

## Technical Details

For comprehensive technical documentation, game mechanics, and development guidelines, see [`.kilocode/rules/general.md`](.kilocode/rules/general.md).

## Quick Start

1. Open [`index.html`](index.html) in a modern web browser
2. Use keyboard or mouse to slide pieces
3. Try the shuffle button or start a challenge!

## Requirements

- Modern web browser with ES6+ support
- No installation or build process required