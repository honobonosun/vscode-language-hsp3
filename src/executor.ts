"use strict";
import * as child_process from "child_process";
import { decode } from "iconv-lite";
import { basename, dirname } from "path";
import { promisify } from "util";
import * as vscode from "vscode";
import Config from "./config";
import { convertPath } from "./wine";

/**
 * cmd.exeやbashのエスケープを再現します。
 * @param str エスケープする文字
 */
function convertArgs(str: string): string[] {
  let buffer = "";
  const result: string[] = []; // push() call only.
  let flag = false;
  let escape = false;
  const escapeChar = process.platform === "win32" ? "^" : "\\";
  for (const elm of Array.from(str)) {
    if (escape) {
      buffer += elm;
      escape = false;
      continue;
    }
    if (elm === escapeChar) {
      escape = true;
      continue;
    }

    if (elm === '"') {
      if (flag === false) {
        flag = true;
        continue;
      } else {
        flag = false;
        continue;
      }
    }

    if (/\s/.test(elm) && flag === false) {
      if (buffer !== "") {
        result.push(buffer);
      }
      buffer = "";
    } else {
      buffer += elm;
    }
  }
  if (buffer !== "") {
    result.push(buffer);
  }
  return result;
}

/**
 * コンパイラがhspcかファイル名で調べます。
 * @param hspcPath hspc.exeのパス
 */
function isHspc(hspcPath: string): boolean {
  const name = basename(hspcPath);
  if (name === "hspc.exe" || name === "hspc") {
    return true;
  } else {
    return false;
  }
}

/**
 * hspcが古いバージョンか調べます。
 * @param config
 */
async function isLegacyHspc(config: Config): Promise<boolean> {
  const hspcPath = config.compiler();
  if (!hspcPath) {
    return Promise.reject(new Error("Compiler is not set."));
  }
  if (isHspc(hspcPath) === false) {
    return Promise.resolve(false);
  }

  const options = { encoding: "Shift_JIS", maxBuffer: 260 };
  try {
    let result: any;
    if (config.wineMode()) {
      result = await promisify(child_process.execFile)(
        "wine",
        [hspcPath, "-v"],
        options
      );
    } else {
      result = await promisify(child_process.execFile)(
        hspcPath,
        ["-v"],
        options
      );
    }
    const str = decode(result.stdout as Buffer, "Shift_JIS");
    const reval = str.match(/ hspc Version \w*(\d+)\.(\d+)\.(\d+)/);
    if (!reval) {
      return Promise.resolve(false);
    } else {
      if (Number(reval[1]) <= 1) {
        return Promise.resolve(true);
      } else {
        return Promise.resolve(false);
      }
    }
  } catch (err) {
    return Promise.reject(err);
  }
}

/**
 * 渡されたstring[]にkeyがあったらvalueに置き換える。
 * {
 *  key: value,
 * "%FILEPATH%": file
 * }
 * @param args 受け取る文字列配列
 * @param withValues 置き換えるリスト
 */
function replace(args: string[], withValues: any): string[] {
  const result: string[] = []; // push() call only.
  const keys = Object.keys(withValues);
  for (let i = 0; i < args.length; i++) {
    let arg = args[i];
    for (let l = 0; l < keys.length; l++) {
      const key = keys[l];
      const value = withValues[keys[l]];
      arg = arg.replace(RegExp(key, "g"), value);
    }
    result.push(arg);
  }

  return result;
}

/**
 * コンパイラを実行する。
 * @param file コンパイルするファイルの絶対パス（fsPath）
 * @param cmdname 実行するコマンドの引数が設定されたconfigのセクション名
 * @param config vscode.WorkspaceConfigurationのインスタンス変数
 */
export async function execution(
  file: string,
  cmdname: string,
  config: Config,
  userArgs?: string
) {
  // config読み込み。
  let compiler: string,
    wineMode: boolean,
    encoding: string,
    maxBuffer: number,
    cmdArgs: string[];
  try {
    compiler = config.compiler();
    wineMode = config.wineMode();
    encoding = config.encoding();
    maxBuffer = config.maxBuffer();
    cmdArgs = config.cmdArgs(cmdname);
  } catch (e) {
    return Promise.reject(e);
  }

  // コンパイラのカレントディレクトリを設定する。
  let cwd: string = dirname(file);
  if (config.get("choiceWorkDirCur")) {
    // カレントディレクトリをワーキングディレクトリに設定する。
    /**
     * 指定されたstringから正規表現のエスケープ文字を無効化します。
     * @param string エスケープ文字を無効化したい文字
     */
    function escapeRegExp(string: string) {
      return string.replace(/[.*+?^=!:${}()|[\]/\\]/g, "\\$&");
    }
    const workFolders = vscode.workspace.workspaceFolders;
    if (workFolders) {
      for (let count = 0; count < Object.keys(workFolders).length; count++) {
        const workFolder = workFolders[count].uri.fsPath;
        const r = new RegExp(`${escapeRegExp(workFolder)}.*`); // 注意：この方法だと、`/`や`C:\`などがrootDirだった場合、問答無用でhitする。Atom版と同じ実装（lib/submodel.coffee/getProjectRoot関数）。
        if (r.test(file)) {
          cwd = workFolder;
          break;
        }
      }
    }
  }

  // コマンド引数の特殊文字を変換。
  if (wineMode) {
    const revalue = await convertPath(["--windows"], [file]);
    file = revalue[0];
  }
  let args = replace(cmdArgs, { "%FILEPATH%": file });

  const opstions = {
    maxBuffer: maxBuffer,
    encoding: encoding,
    cwd: cwd
  };

  // hspc v1 コンパイラ用の呼び出し。
  if (await isLegacyHspc(config)) {
    if (userArgs) {
      vscode.window.showInformationMessage(
        'Ran with arguments, but argument ignored because hspc version is ">=2.0.0".'
      );
    }
    let command: string;
    if (wineMode) {
      command = `wine ${compiler} ` + args.join(" ").replace(/""/g, "");
    } else {
      command = `${compiler} ` + args.join(" ").replace(/""/g, "");
    }
    return promisify(child_process.exec)(command, opstions);
  } else {
    // 古くないhspc、もしくはhspc以外のコンパイラを呼び出す。
    if (userArgs) {
      args = args.concat(convertArgs(userArgs));
    }
    if (wineMode) {
      return promisify(child_process.execFile)(
        "wine",
        [compiler].concat(args),
        opstions
      );
    } else {
      return promisify(child_process.execFile)(compiler, args, opstions);
    }
  }
}
