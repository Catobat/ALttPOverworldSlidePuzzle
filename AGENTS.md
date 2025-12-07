# Coding Rules for AI Assistants

This file contains specific rules and guidelines for AI coding assistants working on this repository.

## Testing and Execution Rules

### Browser Testing
- **DO NOT** open browsers or attempt to test the application yourself unless explicitly requested by the user
- When changes are made, provide clear testing instructions for the user

### Terminal Commands
- **DO NOT** execute terminal commands unless explicitly requested by the user

## Project-Specific Rules

### Modular Architecture
This project uses a modular ES6 architecture with separation of concerns:

**HTML & CSS:**
- [`index.html`](index.html) - Structure only (loads [`puzzle.js`](puzzle.js) as ES6 module)
- [`puzzle.css`](puzzle.css) - Styling only

**JavaScript Modules:**
- [`puzzle.js`](puzzle.js) - Core game logic, state management, UI handlers (main entry point)
- [`moves.js`](moves.js) - Movement logic and validation
- [`input.js`](input.js) - Input handling (mouse, touch, keyboard)
- [`shuffle.js`](shuffle.js) - Shuffle algorithm and quality scoring
- [`render.js`](render.js) - DOM rendering and visual updates

**MAINTAIN** this separation when making changes:
- Don't add inline styles to HTML
- Don't add inline scripts to HTML
- Keep movement logic in [`moves.js`](moves.js)
- Keep input handling in [`input.js`](input.js)
- Keep rendering logic in [`render.js`](render.js)
- Keep shuffle algorithm in [`shuffle.js`](shuffle.js)
- Core logic and coordination stays in [`puzzle.js`](puzzle.js)

**State Management:**
- Modules receive state via a `getState()` function that returns current state
- This ensures modules always work with up-to-date references when boards are switched
- Never store state object references at module level - always get fresh state when needed

### Documentation Updates
- **ALWAYS** update [`Documentation.md`](Documentation.md) after adding new functionality or making significant changes
- Keep the technical documentation comprehensive and accurate
- For player-facing changes (new features, controls, game modes), **CONSIDER** updating [`README.md`](README.md)
- Keep [`README.md`](README.md) brief and user-focused - only include what players need to know

### Documentation Style
- **DO NOT** include line numbers when referencing code in documentation
- Reference code by function names, variable names, class names, or other stable identifiers
- Line numbers change frequently and make documentation maintenance difficult
- Example: Use `initTiles()` instead of `initTiles() (line 92)`

### After Making Changes
- **WAIT** for user confirmation of success
- **PROVIDE** clear testing instructions
- **DON'T** assume everything works without testing

### Input Behavior
- **CHECK** [`Documentation.md`](Documentation.md) before changing mouse or keyboard input behavior for the game board or core game mechanics
- Verify that changes don't break any intended existing behavior as documented

### UI Responsiveness
- **ENSURE** all UI elements remain usable on small screens, including phones
- Make modal windows scrollable to prevent content from being cut off
- Keep the automatic board scaling system updated when adding new UI elements