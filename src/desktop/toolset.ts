import vscode from "vscode";
import { TOOLSET_HSP3_EXTENSION_ID, EXTENSION_ID } from "../common/constant";
import { ConfigInstance } from "../common/config";
import { ExtMgrInstance } from "../common/extmgr";
import { LoggerInstance } from "../common/log";
import { z } from "zod";
import { Result } from "../common/types";
import LanguageStatusManager from "./executorLanguageStatusManager";
import {
  ExecutorItem,
  CurrentExecutors,
  CUREXEC,
  ExecutorItemCategory,
} from "./types/executor";

/*
設計変更メモ（2025-06-30）

ToDo: executor選択・保存の不具合修正
- [ ] 既定のExecutorItem生成を関数化する
- [ ] executorリスト（listing）の取得と選択状態（CurrentExecutors）の整合性を常に保つ
- [ ] showSelectで選択後、必ず最新のlisting()からuniqueIdを保存する
- [ ] 初回起動やCurrentExecutorsが空の場合は既定値（default run/make/help）を自動選択し、infoレベルでログ出力する
- [ ] 設定変更等で選択中Executorが消えた場合は、そのカテゴリのみ未選択（undefined）に戻し、infoまたはwarnレベルでログ出力する
- [ ] languageStatusManager.updateCurrentExecutor()で、CurrentExecutorsが未選択（undefined）の場合は「未選択」とUIに明示表示する
- [ ] validateCurrentExecutorsで不整合があった場合、該当カテゴリは未選択（undefined）にする
- [ ] コード全体でlist変数の扱いを整理し、listing()の結果を一貫して利用する
- [ ] 上記修正後、選択・保存・表示の一連の流れをテストする

【仕様メモ】
- 復元に使用するCurrentExecutorsはカテゴリ毎に設定を保持し、未設定（undefined）が許容されている。
- 初回起動やCurrentExecutorsが空の場合は既定値（default run/make/help）を自動選択し、infoレベルでログ出力する。
- 設定変更等で選択中Executorが消えた場合は、そのカテゴリのみ未選択（undefined）に戻し、infoまたはwarnレベルでログ出力する。
- 言語バーは、該当カテゴリが未選択（undefined）の場合、「未選択」と明示表示する。
- 既定のCurrentExecutorsは116行目から定義している。
- listing時は見つかった内容をlogでinfoレベルで出力する。
*/

// Executor設定のスキーマ
const executorPathSchema = z.object({
  hide: z.boolean().default(false),
  platform: z.enum(["win32", "linux", "darwin"]).optional(),
  path: z.string().min(1, "実行ファイルパスが必要です"),
  encoding: z.string().default("Shift_JIS"),
  buffer: z.number().int().positive().default(204800),
  helpman: z.string().optional(),
  commands: z.object({
    run: z.array(z.string()).min(1, "runコマンドが必要です"),
    make: z.array(z.string()).min(1, "makeコマンドが必要です"),
  }),
});
const executablePathsSchema = z.record(z.string(), executorPathSchema);
type ExecutorPath = z.infer<typeof executorPathSchema>;
type ExecutablePaths = z.infer<typeof executablePathsSchema>;

type UniqueId = string;

const getCurrentPlatform = (): string => {
  return process.platform;
};

const shouldShowExecutor = (executorPath: ExecutorPath): boolean => {
  if (executorPath.hide) return false;
  if (executorPath.platform && executorPath.platform !== getCurrentPlatform()) {
    return false;
  }
  return true;
};

// toolset-hsp3 API
enum AgentState {
  updateList = "updateList",
  updateCurrent = "updateCurrent",
}
interface ToolsetAPI {
  agent: {
    hsp3root: () => string | undefined;
    listen: (callback: (state: AgentState) => void) => { dispose(): void };
  };
}

// uniqueIdを生成する関数
const generateUniqueId = (item: ExecutorItem) => {
  // コマンド、引数、パス、カテゴリを連結してハッシュ化または文字列化
  return `${item.command}-${item.args.join(",")}-${item.encoding}-${item.category}`;
};

// config executor.paths
const getValidatedExecutorPaths = (
  config: ConfigInstance
): Result<ExecutablePaths> => {
  const rawPaths = config.get("executor.paths");
  if (!rawPaths)
    return {
      success: false,
      error: new Error("Failed to get executor.paths configuration"),
    };
  try {
    const validatedPaths = executablePathsSchema.parse(rawPaths);
    return { success: true, value: validatedPaths };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error("Validation failed"),
    };
  }
};

const createToolset = async (
  context: vscode.ExtensionContext,
  logger: LoggerInstance,
  config: ConfigInstance,
  extmgr: ExtMgrInstance
) => {
  // toolset-hsp3 extnsion API の読み込み
  await extmgr.load(TOOLSET_HSP3_EXTENSION_ID);

  let list: ExecutorItem[] = [];
  const listing = () => {
    const result: ExecutorItem[] = [];
    const api = extmgr.export(TOOLSET_HSP3_EXTENSION_ID) as
      | ToolsetAPI
      | undefined;
    const hsp3root = api?.agent.hsp3root(); // 現在未使用

    // 既定のExecutorを設定する
    let command =
      config.get<string>("language-hsp3.compiler") ?? "C:\\hsp351\\hspc.exe";
    let helpman =
      config.get<string>("language-hsp3.helpman.path.local") ??
      "C:\\hsp351\\hdl.exe";
    const defaultItems = [
      {
        name: "default run",
        command,
        args: ["-dwCra", "%FILEPATH%"],
        encoding: "Shift_JIS",
        category: "run" as keyof typeof ExecutorItemCategory,
        uniqueId: "",
      },
      {
        name: "default make",
        command,
        args: ["-PmCa", "%FILEPATH%"],
        encoding: "Shift_JIS",
        category: "make" as keyof typeof ExecutorItemCategory,
        uniqueId: "",
      },
      {
        name: "default help",
        command: helpman,
        args: ["${editor_keyword}"],
        encoding: "utShift_JISf8",
        category: "help" as keyof typeof ExecutorItemCategory,
        uniqueId: "",
      },
    ];

    // デフォルトアイテムにuniqueIdを生成して追加
    defaultItems.forEach((item) => {
      item.uniqueId = generateUniqueId(item);
      result.push(item);
    });

    const paths = getValidatedExecutorPaths(config);
    // executorがある環境
    if (paths.success) {
      // 一覧にして配列な構造体にする
      for (const [name, executorPath] of Object.entries(paths.value)) {
        // プラットフォームフィルタリングを適用
        if (!shouldShowExecutor(executorPath)) continue;

        // commandsの各プロパティをループで処理
        for (const [commandName, commandArgs] of Object.entries(
          executorPath.commands
        )) {
          if (Array.isArray(commandArgs)) {
            const category = ["run", "make", "help"].includes(commandName)
              ? commandName
              : "custom";
            const item: ExecutorItem = {
              name: name,
              command: executorPath.path,
              args: commandArgs,
              encoding: executorPath.encoding,
              category: category as keyof typeof ExecutorItemCategory,
              uniqueId: "",
            };
            // uniqueIdを生成
            item.uniqueId = generateUniqueId(item);
            result.push(item);
          }
        }
      }
    }
    return result;
  };

  // CurrentExecutorsの値が実際にlistingで検出できるかを検証する関数
  const validateCurrentExecutors = (
    cur: CurrentExecutors,
    availableList: ExecutorItem[]
  ): CurrentExecutors => {
    const validated: CurrentExecutors = {};
    const availableUniqueIds = new Set(
      availableList.map((item) => item.uniqueId)
    );

    // 各カテゴリについて、保存されているuniqueIdが利用可能なリストに存在するかチェック
    (["run", "make", "help"] as const).forEach((category) => {
      const currentUniqueId = cur[category];
      if (currentUniqueId && availableUniqueIds.has(currentUniqueId)) {
        validated[category] = currentUniqueId;
      } else if (currentUniqueId) {
        // 保存されているuniqueIdが見つからない場合はログに記録
        logger.warn(
          `Executor with uniqueId "${currentUniqueId}" for ${category} not found in available list. Available: ${Array.from(availableUniqueIds).join(", ")}`
        );
      }
    });

    return validated;
  };

  // 言語バー管理インスタンスを作成
  const languageStatusManager = new LanguageStatusManager(
    context,
    listing,
    validateCurrentExecutors
  );

  // 設定変更の監視
  const configListenerId = config.addListener((event) => {
    // executor関連の設定が変更された場合
    if (
      event.affectsConfiguration("language-hsp3.executor.paths") ||
      event.affectsConfiguration("language-hsp3.compiler") ||
      event.affectsConfiguration("language-hsp3.helpman.path.local")
    ) {
      logger.info("Executor configuration changed, updating executor list");

      // リストを再構築
      list = listing();

      // 現在の選択を検証し、無効な場合はクリア
      const cur = context.workspaceState.get<CurrentExecutors>(CUREXEC) || {};
      const validatedCur = validateCurrentExecutors(cur, list);

      // 無効な選択があった場合はワークスペース状態を更新
      if (JSON.stringify(cur) !== JSON.stringify(validatedCur)) {
        context.workspaceState.update(CUREXEC, validatedCur);
      }

      // 言語バーを更新
      languageStatusManager.updateCurrentExecutor();
    }
  });

  const cmd = vscode.commands.registerCommand(
    "language-hsp3.executor.select.run",
    async (category?: string) => {
      await showSelect(category);
    }
  );

  const showSelect = async (preselectedCategory?: string) => {
    const list = listing();
    const category =
      preselectedCategory ||
      (await vscode.window.showQuickPick(["run", "make", "help"]));

    if (!category) return;

    const filteredList = list.filter(
      (item) => item.category === category || item.category === "custom"
    );
    const quickPickItems = filteredList.map((item) => ({
      label: item.name,
      description: [item.command, ...item.args].join(" "),
      item: item,
    }));

    const sel = await vscode.window.showQuickPick(quickPickItems, {
      placeHolder: `Select ${category} executor`,
    });

    const selItem = sel?.item;
    if (!selItem) return;

    // ワークスペースの保存する
    const cur = context.workspaceState.get<CurrentExecutors>(CUREXEC) || {};
    const save: CurrentExecutors = { ...cur, [category]: selItem.uniqueId };
    await context.workspaceState.update(CUREXEC, save);

    // 言語バーを更新
    languageStatusManager.updateCurrentExecutor();
    return;
  };

  // 初期表示を更新
  languageStatusManager.updateCurrentExecutor();
  languageStatusManager.setBusy(false);

  return {
    list: () => listing(),
    showSelect,
    dispose: () => {
      languageStatusManager.dispose();
      config.removeListener(configListenerId);
      cmd.dispose();
    },
  };
};
export type ToolsetInstance = ReturnType<typeof createToolset>;
export default createToolset;
