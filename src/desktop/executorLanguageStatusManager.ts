import vscode from "vscode";
import { EXTENSION_ID } from "../common/constant";
import { ExecutorItem, CurrentExecutors, CUREXEC } from "./types/executor";

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

  constructor(
    context: vscode.ExtensionContext,
    getListing: () => ExecutorItem[],
    validateExecutors: (
      cur: CurrentExecutors,
      list: ExecutorItem[]
    ) => CurrentExecutors
  ) {
    this.context = context;
    this.getListing = getListing;
    this.validateExecutors = validateExecutors;

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
    const cur =
      this.context.workspaceState.get<CurrentExecutors>(CUREXEC) || {};

    // 利用可能なExecutorリストを取得して検証
    const availableList = this.getListing();
    const validatedCur = this.validateExecutors(cur, availableList);

    // uniqueIdから名前を取得する関数
    const getNameByUniqueId = (
      uniqueId: string | undefined,
      defaultName: string
    ): string => {
      if (!uniqueId) return defaultName;
      const item = availableList.find((item) => item.uniqueId === uniqueId);
      return item ? item.name : defaultName;
    };

    this.items.run.text = `Run: ${getNameByUniqueId(validatedCur.run, "unselected")}`;
    this.items.make.text = `Make: ${getNameByUniqueId(validatedCur.make, "unselected")}`;
    this.items.help.text = `Help: ${getNameByUniqueId(validatedCur.help, "unselected")}`;

    if (busy !== undefined) {
      this.items.run.busy = busy;
      this.items.make.busy = busy;
      this.items.help.busy = busy;
    }
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
