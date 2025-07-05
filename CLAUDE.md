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
- Integrates with TerminalManager for VS Code standard terminal execution

#### Language Support
- **Parser** (`src/desktop/hsp/parser.ts`): HSP3 syntax analysis
- **Lexer** (`src/desktop/hsp/lexer.ts`): Token generation
- **Outline** (`src/desktop/outline.ts`): Document symbol provider

#### Helper Tools
- **Helpman** (`src/desktop/helpman.ts`): HDL documentation search
- **TerminalManager** (`src/desktop/terminal/TerminalManager.ts`): Multi-terminal management with VS Code standard terminal integration
- **Toolset** (`src/desktop/toolset.ts`): Advanced multi-command execution system with enhanced variable substitution
- **Argument Parser** (`src/desktop/utils/argParser.ts`): Command-line argument parsing with quote handling
- **Variable Substitution** (`src/desktop/utils/substitution.ts`): Enhanced variable expansion with file path detection

### Key Features

#### Multi-Executor Support
The extension can manage multiple HSP3 compiler installations through the `language-hsp3.executor.paths` configuration, allowing users to switch between different versions.

#### Advanced Toolset System
Supports complex multi-command workflows through `language-hsp3.executor.toolset` configuration:
- Sequential command execution with error handling
- Per-command environment variables and encoding settings  
- Shell vs. direct execution modes (using VS Code standard terminal API)
- Continuation on error control
- Shell configuration is optional (uses VS Code default when omitted)

#### Wine Compatibility
Supports running HSP3 compiler through Wine on Linux/macOS via the `wineMode` setting.

#### VS Code Terminal Integration
Uses VS Code standard terminal API for compiler execution and output display:
- **Multi-Terminal Management**: TerminalManager handles multiple concurrent terminal instances with unique IDs
- **Direct Mode**: Creates terminal with `shellPath` and `shellArgs` for direct command execution
- **Shell Mode**: Creates terminal with specified shell (or VS Code default) and sends commands via `sendText()`
- **Resource Management**: Automatic cleanup of terminal resources on extension deactivation
- **Execution Tracking**: Terminal instances are tracked with metadata including creation time and options
- Supports both vscode.dev and desktop environments
- No external dependencies required for terminal functionality

#### Enhanced Variable Substitution
Advanced variable expansion system with intelligent path handling:
- **File Path Detection**: Automatically identifies file path variables (`*FILEPATH*`, `*EDITORPATH*`, etc.) using minimatch patterns
- **Selective Path Expansion**: Only applies `expandPath` to actual file path variables, leaving option arguments untouched
- **Callback Support**: Allows custom variable classification logic via callback functions
- **Security**: Uses secure path expansion (`expandPath`) for file variables while performing simple string replacement for others
- **Pattern Matching**: Supports configurable patterns for identifying file path variables

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
- **zod**: Configuration schema validation
- **i18next**: Internationalization support
- **iconv-lite**: Character encoding conversion

Note: node-pty dependency has been completely removed in favor of VS Code standard terminal API for better compatibility, build reliability, and reduced bundle size. The new TerminalManager provides superior terminal management with proper resource cleanup.

### Testing
Jest is configured with TypeScript support. Tests should be placed alongside source files with `.test.ts` or `.spec.ts` extensions.

### Code Style
- ESLint with TypeScript support
- Prettier for code formatting
- Strict TypeScript configuration
- Uses functional programming patterns with factory functions

### Technical Implementation Details

#### TerminalManager Architecture
The TerminalManager follows a centralized resource management pattern:
- **Instance Management**: Maintains a Map of terminal instances with unique string IDs
- **Lifecycle Control**: Handles creation, tracking, and disposal of terminal resources
- **Mode Support**: Supports both direct execution and shell-based command execution
- **Resource Cleanup**: Provides `disposeAll()` method for extension deactivation

#### Variable Substitution System
The enhanced `substituteVariables` function provides intelligent variable expansion:
```typescript
substituteVariables(template, context, {
  filePathPatterns: ["*FILEPATH*", "*EDITORPATH*", "*PATH*", "*DIR*"],
  isFilePathVariable: (varName) => varName.endsWith("PATH")
});
```
- File path variables are processed with secure path expansion
- Non-file variables use simple string replacement to prevent unintended path resolution
- Supports both pattern matching and callback-based variable classification

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

## Research & Investigation Results

### Terminal Exit Code Detection (2025-07-05)

**Status**: Not implemented but feasible with current VS Code API

#### Current Implementation Gap
- No `onDidCloseTerminal` event handlers in TerminalManager.ts
- No `terminal.exitStatus` checking
- `continueOnError` setting exists in schema but not functionally implemented
- Sequential command execution lacks exit code validation

#### VS Code Terminal API Capabilities
- `onDidCloseTerminal` event provides exit status information
- `exitStatus.code` contains process exit code (0=success, non-0=error)
- `exitStatus.reason` provides termination reason
- Terminal exit code detection is fully supported by current VS Code API

#### Recommended Implementation
```typescript
vscode.window.onDidCloseTerminal(terminal => {
  if (terminal.exitStatus) {
    handleCommandResult(terminal.exitStatus.code, continueOnError);
  }
});
```

#### Terminal Modes Behavior
- **Direct Mode**: Process ends → Terminal closes (VS Code default behavior)
- **Shell Mode**: Shell remains → Terminal stays open
- **Persistence Options**: `hideFromUser`, `isTransient` available but not utilized

### Terminal Output Capture (2025-07-05)

**Status**: Shell Integration API available (VS Code v1.99+) - **Not applicable to current project**

#### API Evolution
- `onDidWriteTerminalData` API: Deprecated due to performance concerns, never stable
- Shell Integration API: Current solution (VS Code v1.99+)

#### Shell Integration API Features
- `window.onDidStartTerminalShellExecution` - Command start events
- `window.onDidEndTerminalShellExecution` - Command end events
- `TerminalShellExecution.read()` - Stream access to command output

#### Version Constraints & Project Impact
- **Minimum Version**: VS Code v1.99+ required
- **Project Compatibility**: Not applicable due to version constraints
- **Alternative Approaches**: File-based output redirection, external process communication

#### Shell Integration Setup
```bash
# Manual setup for zsh users
[[ "$TERM_PROGRAM" == "vscode" ]] && . "$(code --locate-shell-integration-path zsh)"
```

#### Supported Shells
- Linux/macOS: bash, fish, pwsh, zsh
- Windows: Git Bash, pwsh

#### Reference Documentation
- [Shell Integration API解説 (Zenn)](https://zenn.dev/jtechjapan_pub/articles/de02f0f2652366)
- [VS Code Shell Integration 公式ドキュメント](https://code.visualstudio.com/docs/terminal/shell-integration)
- [VS Code v1.99 リリースノート](https://code.visualstudio.com/updates/v1_99)