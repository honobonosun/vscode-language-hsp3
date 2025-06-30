import { window, commands } from "vscode";
import i18n from "./i18n";
import createDelayTimer from "./delay";

const timestamp = (): string => {
  const now = new Date();
  return now.toISOString().replace("T", " ").replace("Z", "");
};

export const enum LogLevel {
  Info,
  Warn,
  Error,
}

export interface LogOptions {
  newline?: boolean;
  section?: string;
}

// 新しいインターフェースを追加
export interface LoggerOptions {
  showLevelLimit?: LogLevel;
  showDelay?: number;
  showFocus?: boolean;
  consoleDubbing?: boolean;
}

const levelLabel = (level: LogLevel) => {
  switch (level) {
    case LogLevel.Info:
      return "info";
    case LogLevel.Warn:
      return "warning";
    case LogLevel.Error:
      return "error";
  }
};

const clFunc = [console.log, console.warn, console.error];
const showFunc = [
  window.showInformationMessage,
  window.showWarningMessage,
  window.showErrorMessage,
];

/*
const handleLogOutputError = () => {
  const showConsoleLabel = i18n.t("show-console");
  window
    .showErrorMessage(i18n.t("log-output-failed"), showConsoleLabel)
    .then((selection) => {
      if (selection === showConsoleLabel) {
        // 開発者ツールを開く
        commands.executeCommand("workbench.action.toggleDevTools");
      }
    });
};
*/

const createLogger = (name: string, options: LoggerOptions = {}) => {
  const channel = window.createOutputChannel(name);
  let limit: LogLevel = options.showLevelLimit ?? LogLevel.Error;
  let delay = options.showDelay ?? 1000;
  let focus = options.showFocus ?? false;
  let dubbing = options.consoleDubbing ?? false;
  const label = i18n.t("show") ?? "Show";

  const delayShowInfoTimer = createDelayTimer(async (level: LogLevel) => {
    if (level >= limit) {
      const val = await showFunc[level](i18n.t("unread-log"), label);
      if (val === label) channel.show(focus);
    }
  });

  const print = (level: LogLevel, msg: string, options: LogOptions = {}) => {
    const { section, newline = true } = options;
    const sectionPart = section ? `${section}: ` : "";
    const text = `${timestamp()} [${levelLabel(level)}] ${sectionPart}${msg}`;
    channel.append(text + (newline ? "\n" : ""));
    if (dubbing) clFunc[level](text);
    if (level >= limit) delayShowInfoTimer.setTimer(delay, level);
  };

  // 直接的なログメソッド
  const info = (msg: string, options?: LogOptions) =>
    print(LogLevel.Info, msg, options);
  const warn = (msg: string, options?: LogOptions) =>
    print(LogLevel.Warn, msg, options);
  const error = (msg: string, options?: LogOptions) =>
    print(LogLevel.Error, msg, options);

  // セクション付きロガーを作成
  const section = (name: string) => {
    const options = { section: name };
    return {
      info: (msg: string, opts?: LogOptions) =>
        info(msg, { ...opts, ...options }),
      warn: (msg: string, opts?: LogOptions) =>
        warn(msg, { ...opts, ...options }),
      error: (msg: string, opts?: LogOptions) =>
        error(msg, { ...opts, ...options }),
    };
  };

  const dispose = () => {
    channel.dispose();
    delayShowInfoTimer.dispose();
  };
  const setShowLevelLimit = (level: LogLevel) => {
    limit = level;
  };
  const setShowDelay = (time: number) => {
    delay = time;
  };
  const setShowFocus = (flag: boolean) => {
    focus = flag;
  };

  return {
    info,
    warn,
    error,
    section,
    dispose,
    setShowLevelLimit,
    setShowDelay,
    setShowFocus,
  };
};

export default createLogger;
export type LoggerInstance = ReturnType<typeof createLogger>;
