import { window } from "vscode";
import i18n from "./i18n";
import createDelayTimer from "./delay";

const timestamp = (): string => {
  const now = new Date();
  return now.toISOString().replace("T", " ").replace("Z", "");
};

export const enum LogLevel {
  Debug = 0,
  Info = 1,
  Warn = 2,
  Error = 3,
}

export interface LogOptions {
  newline?: boolean;
  section?: string;
  consoleDubbing?: boolean;
}

// 新しいインターフェースを追加
export interface LoggerOptions {
  showLevelLimit?: LogLevel;
  showDelay?: number;
  showFocus?: boolean;
  consoleDubbing?: boolean;
  debugMode?: boolean;
}

const levelLabel = (level: LogLevel) => {
  switch (level) {
    case LogLevel.Debug:
      return "debug";
    case LogLevel.Info:
      return "info";
    case LogLevel.Warn:
      return "warning";
    case LogLevel.Error:
      return "error";
  }
};

const clFunc = [console.debug, console.log, console.warn, console.error];

const showFunc = [
  window.showInformationMessage,
  window.showInformationMessage,
  window.showWarningMessage,
  window.showErrorMessage,
];

// 通知: コンソール出力が行われたことを表示
const showConsoleNotification = () => {
  window.showInformationMessage(i18n.t("log-output-console"));
};

const createLogger = (name: string, options: LoggerOptions = {}) => {
  const channel = window.createOutputChannel(name);
  let limit: LogLevel = options.showLevelLimit ?? LogLevel.Error;
  let delay = options.showDelay ?? 1000;
  let focus = options.showFocus ?? false;
  let dubbing = options.consoleDubbing ?? false;
  let debugMode = options.debugMode ?? false;
  // デバッグモード時は自動的にコンソール出力を有効化
  if (debugMode) {
    dubbing = true;
  }

  const label = i18n.t("show") ?? "Show";

  const delayShowInfoTimer = createDelayTimer(async (level: LogLevel) => {
    if (level >= limit) {
      const val = await showFunc[level](i18n.t("unread-log"), label);
      if (val === label) channel.show(focus);
    }
  });

  const print = (level: LogLevel, msg: string, options: LogOptions = {}) => {
    const { section, newline = true, consoleDubbing: optDubbing } = options;
    const shouldDubbing = optDubbing ?? dubbing;
    const sectionPart = section ? `${section}: ` : "";
    const text = `${timestamp()} [${levelLabel(level)}] ${sectionPart}${msg}`;
    channel.append(text + (newline ? "\n" : ""));
    if (shouldDubbing) clFunc[level](text);

    if (level >= limit) delayShowInfoTimer.setTimer(delay, level);
  };

  // 直接的なログメソッド
  const info = (msg: string, options?: LogOptions) =>
    print(LogLevel.Info, msg, options);
  const warn = (msg: string, options?: LogOptions) =>
    print(LogLevel.Warn, msg, options);
  const error = (msg: string, options?: LogOptions) =>
    print(LogLevel.Error, msg, options);

  // 新規: debug メソッド
  const debug = (msg: string, options: LogOptions = {}) => {
    if (!debugMode) return;
    const { section, newline = true, consoleDubbing: optDubbing } = options;
    const shouldDubbing = optDubbing ?? dubbing;
    const sectionPart = section ? `${section}: ` : "";
    const text = `${timestamp()} [${levelLabel(LogLevel.Debug)}] ${sectionPart}${msg}`;
    channel.append(text + (newline ? "\n" : ""));
    if (shouldDubbing) clFunc[LogLevel.Debug](text);
  };

  // セクション付きロガーを作成
  const section = (name: string) => {
    const options = { section: name };
    return {
      debug: (msg: string, opts?: LogOptions) =>
        debug(msg, { ...opts, ...options }),
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
    debug,
    section,
    dispose,
    setShowLevelLimit,
    setShowDelay,
    setShowFocus,
    // 新規: デバッグモード切り替え
    setDebugMode: (flag: boolean) => {
      debugMode = flag;
      if (flag) dubbing = true;
    },
  };
};

export default createLogger;
export type LoggerInstance = ReturnType<typeof createLogger>;
