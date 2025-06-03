import { window } from "vscode";
import i18n from "./i18n";
import { EXTENSION_ID } from "./constant";

const timestamp = (): string => {
  const now = new Date();
  return now.toISOString().replace("T", " ").replace("Z", "");
};

const enum LogLevel {
  Info,
  Warn,
  Err,
}

const levelLacel = (level: LogLevel) => {
  switch (level) {
    case LogLevel.Info:
      return "INFO";
    case LogLevel.Warn:
      return "WARN";
    case LogLevel.Err:
      return "ERROR";
  }
};

const clFunc = [console.log, console.warn, console.error];
const showFunc = [
  window.showInformationMessage,
  window.showWarningMessage,
  window.showErrorMessage,
];

export const createLogger = () => {
  const channel = window.createOutputChannel(EXTENSION_ID);
  let time: NodeJS.Timeout | undefined;
  let limit: LogLevel = LogLevel.Err;
  let delay = 1000;
  let focus = false;

  const showInfo = (level: LogLevel) => {
    if (time) clearTimeout(time);
    const label = i18n.t("show") ?? "Show";
    time = setTimeout(async () => {
      if (level >= limit) {
        const val = await showFunc[level](i18n.t("unread-log"), label);
        if (val === label) channel.show(focus);
      }
    }, delay);
  };

  // export functions
  const section = (name: string) => {
    return {
      log: (
        level: LogLevel,
        msg: string,
        { newline = true, dubbing = false }
      ) => {
        // 出力ペインへ書き込む
        const text = `[${timestamp()}] [${name}] [${levelLacel(level)}] ${msg}`;
        channel.append(text + (newline ? "\n" : ""));
        if (dubbing) clFunc[level](text); // コンソールへダビング
        // 更新通知
        if (level >= limit) showInfo(level);
      },
    };
  };
  const dispose = () => {
    channel.dispose();
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
