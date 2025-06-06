import { window } from "vscode";
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
  dubbing?: boolean;
}

export interface LogSection {
  log: (level: LogLevel, msg: string, options?: LogOptions) => void;
}

export interface Logger {
  section: (name?: string) => LogSection;
  dispose: () => void;
  setShowLevelLimit: (level: LogLevel) => void;
  setShowDelay: (time: number) => void;
  setShowFocus: (flag: boolean) => void;
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

const createLogger = (name: string): Logger => {
  const channel = window.createOutputChannel(name);
  let limit: LogLevel = LogLevel.Error;
  let delay = 1000;
  let focus = false;
  const label = i18n.t("show") ?? "Show";

  const delayShowInfoTimer = createDelayTimer(async (level: LogLevel) => {
    if (level >= limit) {
      const val = await showFunc[level](i18n.t("unread-log"), label);
      if (val === label) channel.show(focus);
    }
  });

  // export functions
  const section = (name?: string) => {
    return {
      log: (
        level: LogLevel,
        msg: string,
        options: { newline?: boolean; dubbing?: boolean } = {}
      ) => {
        const { newline = true, dubbing = false } = options;
        // 出力ペインへ書き込む
        const text = `${timestamp()} [${levelLabel(level)}] ${name ? `${name}:` : ""} ${msg}`;
        channel.append(text + (newline ? "\n" : ""));
        if (dubbing) clFunc[level](text); // コンソールへダビング
        // 更新通知
        if (level >= limit) delayShowInfoTimer.setTimer(delay, level);
      },
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

  return { section, dispose, setShowLevelLimit, setShowDelay, setShowFocus };
};

export default createLogger;
