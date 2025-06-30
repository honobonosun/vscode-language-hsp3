# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a VS Code extension for HSP3 (Hot Soup Processor 3) language support. It provides syntax highlighting, compiler integration, and development tools for HSP3 programming.

## Common Commands

### Development
- `npm run dev` - Start development build with watch mode (desktop version)
- `npm run dev:web` - Start development build with watch mode (web version)
- `npm run build` - Build for production (both desktop and web versions)
- `npm run build:desktop` - Build desktop version only
- `npm run build:web` - Build web version only

### Testing and Quality
- `npm test` - Run Jest tests
- `npm run lint` - Run ESLint on TypeScript files
- `npm run clean` - Clean output directory

### Packaging
- `npm run package` - Create VSIX package for distribution

## Architecture

### Dual-Platform Support
The extension supports both desktop and web environments:
- **Desktop version** (`src/desktop/`): Full-featured with file system access and external tool execution
- **Web version** (`src/web/`): Limited functionality for browser-based VS Code

### Core Components

#### Configuration System (`src/common/config.ts`)
- Reactive configuration management with listener support
- Handles VS Code workspace settings changes
- Provides typed configuration access

#### Executor System (`src/desktop/executor.ts`)
- Manages HSP3 compiler execution
- Supports multiple compiler versions through `executor.paths` configuration
- Handles encoding conversion (Shift_JIS ↔ UTF-8)

#### Language Support
- **Parser** (`src/desktop/hsp/parser.ts`): HSP3 syntax analysis
- **Lexer** (`src/desktop/hsp/lexer.ts`): Token generation
- **Outline** (`src/desktop/outline.ts`): Document symbol provider

#### Helper Tools
- **Helpman** (`src/desktop/helpman.ts`): HDL documentation search
- **Terminal** (`src/desktop/terminal.ts`): Terminal integration with cursor control
- **Toolset** (`src/desktop/toolset.ts`): Development tool management

### Key Features

#### Multi-Executor Support
The extension can manage multiple HSP3 compiler installations through the `language-hsp3.executor.paths` configuration, allowing users to switch between different versions.

#### Wine Compatibility
Supports running HSP3 compiler through Wine on Linux/macOS via the `wineMode` setting.

#### Internationalization
Uses i18next for localization support (Japanese and English).

## Development Notes

### File Structure
- `src/common/` - Shared code between desktop and web versions
- `src/desktop/` - Desktop-specific functionality
- `src/web/` - Web-specific functionality
- `syntaxes/` - TextMate grammar files for syntax highlighting
- `locales/` - Internationalization files

### Build System
Uses Webpack with separate configurations for desktop (Node.js target) and web (webworker target) versions.

### Testing
Jest is configured with TypeScript support. Tests should be placed alongside source files with `.test.ts` or `.spec.ts` extensions.

### Code Style
- ESLint with TypeScript support
- Prettier for code formatting
- Strict TypeScript configuration
- Uses functional programming patterns with factory functions

## Extension Capabilities

### Commands
- `language-hsp3.run` - Execute HSP3 program (Ctrl+K F5)
- `language-hsp3.make` - Compile to executable (Ctrl+F9)
- `language-hsp3.RunWithArgs` - Execute with arguments
- `language-hsp3.changeOfExecutor` - Switch compiler version
- `language-hsp3.helpman.search` - Search HSP3 documentation (Ctrl+F1)

### Configuration
All extension settings are prefixed with `language-hsp3.` and support workspace-level configuration.

### Security
The extension includes security constraints for untrusted workspaces, restricting access to compiler paths and execution commands.