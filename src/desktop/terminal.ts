import * as vscode from "vscode";
import stringWidth from "string-width";

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
  isStandby: () => boolean;
}

class VirtualTerminal implements vscode.Pseudoterminal {
  private writeEmitter = new vscode.EventEmitter<string>();
  private closeEmitter = new vscode.EventEmitter<number | void>();
  private inputEmitter = new vscode.EventEmitter<string>();
  private killEmitter = new vscode.EventEmitter<void>();

  onDidWrite: vscode.Event<string> = this.writeEmitter.event;
  onDidClose: vscode.Event<number | void> = this.closeEmitter.event;

  private isActive = false;
  private isWaitingForKeyPress = false;
  private pendingExitCode?: number;
  private echoEnabled = true;
  private inputBuffer = "";
  private cursorPosition = 0; // カーソル位置（文字単位）

  constructor(private name: string) {}

  // 文字の表示幅を取得
  private getDisplayWidth(str: string): number {
    return stringWidth(str);
  }

  // カーソル位置の文字を取得
  private getCharAtCursor(): string {
    const chars = [...this.inputBuffer];
    return chars[this.cursorPosition] || "";
  }

  // カーソル移動の共通処理
  private moveCursor(direction: "left" | "right"): void {
    const chars = [...this.inputBuffer];

    if (direction === "left" && this.cursorPosition > 0) {
      this.cursorPosition--;
      const char = chars[this.cursorPosition];
      const width = this.getDisplayWidth(char);
      this.writeEmitter.fire("\x1b[" + width + "D");
    } else if (direction === "right" && this.cursorPosition < chars.length) {
      const char = chars[this.cursorPosition];
      const width = this.getDisplayWidth(char);
      this.cursorPosition++;
      this.writeEmitter.fire("\x1b[" + width + "C");
    }
  }

  // カーソルを左に移動
  private moveCursorLeft(): void {
    this.moveCursor("left");
  }

  // カーソルを右に移動
  private moveCursorRight(): void {
    this.moveCursor("right");
  }

  // カーソル位置に文字を挿入
  private insertAtCursor(text: string): void {
    const chars = [...this.inputBuffer];
    chars.splice(this.cursorPosition, 0, ...text);
    this.inputBuffer = chars.join("");

    // カーソル位置から右の文字を再描画（文字単位でスライス）
    const rightChars = [...this.inputBuffer].slice(this.cursorPosition);
    const rightText = rightChars.join("");
    this.writeEmitter.fire(rightText);

    // カーソル位置を更新
    this.cursorPosition += [...text].length;

    // カーソルを正しい位置に戻す
    const remainingChars = [...this.inputBuffer].slice(this.cursorPosition);
    const remainingText = remainingChars.join("");
    if (remainingText.length > 0) {
      this.moveCursorBackward(this.getDisplayWidth(remainingText));
    }
  }

  // カーソル移動のヘルパーメソッド
  private moveCursorBackward(width: number): void {
    if (width > 0) {
      this.writeEmitter.fire(VirtualTerminal.ANSI.CURSOR_LEFT(width));
    }
  }

  // カーソル位置の文字を削除（Delete キー）
  private deleteAtCursor(): void {
    const chars = [...this.inputBuffer];
    if (this.cursorPosition < chars.length) {
      const deletedChar = chars[this.cursorPosition];
      chars.splice(this.cursorPosition, 1);
      this.inputBuffer = chars.join("");

      // カーソル位置から右の文字を再描画
      const rightChars = [...this.inputBuffer].slice(this.cursorPosition);
      const rightText = rightChars.join("");
      const deletedWidth = this.getDisplayWidth(deletedChar);
      this.writeEmitter.fire(rightText + " ".repeat(deletedWidth));

      // カーソルを正しい位置に戻す
      const totalWidth = this.getDisplayWidth(rightText) + deletedWidth;
      this.writeEmitter.fire("\x1b[" + totalWidth + "D");
    }
  }

  // カーソル位置の前の文字を削除（Backspace キー）
  private backspaceAtCursor(): void {
    if (this.cursorPosition > 0) {
      const chars = [...this.inputBuffer];
      const deletedChar = chars[this.cursorPosition - 1];
      chars.splice(this.cursorPosition - 1, 1);
      this.inputBuffer = chars.join("");
      this.cursorPosition--;

      // カーソルを削除する文字の位置まで戻す
      const deletedWidth = this.getDisplayWidth(deletedChar);
      this.writeEmitter.fire("\x1b[" + deletedWidth + "D");

      // カーソル位置から右の文字を再描画
      const rightChars = [...this.inputBuffer].slice(this.cursorPosition);
      const rightText = rightChars.join("");
      this.writeEmitter.fire(rightText + " ".repeat(deletedWidth));

      // カーソルを正しい位置に戻す
      const totalWidth = this.getDisplayWidth(rightText) + deletedWidth;
      this.writeEmitter.fire("\x1b[" + totalWidth + "D");
    }
  }

  // Home キー - 行の先頭に移動
  private moveCursorToHome(): void {
    while (this.cursorPosition > 0) {
      this.moveCursorLeft();
    }
  }

  // End キー - 行の末尾に移動
  private moveCursorToEnd(): void {
    const chars = [...this.inputBuffer];
    while (this.cursorPosition < chars.length) {
      this.moveCursorRight();
    }
  }

  open(initialDimensions: vscode.TerminalDimensions | undefined): void {
    this.isActive = true;
    this.writeEmitter.fire(`=== ${this.name} Terminal Started ===\r\n`);
  }

  close(): void {
    this.isActive = false;
    // バッファをクリア
    this.inputBuffer = "";
    this.cursorPosition = 0;
    this.isWaitingForKeyPress = false;
    this.pendingExitCode = undefined;
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

      // 制御文字は常に処理対象とする
      const charCode = data.charCodeAt(0);

      if (this.echoEnabled) {
        // エコーバック有効時：シェル的な動作

        // ターミナル固有の制御文字処理
        if (this.handleTerminalControlKey(data)) {
          return;
        }

        // 特殊キー処理（エスケープシーケンス）
        if (this.handleSpecialKey(data)) {
          return;
        }

        // 通常の文字入力処理
        if (data === "\x7f" || data === "\b") {
          this.backspaceAtCursor();
        } else if (data === "\r") {
          this.writeEmitter.fire("\r\n");
          this.inputEmitter.fire(this.inputBuffer + "\n");
          this.inputBuffer = "";
          this.cursorPosition = 0;
        } else if (charCode >= 32 || data === "\t") {
          this.insertAtCursor(data);
        } else {
          // その他の制御文字もアプリケーションに送信
          this.inputEmitter.fire(data);
        }
      } else {
        // エコーバック無効時：raw mode - すべての入力をそのまま送信
        this.inputEmitter.fire(data);
      }
    }
  }

  // ターミナル固有の制御文字のみ処理
  private handleTerminalControlKey(data: string): boolean {
    const charCode = data.charCodeAt(0);

    switch (charCode) {
      case 3: // Ctrl+C - ターミナル割り込み
        this.writeEmitter.fire("^C\r\n");
        this.killEmitter.fire();
        this.inputBuffer = "";
        this.cursorPosition = 0;
        return true;

      case 12: // Ctrl+L - 画面クリア（ターミナル機能）
        this.writeEmitter.fire("\x1b[2J\x1b[H");
        if (this.inputBuffer.length > 0) {
          this.writeEmitter.fire(this.inputBuffer);
          const chars = [...this.inputBuffer];
          const rightChars = chars.slice(this.cursorPosition);
          const rightText = rightChars.join("");
          if (rightText.length > 0) {
            const rightWidth = this.getDisplayWidth(rightText);
            this.writeEmitter.fire(`\x1b[${rightWidth}D`);
          }
        }
        return true;

      case 21: {
        // Ctrl+U - 行クリア（ターミナル機能）
        const totalWidth = this.getDisplayWidth(this.inputBuffer);
        if (totalWidth > 0) {
          this.writeEmitter.fire(`\x1b[${totalWidth}D`);
        }
        this.writeEmitter.fire(`\x1b[K`);
        this.inputBuffer = "";
        this.cursorPosition = 0;
        return true;
      }

      default:
        return false;
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

      isStandby: () => {
        return this.isWaitingForKeyPress;
      },
    };
  }

  public dispose(): void {
    this.isActive = false;
    this.writeEmitter.dispose();
    this.closeEmitter.dispose();
    this.inputEmitter.dispose();
    this.killEmitter.dispose();
  }

  // ANSI エスケープコード定数
  private static readonly ANSI = {
    CURSOR_LEFT: (n: number) => `\x1b[${n}D`,
    CURSOR_RIGHT: (n: number) => `\x1b[${n}C`,
    COLOR_RED: "\x1b[31m",
    COLOR_RESET: "\x1b[0m",
    // キーコード
    ARROW_UP: "\x1b[A",
    ARROW_DOWN: "\x1b[B",
    ARROW_RIGHT: "\x1b[C",
    ARROW_LEFT: "\x1b[D",
    DELETE: "\x1b[3~",
    HOME: "\x1b[H",
    END: "\x1b[F",
  } as const;

  // キー入力処理をマップで管理
  private readonly keyHandlers = new Map<string, () => void>([
    [
      VirtualTerminal.ANSI.ARROW_UP,
      () => {
        /* 履歴機能 */
      },
    ],
    [
      VirtualTerminal.ANSI.ARROW_DOWN,
      () => {
        /* 履歴機能 */
      },
    ],
    [VirtualTerminal.ANSI.ARROW_RIGHT, () => this.moveCursorRight()],
    [VirtualTerminal.ANSI.ARROW_LEFT, () => this.moveCursorLeft()],
    [VirtualTerminal.ANSI.DELETE, () => this.deleteAtCursor()],
    [VirtualTerminal.ANSI.HOME, () => this.moveCursorToHome()],
    [VirtualTerminal.ANSI.END, () => this.moveCursorToEnd()],
  ]);

  private handleSpecialKey(data: string): boolean {
    const handler = this.keyHandlers.get(data);
    if (handler) {
      handler();
      return true;
    }
    return false;
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
    {
      terminal: vscode.Terminal;
      pty: VirtualTerminal;
      disposable: vscode.Disposable;
    }
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

    // ターミナルが閉じられた時のクリーンアップ
    const disposable = vscode.window.onDidCloseTerminal((closedTerminal) => {
      if (closedTerminal === terminal) {
        stream.kill();
        this.terminals.delete(options.name);
        pty.dispose();
        disposable.dispose();
      }
    });

    // ターミナルとdisposableを管理用Mapに保存
    this.terminals.set(options.name, { terminal, pty, disposable });

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
      entry.disposable.dispose(); // 追加：disposableも解放
      this.terminals.delete(name);
    }
  }

  public closeAllTerminals(): void {
    for (const [name] of this.terminals) {
      this.closeTerminal(name);
    }
  }

  public dispose(): void {
    // すべてのdisposableを明示的に解放
    for (const [name, entry] of this.terminals) {
      entry.disposable.dispose();
    }
    this.closeAllTerminals();
  }
}

// シングルトンインスタンス
export const terminalManager = new TerminalManager();
