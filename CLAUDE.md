# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

The project sources live at the repository root (App.tsx, types.ts, screens/, components/, data/, store/ are all top-level). Run commands directly from the repo root — there is no nested project folder.

### Core Commands
- **Development server**: `npm run dev` - Runs Vite development server
- **Build**: `npm run build` - Creates production build in `dist/` directory
- **Preview**: `npm run preview` - Preview the production build locally
- **Install dependencies**: `npm install`

### Environment Setup
- Set `GEMINI_API_KEY` in `.env.local` for AI integration features
- The app is configured for GitHub Pages deployment with base path `/monocrome-eclips/`

## Project Architecture

This is a React-based turn-based RPG game called "Monochrome: The Eclipse" built with Vite, TypeScript, and modern React patterns.

### State Management Architecture
The application uses **Zustand** with a slice-based architecture for state management:

- **Main Store** (`store/gameStore.ts`): Combines all slices using Zustand middleware
- **Slices** (`store/slices/`):
  - `metaSlice.ts`: Meta progression and persistent data
  - `playerSlice.ts`: Player character, resources, patterns, skills
  - `explorationSlice.ts`: Stage navigation and world map
  - `combatSlice.ts`: Battle system, coins, patterns, combat logic
  - `eventSlice.ts`: Random events and story encounters
  - `uiSlice.ts`: UI state, modals, effects, tooltips

State persists only meta progression to localStorage via Zustand persist middleware.

### Screen-Based Navigation
Game uses state-driven screen switching via `GameState` enum:
- **MenuScreen**: Main menu and game start
- **CharacterSelectScreen**: Character creation and selection
- **ExplorationScreen**: Stage navigation and node selection
- **CombatScreen**: Turn-based combat system
- **ShopScreen**: Item and skill purchasing
- **RestScreen**: Healing and rest mechanics
- **EventScreen**: Story events and choices
- **MemoryAltarScreen**: Skill management and upgrades
- **GameOverScreen/VictoryScreen**: End game states

### Game Data Structure
Game content is defined in data files with TypeScript interfaces:
- `dataCharacters.ts`: Playable character definitions
- `dataSkills.ts`: Skill system with patterns and effects
- `dataMonsters.ts`: Enemy definitions and AI
- `dataEvents.ts`: Random event scenarios
- `dataShop.ts`: Shop items and pricing
- `dataUpgrades.ts`: Character progression upgrades
- `types.ts`: Core TypeScript interfaces and enums

### Combat System
- **Coin-based mechanics**: Players use coins with different faces/patterns
- **Pattern detection**: Specific coin combinations trigger skills
- **Turn-based**: Player and enemy alternate actions
- **Skill replacement**: Dynamic skill learning and forgetting system

### Key Technologies
- **React 19** with TypeScript for UI
- **Framer Motion** for animations and transitions
- **Zustand** for state management with Immer for immutable updates
- **Vite** for build tooling and development
- **Lucide React** for iconography

### File Organization
- `/screens/`: Screen components for each game state
- `/components/`: Reusable UI components and modals
- `/store/`: Zustand store and slices
- `/utils/`: Utility functions and helpers
- Root level: Game data, types, and configuration

## Deployment

The project auto-deploys to GitHub Pages via GitHub Actions workflow (`.github/workflows/deploy.yml`) on pushes to main branch.