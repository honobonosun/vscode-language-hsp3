/*
 * 計画: デバッグ用ログレベル導入
 *
 * 目的:
 *   - ユーザーには重要情報のみ info レベルで表示
 *   - 内部詳細は debug レベル化して開発者がオンデマンドで参照可能に
 *
 * ログレベル振り分けルール:
 *   - info: ユーザー向け主要イベント通知（起動完了、ユーザー操作反応、エラー）
 *   - debug: 内部メソッド呼び出し、ステートダンプ、リスト内容、詳細トレース
 *
 * TODO:
 * [ ] 1. 現在のログ出力を棚卸し
 * [ ] 2. ログレベル振り分けルール策定
 * [ ] 3. executorLanguageStatusManager.ts 内の log.info → log.debug 置換
 * [ ] 4. 更新完了のサマリを log.info で出力
 * [ ] 5. src/desktop/extension.ts で起動時 debugMode 設定機能を実装
 * [ ] 6. ドキュメント更新用ファイルを作成（README_LOG.md など）
 * [ ] 7. テスト＆リリース実施
 *
 * 進捗管理:
 *    - [ ] 初期ログ棚卸し完了
 *    - [ ] 振り分けルールレビュー
 *    - [ ] コード修正完了
 *    - [ ] デバッグモード機能実装完了
 *    - [ ] ドキュメントファイル作成完了
 *    - [ ] リリース準備完了
 */

import vscode from "vscode";
import { EXTENSION_ID } from "../common/constant";
import { ExecutorItem, CurrentExecutors, CUREXEC } from "./types/executor";
import { LoggerInstance } from "../common/logger";

// 言語バー管理クラス
class LanguageStatusManager {
  private items: {
    run: vscode.LanguageStatusItem;
    make: vscode.LanguageStatusItem;
    help: vscode.LanguageStatusItem;
  };
  private context: vscode.ExtensionContext;
  private getListing: () => ExecutorItem[];
  private validateExecutors: (
    cur: CurrentExecutors,
    list: ExecutorItem[]
  ) => CurrentExecutors;
  private logger: LoggerInstance;

  constructor(
    context: vscode.ExtensionContext,
    getListing: () => ExecutorItem[],
    validateExecutors: (
      cur: CurrentExecutors,
      list: ExecutorItem[]
    ) => CurrentExecutors,
    logger: LoggerInstance
  ) {
    this.context = context;
    this.getListing = getListing;
    this.validateExecutors = validateExecutors;
    this.logger = logger;

    // UI - 複数のLanguageStatusItemを作成
    this.items = {
      run: vscode.languages.createLanguageStatusItem(
        [EXTENSION_ID, "toolset", "run"].join("."),
        { language: "hsp3" }
      ),
      make: vscode.languages.createLanguageStatusItem(
        [EXTENSION_ID, "toolset", "make"].join("."),
        { language: "hsp3" }
      ),
      help: vscode.languages.createLanguageStatusItem(
        [EXTENSION_ID, "toolset", "help"].join("."),
        { language: "hsp3" }
      ),
    };

    this.initialize();
  }

  private initialize() {
    // 各アイテムの初期設定
    this.items.run.text = "Run: Initializing...";
    this.items.run.busy = true;
    this.items.run.command = {
      command: "language-hsp3.executor.select.run",
      title: "Select Run Executor",
      arguments: ["run"],
    };

    this.items.make.text = "Make: Initializing...";
    this.items.make.busy = true;
    this.items.make.command = {
      command: "language-hsp3.executor.select.run",
      title: "Select Make Executor",
      arguments: ["make"],
    };

    this.items.help.text = "Help: Initializing...";
    this.items.help.busy = true;
    this.items.help.command = {
      command: "language-hsp3.executor.select.run",
      title: "Select Help Executor",
      arguments: ["help"],
    };
  }

  updateCurrentExecutor(busy?: boolean) {
    // ログ用セクションを作成
    const log = this.logger.section(
      "LanguageStatusManager.updateCurrentExecutor"
    );
    const cur =
      this.context.workspaceState.get<CurrentExecutors>(CUREXEC) || {};

    // 利用可能なExecutorリストを取得して検証
    const availableList = this.getListing();
    const validatedCur = this.validateExecutors(cur, availableList);

    // デバッグログ: 現在の状態を出力（セクション付き）
    log.debug("updateCurrentExecutor called");
    log.debug(`Current state: ${JSON.stringify(cur)}`);
    log.debug(`Validated state: ${JSON.stringify(validatedCur)}`);
    log.debug(`Available executors count: ${availableList.length}`);
    log.debug(
      `Available uniqueIds: ${availableList
        .map((item) => `${item.name}:${item.uniqueId}`)
        .join(", ")}`
    );

    // uniqueIdから名前を取得する関数
    const getNameByUniqueId = (
      uniqueId: string | undefined,
      defaultName: string
    ): string => {
      if (!uniqueId) {
        log.debug(`No uniqueId for category, using default: ${defaultName}`);
        return defaultName;
      }
      const item = availableList.find((item) => item.uniqueId === uniqueId);
      const result = item ? item.name : defaultName;
      log.debug(`uniqueId "${uniqueId}" -> "${result}" (found: ${!!item})`);
      return result;
    };

    this.items.run.text = `Run: ${getNameByUniqueId(validatedCur.run, "unselected")}`;
    this.items.make.text = `Make: ${getNameByUniqueId(validatedCur.make, "unselected")}`;
    this.items.help.text = `Help: ${getNameByUniqueId(validatedCur.help, "unselected")}`;

    // デバッグログ: 設定後の表示テキスト（セクション付き）
    log.debug(
      `Updated texts: ${JSON.stringify({ run: this.items.run.text, make: this.items.make.text, help: this.items.help.text })}`
    );

    if (busy !== undefined) {
      this.items.run.busy = busy;
      this.items.make.busy = busy;
      this.items.help.busy = busy;
    }
    log.info(
      `Executor updated: ${this.items.run.text}, ${this.items.make.text}, ${this.items.help.text}`
    );
  }

  setBusy(busy: boolean) {
    this.items.run.busy = busy;
    this.items.make.busy = busy;
    this.items.help.busy = busy;
  }

  dispose() {
    this.items.run.dispose();
    this.items.make.dispose();
    this.items.help.dispose();
  }
}

export default LanguageStatusManager;
