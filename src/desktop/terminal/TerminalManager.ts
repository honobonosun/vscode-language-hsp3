import * as vscode from "vscode";
import type { LoggerInstance } from "../../common/logger";
import type { ConfigInstance } from "../../common/config";

export interface TerminalOptions {
  mode: "direct" | "shell";
  shellPath?: string;
  shellArgs?: string[];
  commands?: string[];
  cwd?: string;
  env?: Record<string, string>;
  name?: string;
  waitForKeyPress?: boolean;
  preserveFocus?: boolean;
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
  private log: ReturnType<LoggerInstance["section"]>;
  private terminalCounter = 0;
  private config: ConfigInstance;
  private context?: vscode.ExtensionContext;
  private disposables: vscode.Disposable[] = [];

  constructor(
    logger: LoggerInstance,
    config: ConfigInstance,
    context?: vscode.ExtensionContext
  ) {
    this.logger = logger;
    this.log = logger.section("terminal-manager");
    this.config = config;
    this.context = context;

    // ターミナルが閉じられたときのイベントハンドラを設定
    this.disposables.push(
      vscode.window.onDidCloseTerminal((terminal) => {
        this.handleTerminalClosed(terminal);
      })
    );
  }

  private handleTerminalClosed(terminal: vscode.Terminal): void {
    // 管理されているターミナルを検索
    for (const [id, managedTerminal] of this.terminals) {
      if (managedTerminal.terminal === terminal) {
        this.terminals.delete(id);
        this.log.debug(
          `Terminal closed and removed from manager: ${id} (remaining: ${this.terminals.size})`
        );
        break;
      }
    }
  }

  public async createTerminal(options: TerminalOptions): Promise<string> {
    // ターミナル数制限チェック
    await this.checkTerminalLimit();

    const id = `hsp3-terminal-${++this.terminalCounter}`;
    const terminal = this.buildTerminal(options);

    const managedTerminal: ManagedTerminal = {
      id,
      terminal,
      options,
      createdAt: new Date(),
    };

    this.terminals.set(id, managedTerminal);

    // フォーカス制御オプションを設定から取得
    const preserveFocus =
      options.preserveFocus ??
      this.config.get<boolean>("terminal.preserveFocus", false);
    terminal.show(preserveFocus);

    this.log.debug(
      `Terminal created: ${id} (total: ${this.terminals.size}), preserveFocus: ${preserveFocus}`
    );
    return id;
  }

  private buildTerminal(options: TerminalOptions): vscode.Terminal {
    const { mode, cwd, env, name = "HSP3", waitForKeyPress = false } = options;
    const enablePersistence = this.config.get<boolean>(
      "terminal.enablePersistence",
      false
    );
    const isTransient = !enablePersistence;
    this.log.debug(
      `Building terminal with waitForKeyPress: ${waitForKeyPress}, persistence: ${enablePersistence}, isTransient: ${isTransient}`
    );

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
        isTransient,
      });
    } else {
      const { shellPath, shellArgs, commands = [] } = options;

      const terminal = vscode.window.createTerminal({
        name,
        cwd,
        env,
        shellPath,
        shellArgs,
        isTransient,
      });

      // コマンドを順次実行
      commands.forEach((command) => {
        terminal.sendText(command, true);
      });

      // シェルモードではwaitForKeyPressは通常不要
      // （シェルが残るため、ターミナルは自動的に閉じない）
      if (waitForKeyPress) {
        const waitCommand = this.getWaitCommand();
        this.log.debug(`Adding wait command: ${waitCommand}`);
        terminal.sendText(waitCommand, true);
      } else {
        this.log.debug(
          "waitForKeyPress is false, not adding wait command (shell mode keeps terminal open)"
        );
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
        return 'read -p "Press any key to continue..." -n1';
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

    // イベントハンドラも破棄
    this.disposables.forEach((disposable) => disposable.dispose());
    this.disposables = [];
  }

  public getTerminalCount(): number {
    return this.terminals.size;
  }

  public getTerminalIds(): string[] {
    return Array.from(this.terminals.keys());
  }

  private async checkTerminalLimit(): Promise<void> {
    // 設定値を詳細にログ出力して確認
    const maxCount = this.config.get<number>("terminal.maxCount", 5);
    const autoCleanup = this.config.get<boolean>("terminal.autoCleanup", false);
    const currentCount = this.terminals.size;

    this.log.debug(
      `Config values - maxCount: ${maxCount} (type: ${typeof maxCount}), autoCleanup: ${autoCleanup} (type: ${typeof autoCleanup})`
    );
    this.log.debug(
      `Terminal count check: ${currentCount}/${maxCount}, autoCleanup: ${autoCleanup}`
    );

    if (currentCount >= maxCount) {
      this.log.debug(`Terminal limit reached: ${currentCount}/${maxCount}`);
      if (autoCleanup) {
        this.log.debug("Auto cleanup enabled, cleaning up oldest terminals");
        await this.cleanupOldestTerminals(currentCount - maxCount + 1);
      } else {
        this.log.debug("Auto cleanup disabled, showing notification");
        // 通知を非同期で表示（ターミナル作成をブロックしない）
        this.showTerminalLimitNotification(maxCount).catch((error) => {
          this.log.error("Failed to show terminal limit notification:", error);
        });
      }
    } else {
      this.log.debug(`Terminal limit not reached: ${currentCount}/${maxCount}`);
    }
  }

  private async cleanupOldestTerminals(count: number): Promise<void> {
    const sortedTerminals = Array.from(this.terminals.entries())
      .sort(([, a], [, b]) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, count);

    for (const [id] of sortedTerminals) {
      this.log.debug(`Auto-cleaning up terminal: ${id}`);
      this.disposeTerminal(id);
    }
  }

  private async showTerminalLimitNotification(maxCount: number): Promise<void> {
    if (!this.context) return;

    const notificationKey = "hsp3.notification.terminalLimit.shown";
    const hasShown = this.context.globalState.get(notificationKey, false);

    if (hasShown) {
      this.log.debug("Terminal limit notification already shown");
      return;
    }

    const action = await vscode.window.showWarningMessage(
      `HSP3ターミナルが${maxCount}個に達しました。自動削除を有効にできます。`,
      "設定を開く",
      "今後表示しない"
    );

    if (action === "設定を開く") {
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "language-hsp3.terminal"
      );
    } else if (action === "今後表示しない") {
      await this.context.globalState.update(notificationKey, true);
      this.log.debug("Terminal limit notification disabled");
    }
  }
}
