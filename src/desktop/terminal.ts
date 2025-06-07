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
  private エコーバック = true;
  private inputBuffer = "";
  private cursorPosition = 0; // カーソル位置（文字単位）

  constructor(private name: string) {}

  // 文字の表示幅を取得
  private getDisplayWidth(str: string): number {
    return stringWidth(str);
  }

  // 文字列の最後の1文字を削除
  private removeLastCharacter(str: string): {
    newStr: string;
    removedChar: string;
  } {
    if (str.length === 0) {
      return { newStr: str, removedChar: "" };
    }

    const iterator = [...str].reverse();
    const lastChar = iterator[0];
    const newStr = str.slice(0, str.length - lastChar.length);

    return { newStr, removedChar: lastChar };
  }

  // カーソル位置の文字を取得
  private getCharAtCursor(): string {
    const chars = [...this.inputBuffer];
    return chars[this.cursorPosition] || "";
  }

  // カーソルを左に移動
  private moveCursorLeft(): void {
    if (this.cursorPosition > 0) {
      this.cursorPosition--;
      const char = this.getCharAtCursor();
      const width = this.getDisplayWidth(char);
      this.writeEmitter.fire("\x1b[" + width + "D");
    }
  }

  // カーソルを右に移動
  private moveCursorRight(): void {
    const chars = [...this.inputBuffer];
    if (this.cursorPosition < chars.length) {
      const char = chars[this.cursorPosition];
      const width = this.getDisplayWidth(char);
      this.cursorPosition++;
      this.writeEmitter.fire("\x1b[" + width + "C");
    }
  }

  // カーソル位置に文字を挿入
  private insertAtCursor(text: string): void {
    const chars = [...this.inputBuffer];
    chars.splice(this.cursorPosition, 0, text);
    this.inputBuffer = chars.join("");

    // カーソル位置から右の文字を再描画
    const rightText = this.inputBuffer.slice(this.cursorPosition);
    this.writeEmitter.fire(rightText);

    // カーソル位置を更新（文字数で計算）
    const textChars = [...text];
    this.cursorPosition += textChars.length;

    // カーソルを正しい位置に戻す
    const remainingText = this.inputBuffer.slice(this.cursorPosition);
    if (remainingText.length > 0) {
      const width = this.getDisplayWidth(remainingText);
      this.writeEmitter.fire("\x1b[" + width + "D");
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
      const rightText = this.inputBuffer.slice(this.cursorPosition);
      this.writeEmitter.fire(rightText + " ");

      // カーソルを正しい位置に戻す
      const width = this.getDisplayWidth(rightText + " ");
      this.writeEmitter.fire("\x1b[" + width + "D");
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
      const rightText = this.inputBuffer.slice(this.cursorPosition);
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

      if (this.エコーバック) {
        // エコーバック有効時：カーソル機能と文字入力処理

        // エスケープシーケンス（矢印キーなど）の処理
        if (data === "\x1b[A") {
          // 上矢印キー - 履歴機能があれば実装
          return;
        } else if (data === "\x1b[B") {
          // 下矢印キー - 履歴機能があれば実装
          return;
        } else if (data === "\x1b[C") {
          // 右矢印キー
          this.moveCursorRight();
          return;
        } else if (data === "\x1b[D") {
          // 左矢印キー
          this.moveCursorLeft();
          return;
        } else if (data === "\x1b[3~") {
          // Delete キー
          this.deleteAtCursor();
          return;
        } else if (data === "\x1b[H") {
          // Home キー
          this.moveCursorToHome();
          return;
        } else if (data === "\x1b[F") {
          // End キー
          this.moveCursorToEnd();
          return;
        }

        // 通常の文字入力処理
        if (data === "\x7f" || data === "\b") {
          // バックスペース
          this.backspaceAtCursor();
        } else if (data === "\r") {
          // Enter キー
          this.writeEmitter.fire("\r\n");
          this.inputEmitter.fire(this.inputBuffer + "\n");
          this.inputBuffer = "";
          this.cursorPosition = 0;
        } else if (data.charCodeAt(0) >= 32 || data === "\t") {
          // 通常の文字とタブ文字
          this.insertAtCursor(data);
        }
        // 制御文字（Ctrl+C など）は無視
      } else {
        // エコーバック無効時：すべての入力をそのまま発火（カーソル機能なし）
        this.inputEmitter.fire(data);
      }
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
