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
- `npm test` - Run Jest tests (with pre-lint check)
- `npm run lint` - Run ESLint on TypeScript files
- `npm run emit` - Run TypeScript compiler type checking only
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
- Integrates with PseudoTerminal for real-time output display

#### Language Support
- **Parser** (`src/desktop/hsp/parser.ts`): HSP3 syntax analysis
- **Lexer** (`src/desktop/hsp/lexer.ts`): Token generation
- **Outline** (`src/desktop/outline.ts`): Document symbol provider

#### Helper Tools
- **Helpman** (`src/desktop/helpman.ts`): HDL documentation search
- **PseudoTerminal** (`src/desktop/terminal/PseudoTerminal.ts`): Node.js PTY-based terminal integration
- **Toolset** (`src/desktop/toolset.ts`): Advanced multi-command execution system
- **Argument Parser** (`src/desktop/utils/argParser.ts`): Command-line argument parsing with quote handling

### Key Features

#### Multi-Executor Support
The extension can manage multiple HSP3 compiler installations through the `language-hsp3.executor.paths` configuration, allowing users to switch between different versions.

#### Advanced Toolset System
Supports complex multi-command workflows through `language-hsp3.executor.toolset` configuration:
- Sequential command execution with error handling
- Per-command environment variables and encoding settings  
- Shell vs. direct execution modes
- Continuation on error control

#### Wine Compatibility
Supports running HSP3 compiler through Wine on Linux/macOS via the `wineMode` setting.

#### Real-time Terminal Integration
Uses Node.js PTY for real-time compiler output display in dedicated VS Code terminals.

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

### Key Dependencies
- **node-pty**: Real-time terminal integration for desktop version
- **zod**: Configuration schema validation
- **i18next**: Internationalization support
- **iconv-lite**: Character encoding conversion

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

#### Key Settings
- `executor.paths`: Multi-compiler support configuration
- `executor.toolset`: Advanced multi-command execution workflows
- `env.whitelist/blacklist`: Environment variable access control
- `debugMode`: Enhanced debug logging

### Security
The extension includes security constraints for untrusted workspaces, restricting access to compiler paths and execution commands. Environment variable access is controlled through whitelist/blacklist configurations.