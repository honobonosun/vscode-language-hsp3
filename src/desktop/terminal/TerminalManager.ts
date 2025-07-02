import * as vscode from "vscode";
import { NodePtyTerminal, PseudoTerminalOptions } from "./PseudoTerminal";

export class TerminalManager implements vscode.Disposable {
  private terminals: Array<{
    terminal: vscode.Terminal;
    pty: NodePtyTerminal;
  }> = [];

  /** 新しい擬似ターミナルを生成して表示し、管理対象に追加します */
  public createTerminal(options: PseudoTerminalOptions): vscode.Terminal {
    const pty = new NodePtyTerminal(options);
    const terminal = vscode.window.createTerminal({ name: options.name, pty });
    this.terminals.push({ terminal, pty });
    terminal.show();
    return terminal;
  }

  /** 登録された全ターミナルと PTY を強制終了し、管理リストをクリアします */
  public killAll(): void {
    for (const { terminal, pty } of this.terminals) {
      try {
        pty.close();
      } catch (e) {
        console.error("Failed to close pty:", e);
      }
      try {
        terminal.dispose();
      } catch (e) {
        console.error("Failed to dispose terminal:", e);
      }
    }
    this.terminals = [];
  }

  /** Extension の dispose 時などに呼ばれる */
  public dispose(): void {
    this.killAll();
  }
}

export const terminalManager = new TerminalManager();
