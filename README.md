# Slide Puzzle Game

A browser-based slide puzzle game featuring mixed-size pieces and dual-gap mechanics.

## Features

- **Multiple Board Sizes**: Choose from Default (8×8), Horizontal (16×8), or Vertical (8×16) layouts
- **Mixed Piece Sizes**: Small (1×1) and large (2×2) pieces
- **Dual-Gap System**: Two movable gaps that pieces slide into
- **Gap Randomization**: Optionally randomize which cells act as gaps (Free Play and Challenge Mode)
- **Wrapping Options**: Enable horizontal and/or vertical wrapping for toroidal board topology
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
- **Edit Board**: Change board shape, randomize gaps, and toggle wrapping (Free Play only)
- **New Challenge**: Start a seeded puzzle with move tracking, gap randomization, and wrapping options
- **Give Up**: Return to Free Play mode (Challenge Mode only)
- **Display** (⚙): Adjust theme, auto-scaling, and board size
- **Help** (?): View all controls

## Challenge Mode

Create deterministic puzzles that can be shared via URL:
```
index.html?seed=12345&steps=250&board=horizontal
```

- Choose a board layout (Default, Horizontal, or Vertical)
- Enter a numeric seed (or leave empty for random)
- Specify shuffle steps (default: 250)
- Optionally randomize gap positions
- Enable horizontal and/or vertical wrapping
- Track your moves and time
- Share challenges via URL (includes all settings)

## Technical Details

For comprehensive technical documentation, game mechanics, and development guidelines, see [`Documentation.md`](Documentation.md).

## Quick Start

1. Open [`index.html`](index.html) in a modern web browser
2. Use keyboard or mouse to slide pieces
3. Try the shuffle button or start a challenge!

## Requirements

- Modern web browser with ES6+ support
- No installation or build process required