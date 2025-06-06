import * as vscode from "vscode";

export interface TerminalStream {
  write(data: string): void;
  writeLine(data: string): void;
  writeError(data: string): void;
  close(exitCode?: number): void;
  closeWithKeyWait(exitCode?: number): void;
  cancelKeyWait(): void;
  kill(): void;
  onInput: vscode.Event<string>;
  onKill: vscode.Event<void>;
}

class VirtualTerminal implements vscode.Pseudoterminal {
  private writeEmitter = new vscode.EventEmitter<string>();
  private closeEmitter = new vscode.EventEmitter<number | void>();
  private inputEmitter = new vscode.EventEmitter<string>();
  private killEmitter = new vscode.EventEmitter<void>();

  onDidWrite: vscode.Event<string> = this.writeEmitter.event;
  onDidClose: vscode.Event<number | void> = this.closeEmitter.event;

  private isActive = false;
  private isWaitingForKeyPress = false; // キー入力待ち状態を管理
  private pendingExitCode?: number; // 保留中の終了コード

  constructor(private name: string) {}

  open(initialDimensions: vscode.TerminalDimensions | undefined): void {
    this.isActive = true;
    this.writeEmitter.fire(`=== ${this.name} Terminal Started ===\r\n`);
  }

  close(): void {
    this.isActive = false;
  }

  handleInput(data: string): void {
    if (this.isActive) {
      if (this.isWaitingForKeyPress) {
        // キー入力待ち中の場合、任意のキーで終了
        this.isWaitingForKeyPress = false;
        this.writeEmitter.fire(`\r\n`);
        this.closeEmitter.fire(this.pendingExitCode);
        this.isActive = false;
        return;
      }
      this.inputEmitter.fire(data); // イベントとして発火
    }
  }

  // ストリーム機能の実装
  public getStream(): TerminalStream {
    return {
      write: (data: string) => {
        if (this.isActive) {
          this.writeEmitter.fire(data);
        }
      },

      writeLine: (data: string) => {
        if (this.isActive) {
          this.writeEmitter.fire(data + "\r\n");
        }
      },

      writeError: (data: string) => {
        if (this.isActive) {
          // ANSI エスケープシーケンスで赤色表示
          this.writeEmitter.fire(`\x1b[31m${data}\x1b[0m\r\n`);
        }
      },

      close: (exitCode?: number) => {
        if (this.isActive) {
          this.writeEmitter.fire(
            `\r\n=== Process finished with exit code: ${exitCode ?? 0} ===\r\n`
          );
          this.closeEmitter.fire(exitCode);
          this.isActive = false;
        }
      },

      closeWithKeyWait: (exitCode?: number) => {
        if (this.isActive && !this.isWaitingForKeyPress) {
          this.writeEmitter.fire(
            `\r\n=== Process finished with exit code: ${exitCode ?? 0} ===\r\n`
          );
          this.writeEmitter.fire(
            `ターミナルは再利用されます。閉じるには任意のキーを押してください...\r\n`
          );
          this.isWaitingForKeyPress = true;
          this.pendingExitCode = exitCode;
        }
      },

      cancelKeyWait: () => {
        if (this.isActive && this.isWaitingForKeyPress) {
          this.writeEmitter.fire(`\r\n=== Key wait cancelled ===\r\n`);
          this.isWaitingForKeyPress = false;
          this.pendingExitCode = undefined;
        }
      },

      kill: () => {
        this.killEmitter.fire();
      },

      onInput: this.inputEmitter.event,
      onKill: this.killEmitter.event,
    };
  }

  public dispose(): void {
    this.isActive = false;
    this.writeEmitter.dispose();
    this.closeEmitter.dispose();
    this.inputEmitter.dispose();
    this.killEmitter.dispose();
  }
}

export interface TerminalOptions {
  name: string;
  iconPath?: vscode.ThemeIcon;
  cwd?: string;
  showOnCreate?: boolean;
}

export class TerminalManager {
  private terminals = new Map<
    string,
    { terminal: vscode.Terminal; pty: VirtualTerminal }
  >();

  public createTerminal(options: TerminalOptions): {
    terminal: vscode.Terminal;
    stream: TerminalStream;
  } {
    const pty = new VirtualTerminal(options.name);
    const stream = pty.getStream();
    const terminal = vscode.window.createTerminal({
      name: options.name,
      pty: pty,
      iconPath: options.iconPath || new vscode.ThemeIcon("terminal"),
    });

    // ターミナルを管理用Mapに保存
    this.terminals.set(options.name, { terminal, pty });

    // ターミナルが閉じられた時のクリーンアップ
    const disposable = vscode.window.onDidCloseTerminal((closedTerminal) => {
      if (closedTerminal === terminal) {
        stream.kill();
        this.terminals.delete(options.name);
        pty.dispose();
        disposable.dispose();
      }
    });

    if (options.showOnCreate !== false) {
      terminal.show();
    }

    return {
      terminal,
      stream,
    };
  }

  public getTerminal(name: string): {
    terminal: vscode.Terminal;
    stream: TerminalStream;
  } {
    const entry = this.terminals.get(name);
    if (!entry) {
      throw new Error(`Terminal '${name}' not found`);
    }
    return {
      terminal: entry.terminal,
      stream: entry.pty.getStream(),
    };
  }

  public hasTerminal(name: string): boolean {
    return this.terminals.has(name);
  }

  public closeTerminal(name: string): void {
    const entry = this.terminals.get(name);
    if (entry) {
      entry.terminal.dispose();
      entry.pty.dispose();
      this.terminals.delete(name);
    }
  }

  public closeAllTerminals(): void {
    for (const [name] of this.terminals) {
      this.closeTerminal(name);
    }
  }

  public dispose(): void {
    this.closeAllTerminals();
  }
}

// シングルトンインスタンス
export const terminalManager = new TerminalManager();
