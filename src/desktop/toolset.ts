import vscode from "vscode";
import { TOOLSET_HSP3_EXTENSION_ID, EXTENSION_ID } from "../common/constant";
import { ConfigInstance } from "../common/config";
import { ExtMgrInstance } from "../common/extmgr";
import { LoggerInstance } from "../common/logger";
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

ToDo:
- listing() 内の詳細ログ出力(info)を debug レベルに変更する
- showSelect() 内の詳細ログ出力(info)を debug レベルに変更する
- 初期化処理におけるデフォルト選択ログ(info)を debug レベルに変更する

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
  // 名前、コマンド、引数、パス、カテゴリを連結してハッシュ化または文字列化
  return `${item.name}-${item.command}-${item.args.join(",")}-${item.encoding}-${item.category}`;
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

// 既定のExecutorItemを生成する関数
const getDefaultExecutorItems = (config: ConfigInstance): ExecutorItem[] => {
  let command =
    config.get<string>("language-hsp3.compiler") ?? "C:\\hsp351\\hspc.exe";
  let helpman =
    config.get<string>("language-hsp3.helpman.path.local") ??
    "C:\\hsp351\\hdl.exe";
  const defaultItems = [
    {
      name: "default run",
      command,
      args: config.get<string[]>("language-hsp3.runCommands") ?? [
        "-dwCra",
        "%FILEPATH%",
      ],
      encoding: "Shift_JIS",
      category: "run" as keyof typeof ExecutorItemCategory,
      uniqueId: "",
    },
    {
      name: "default make",
      command,
      args: config.get<string[]>("language-hsp3.makeCommands") ?? [
        "-PmCa",
        "%FILEPATH%",
      ],
      encoding: "Shift_JIS",
      category: "make" as keyof typeof ExecutorItemCategory,
      uniqueId: "",
    },
    {
      name: "default help",
      command: helpman,
      args: ["${editor_keyword}"],
      encoding: "Shift_JIS",
      category: "help" as keyof typeof ExecutorItemCategory,
      uniqueId: "",
    },
  ];
  // uniqueIdを生成
  defaultItems.forEach((item) => {
    item.uniqueId = generateUniqueId(item);
  });
  return defaultItems;
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
    const defaultItems = getDefaultExecutorItems(config);
    result.push(...defaultItems);

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

    // 設計変更メモの要求: listing時は見つかった内容をlogでinfoレベルで出力する
    logger.debug(
      `Executor listing completed: ${result.length} executors found`
    );
    logger.debug(`Default executors: ${defaultItems.length}`);
    if (paths.success) {
      logger.debug(
        `Configuration executors: ${result.length - defaultItems.length}`
      );
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
        // 保存されているuniqueIdが見つからない場合はwarnログを記録し、未選択(undefined)にする
        logger.warn(
          `Executor with uniqueId "${currentUniqueId}" for ${category} not found in available list. Available: ${Array.from(availableUniqueIds).join(", ")}`
        );
        validated[category] = undefined;
      }
    });

    return validated;
  };

  // 言語バー管理インスタンスを作成
  const languageStatusManager = new LanguageStatusManager(
    context,
    listing,
    validateCurrentExecutors,
    logger
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
    // 最新のlisting()を必ず取得
    const list = listing();
    logger.debug(`[showSelect] Available executors: ${list.length}`);
    logger.debug(
      `[showSelect] Available items: ${list.map((item) => `${item.name}(${item.category}):${item.uniqueId}`).join(", ")}`
    );

    const category =
      preselectedCategory ||
      (await vscode.window.showQuickPick(["run", "make", "help"]));

    if (!category) return;
    logger.debug(`[showSelect] Selected category: ${category}`);

    const filteredList = list.filter(
      (item) => item.category === category || item.category === "custom"
    );
    logger.debug(
      `[showSelect] Filtered list for category: ${filteredList.map((item) => `${item.name}:${item.uniqueId}`).join(", ")}`
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
    if (!selItem) {
      logger.debug("[showSelect] No item selected, returning");
      return;
    }
    logger.debug(
      `[showSelect] Selected item: ${selItem.name}, uniqueId: ${selItem.uniqueId}`
    );

    // ワークスペースの保存する（listing()の最新uniqueIdを保存）
    const cur = context.workspaceState.get<CurrentExecutors>(CUREXEC) || {};
    const save: CurrentExecutors = { ...cur, [category]: selItem.uniqueId };
    logger.debug(`[showSelect] Saving state: ${JSON.stringify(save)}`);
    await context.workspaceState.update(CUREXEC, save);

    // 保存後の確認
    const saved = context.workspaceState.get<CurrentExecutors>(CUREXEC) || {};
    logger.debug(
      `[showSelect] Confirmed saved state: ${JSON.stringify(saved)}`
    );

    // 言語バーを更新
    logger.debug("[showSelect] Updating language status manager");
    languageStatusManager.updateCurrentExecutor();
    return;
  };

  // --- 初期化時にCurrentExecutorsの整合性を検証・修正・ログ出力 ---
  // 初回起動やCurrentExecutorsが空の場合は既定値を自動選択
  let cur = context.workspaceState.get<CurrentExecutors>(CUREXEC) || {};
  list = listing();
  let validatedCur = validateCurrentExecutors(cur, list);
  let updated = false;
  (["run", "make", "help"] as const).forEach((category) => {
    if (!validatedCur[category]) {
      // 未設定なら既定値を自動選択
      const defaultItem = list.find(
        (item) => item.category === category && item.name.startsWith("default")
      );
      if (defaultItem) {
        validatedCur[category] = defaultItem.uniqueId;
        logger.debug(
          `初期化: ${category} executorを既定値(${defaultItem.name})で自動選択しました。`
        );
        updated = true;
      }
    }
  });
  if (JSON.stringify(cur) !== JSON.stringify(validatedCur) || updated) {
    await context.workspaceState.update(CUREXEC, validatedCur);
  }

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
