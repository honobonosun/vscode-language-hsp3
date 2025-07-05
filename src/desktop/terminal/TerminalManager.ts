import * as vscode from "vscode";
import type { LoggerInstance } from "../../common/logger";

export interface TerminalOptions {
  mode: "direct" | "shell";
  shellPath?: string;
  shellArgs?: string[];
  commands?: string[];
  cwd?: string;
  env?: Record<string, string>;
  name?: string;
  waitForKeyPress?: boolean;
}

export interface ManagedTerminal {
  id: string;
  terminal: vscode.Terminal;
  options: TerminalOptions;
  createdAt: Date;
}

export class TerminalManager {
  private terminals: Map<string, ManagedTerminal> = new Map();
  private logger: LoggerInstance;
  private log: ReturnType<LoggerInstance['section']>;
  private terminalCounter = 0;

  constructor(logger: LoggerInstance) {
    this.logger = logger;
    this.log = logger.section("terminal-manager");
  }

  public createTerminal(options: TerminalOptions): string {
    const id = `hsp3-terminal-${++this.terminalCounter}`;
    const terminal = this.buildTerminal(options);

    const managedTerminal: ManagedTerminal = {
      id,
      terminal,
      options,
      createdAt: new Date(),
    };

    this.terminals.set(id, managedTerminal);
    terminal.show();

    this.log.debug(`Terminal created: ${id}`);
    return id;
  }

  private buildTerminal(options: TerminalOptions): vscode.Terminal {
    const { mode, cwd, env, name = "HSP3", waitForKeyPress = false } = options;
    this.log.debug(`Building terminal with waitForKeyPress: ${waitForKeyPress}`);

    if (mode === "direct") {
      const { shellPath, shellArgs = [] } = options;
      if (!shellPath) {
        throw new Error("shellPath is required for direct mode");
      }

      return vscode.window.createTerminal({
        name,
        cwd,
        env,
        shellPath,
        shellArgs,
      });
    } else {
      const { shellPath, shellArgs, commands = [] } = options;

      const terminal = vscode.window.createTerminal({
        name,
        cwd,
        env,
        shellPath,
        shellArgs,
      });

      // コマンドを順次実行
      commands.forEach((command) => {
        terminal.sendText(command, true);
      });

      // キー入力待機コマンドを追加
      if (waitForKeyPress) {
        const waitCommand = this.getWaitCommand();
        this.log.debug(`Adding wait command: ${waitCommand}`);
        terminal.sendText(waitCommand, true);
      } else {
        this.log.debug("waitForKeyPress is false, not adding wait command");
      }

      return terminal;
    }
  }

  private getWaitCommand(): string {
    // プラットフォームに応じたキー入力待機コマンドを返す
    switch (process.platform) {
      case "win32":
        return "pause";
      case "darwin":
      case "linux":
        return 'read -p "Press any key to continue..." -n1';
      default:
        return "read -p \"Press any key to continue...\" -n1";
    }
  }

  public sendText(
    terminalId: string,
    text: string,
    addNewLine: boolean = true
  ): void {
    const managedTerminal = this.terminals.get(terminalId);
    if (!managedTerminal) {
      throw new Error(`Terminal not found: ${terminalId}`);
    }
    managedTerminal.terminal.sendText(text, addNewLine);
  }

  public disposeTerminal(terminalId: string): void {
    const managedTerminal = this.terminals.get(terminalId);
    if (managedTerminal) {
      managedTerminal.terminal.dispose();
      this.terminals.delete(terminalId);
      this.log.debug(`Terminal disposed: ${terminalId}`);
    }
  }

  public disposeAll(): void {
    for (const [id, managedTerminal] of this.terminals) {
      managedTerminal.terminal.dispose();
      this.log.debug(`Terminal disposed: ${id}`);
    }
    this.terminals.clear();
  }

  public getTerminalCount(): number {
    return this.terminals.size;
  }

  public getTerminalIds(): string[] {
    return Array.from(this.terminals.keys());
  }
}
