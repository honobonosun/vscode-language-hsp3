import vscode from "vscode";
import { TOOLSET_HSP3_EXTENSION_ID, EXTENSION_ID } from "../common/constant";
import { ConfigInstance } from "../common/config";
import { ExtMgrInstance } from "../common/extmgr";
import { LoggerInstance } from "../common/logger";
import path from "path";
import { substituteVariables } from "./utils/substitution";
import { z } from "zod";
import { Result } from "../common/types";
import LanguageStatusManager from "./executorLanguageStatusManager";
import {
  ExecutorItem,
  CurrentExecutors,
  CUREXEC,
  ExecutorItemCategory,
} from "./types/executor";
import type { ExecutionParams } from "./executor";

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
// uniqueId を生成するために必要なプロパティのみを受け取る型
type UniqueIdSource = Pick<
  ExecutorItem,
  "name" | "command" | "args" | "encoding" | "category"
>;

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
const generateUniqueId = (item: UniqueIdSource) => {
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

// 新しい executor.toolset 設定のスキーマ
const executorToolsetSchema = z
  .array(
    z.object({
      name: z.string().min(1),
      category: z.enum(["run", "make", "help", "custom"]),
      continueOnError: z.boolean().default(false),
      commands: z.array(
        z.object({
          command: z.string().min(1),
          args: z.array(z.string()).default([]),
          encoding: z.string().default("utf8"),
          env: z.record(z.string(), z.string()).default({}),
          shell: z.union([
            z.object({ use: z.literal(false) }).default({ use: false }),
            z.object({
              use: z.literal(true),
              path: z.string(),
              args: z.array(z.string()).default([]),
            }),
          ]),
        })
      ),
    })
  )
  .default([]);
type ExecutorToolsetConfig = z.infer<typeof executorToolsetSchema>;

const createToolset = async (
  context: vscode.ExtensionContext,
  logger: LoggerInstance,
  config: ConfigInstance,
  extmgr: ExtMgrInstance
) => {
  const log = logger.section("toolset");
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

    // 新しい executor.toolset 設定を処理
    const rawToolset = config.get("executor.toolset");
    let toolsetConfig: ExecutorToolsetConfig = [];
    try {
      toolsetConfig = executorToolsetSchema.parse(rawToolset);
    } catch (error: unknown) {
      // 例外を文字列化してログ出力
      const msg = error instanceof Error ? error.message : String(error);
      log.error(`Invalid executor.toolset configuration: ${msg}`);
    }
    for (const executor of toolsetConfig) {
      for (const cmdConfig of executor.commands) {
        const item: ExecutorItem = {
          name: executor.name,
          command: cmdConfig.command,
          args: cmdConfig.args,
          encoding: cmdConfig.encoding,
          category: executor.category,
          uniqueId: generateUniqueId({
            name: executor.name,
            command: cmdConfig.command,
            args: cmdConfig.args,
            encoding: cmdConfig.encoding,
            category: executor.category,
          }),
          env: cmdConfig.env,
          shell: cmdConfig.shell,
        };
        result.push(item);
      }
    }

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
    log.debug(`Executor listing completed: ${result.length} executors found`);
    log.debug(`Default executors: ${defaultItems.length}`);
    if (paths.success) {
      log.debug(
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
        log.warn(
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
      log.info("Executor configuration changed, updating executor list");

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
    log.debug(`[showSelect] Available executors: ${list.length}`);
    log.debug(
      `[showSelect] Available items: ${list.map((item) => `${item.name}(${item.category}):${item.uniqueId}`).join(", ")}`
    );

    const category =
      preselectedCategory ||
      (await vscode.window.showQuickPick(["run", "make", "help"]));

    if (!category) return;
    log.debug(`[showSelect] Selected category: ${category}`);

    const filteredList = list.filter(
      (item) => item.category === category || item.category === "custom"
    );
    log.debug(
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
      log.debug("[showSelect] No item selected, returning");
      return;
    }
    log.debug(
      `[showSelect] Selected item: ${selItem.name}, uniqueId: ${selItem.uniqueId}`
    );

    // ワークスペースの保存する（listing()の最新uniqueIdを保存）
    const cur = context.workspaceState.get<CurrentExecutors>(CUREXEC) || {};
    const save: CurrentExecutors = { ...cur, [category]: selItem.uniqueId };
    log.debug(`[showSelect] Saving state: ${JSON.stringify(save)}`);
    await context.workspaceState.update(CUREXEC, save);

    // 保存後の確認
    const saved = context.workspaceState.get<CurrentExecutors>(CUREXEC) || {};
    log.debug(`[showSelect] Confirmed saved state: ${JSON.stringify(saved)}`);

    // 言語バーを更新
    log.debug("[showSelect] Updating language status manager");
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
        log.debug(
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

  // カレントExecutorから実行オプションを生成する関数
  const getExecutionOptions = (
    category: keyof CurrentExecutors,
    filePath: string,
    overrideArgs?: string[]
  ): ExecutionParams | undefined => {
    const cur = context.workspaceState.get<CurrentExecutors>(CUREXEC) || {};
    const uniqueId = cur[category];
    if (!uniqueId) {
      vscode.window.showErrorMessage(
        `${category} executor が選択されていません。`
      );
      return;
    }
    const items = listing();
    const item = items.find((i) => i.uniqueId === uniqueId);
    if (!item) {
      vscode.window.showErrorMessage(
        `選択されたExecutorが見つかりません: ${uniqueId}`
      );
      // 言語バー（Language Status）を最新の情報で更新する
      languageStatusManager.updateCurrentExecutor();
      return;
    }
    const argsTemplates = overrideArgs ?? item.args;
    const args: string[] = [];
    // toolset-hsp3 APIからHSP3_ROOTを取得
    const api = extmgr.export(TOOLSET_HSP3_EXTENSION_ID) as
      | ToolsetAPI
      | undefined;
    const hsp3root = api?.agent.hsp3root();
    for (const arg of argsTemplates) {
      const result = substituteVariables(arg, {
        filePath,
        editorPath: filePath,
        hsp3Root: hsp3root,
      });
      if (!result.success) {
        log.error(`変数置換に失敗: ${result.error.message}`);
        return;
      }
      args.push(result.value);
    }
    const cwd = path.dirname(filePath);
    // オプションを生成
    const options: ExecutionParams = {
      name: item.name,
      command: item.command,
      args,
      cwd,
      env: item.env,
      encoding: item.encoding,
      mode: item.shell?.use ? "shell" : "direct",
      ...(item.shell?.use
        ? { shellPath: item.shell.path, shellArgs: item.shell.args }
        : {}),
    };
    return options;
  };

  return {
    list: () => listing(),
    showSelect,
    getExecutionOptions,
    dispose: () => {
      languageStatusManager.dispose();
      config.removeListener(configListenerId);
      cmd.dispose();
    },
  };
};
export type ToolsetInstance = Awaited<ReturnType<typeof createToolset>>;
export default createToolset;
