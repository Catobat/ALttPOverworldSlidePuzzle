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
This project uses a modular ES6 architecture with strict separation of concerns between HTML, CSS, and JavaScript modules. Each module has a specific responsibility (movement logic, input handling, rendering, etc.).

**Key Rules:**
- Maintain separation: no inline styles or scripts in HTML
- Keep code in the appropriate module based on its responsibility
- Modules receive state via `getState()` function - never store state references at module level

See [`Documentation.md`](Documentation.md) for complete details on file structure, module organization, and state management patterns.

### Documentation Updates
- **ALWAYS** update [`Documentation.md`](Documentation.md) after adding new functionality or making significant changes
- Keep the technical documentation comprehensive and accurate
- For player-facing changes (new features, controls, game modes), **CONSIDER** updating [`README.md`](README.md)
- Keep [`README.md`](README.md) brief and user-focused - only include what players need to know

**What to Include in Documentation:**
- **Cross-cutting concerns** - Information relevant across multiple parts of the codebase (e.g., game modes, state management patterns, module communication)
- **Important architectural decisions** - Design patterns and structural choices that affect how code should be written
- **Non-obvious behavior** - Things that aren't immediately clear from reading a single function or file
- **Global constraints** - Rules that must be followed throughout the codebase

**What NOT to Include:**
- **Implementation details** - How a specific function works internally (belongs in code comments)
- **Obvious information** - Things that are self-explanatory from the code or description
- **Changelog-style entries** - Focus on current state, not history of changes
- **Excessive examples** - Only include examples when the description alone isn't clear

**Keep Documentation Focused:**
- Only document the most important things - overly detailed documentation becomes unusable
- If something only matters when looking at a specific file or function, document it there with comments instead

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