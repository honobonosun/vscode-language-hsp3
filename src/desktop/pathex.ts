import untildify from "untildify";
import path from "path";
import { minimatch } from "minimatch";
import { Result } from "../common/types";
import { evalVars } from "./utils";

const hasOwnProp = (obj: object, prop: string | number | symbol): boolean => {
  return Object.prototype.hasOwnProperty.call(obj, prop);
};
// Result型の定義

// エラー型を明確に定義
export type PathError =
  | { type: "invalid_input"; message: string }
  | { type: "dangerous_chars"; message: string }
  | { type: "path_traversal"; message: string };

// デフォルトの危険文字パターンを定義
const defaultDangerousCharsPattern = /[;&|`]/;

// 危険な文字をチェックする関数
function checkDangerousChars(
  path: string,
  pattern: RegExp = defaultDangerousCharsPattern
): boolean {
  return pattern.test(path);
}

// secureExpandPathSafe用のオプション
export interface SecureExpandOptions {
  baseDir?: string;
  allowedVars?: Record<string, string>;
  allowOutsideBase?: boolean;
  /** チェックに使用するパターン。undefined:既定パターン(defaultDangerousCharsPattern)、null:チェックをスキップ */
  dangerousCharsPattern?: RegExp | null;
}

// expandPath用の拡張オプション
export interface PathExpandOptions extends SecureExpandOptions {
  includeProcessEnv?: boolean;
  trustedPatterns?: Array<string>;
  ignoredPatterns?: Array<string>;
}

export function secureExpandPathSafe(
  userPath: string,
  options: SecureExpandOptions = {}
): Result<string, PathError> {
  const {
    baseDir = process.cwd(),
    allowedVars = {},
    allowOutsideBase = false,
    dangerousCharsPattern = defaultDangerousCharsPattern,
  } = options;

  // 入力検証
  if (typeof userPath !== "string" || userPath.length === 0) {
    return {
      success: false,
      error: { type: "invalid_input", message: "Invalid path input" },
    };
  }

  // 初回の危険な文字チェック
  if (
    dangerousCharsPattern &&
    checkDangerousChars(userPath, dangerousCharsPattern)
  ) {
    return {
      success: false,
      error: {
        type: "dangerous_chars",
        message: "Path contains dangerous characters",
      },
    };
  }

  // 環境変数展開後に再度危険な文字をチェック
  let expandedPath = userPath;

  // 1. 環境変数を安全に展開（ホワイトリスト形式、UnixとWindowsの両方をサポート）
  const isWindows = process.platform === "win32";
  const lookupVars: Record<string, string> = isWindows
    ? Object.fromEntries(
        Object.entries(allowedVars).map(([k, v]) => [k.toUpperCase(), v])
      )
    : allowedVars;
  expandedPath = evalVars(expandedPath, lookupVars);

  // 展開後の危険な文字チェック
  if (
    dangerousCharsPattern &&
    checkDangerousChars(expandedPath, dangerousCharsPattern)
  ) {
    return {
      success: false,
      error: {
        type: "dangerous_chars",
        message: "Expanded path contains dangerous characters",
      },
    };
  }

  // 2. チルダを安全に展開
  expandedPath = untildify(expandedPath);

  // 3. パストラバーサル攻撃を防ぐ（絶対パスへ変換）
  const resolved = path.resolve(baseDir, expandedPath);

  // ベースディレクトリ外へのアクセスを防ぐ
  if (!allowOutsideBase && !resolved.startsWith(path.resolve(baseDir))) {
    return {
      success: false,
      error: {
        type: "path_traversal",
        message: "Path traversal attempt detected",
      },
    };
  }

  return { success: true, value: resolved };
}

// デフォルトの許可された環境変数を提供（パターンマッチング版）
export const defaultAllowedVars = ({
  allowedVars = {},
  includeProcessEnv = false,
  trustedPatterns = [],
  ignoredPatterns = [],
}: {
  allowedVars: Record<string, string>;
  includeProcessEnv: boolean;
  trustedPatterns: Array<string>;
  ignoredPatterns: Array<string>;
}): Record<string, string> => {
  const result: Record<string, string> = { ...allowedVars };

  if (includeProcessEnv) {
    Object.entries(process.env).forEach(([key, value]) => {
      if (!hasOwnProp(allowedVars, key) && value) {
        // ブラックリストチェック（優先）
        const isIgnored = ignoredPatterns.some((pattern) =>
          minimatch(key, pattern, { nocase: true })
        );

        if (isIgnored) {
          return; // 無視リストにマッチしたらスキップ
        }

        // ホワイトリストチェック
        const shouldInclude =
          trustedPatterns.length === 0 ||
          trustedPatterns.some((pattern) =>
            minimatch(key, pattern, { nocase: true })
          );

        if (shouldInclude) {
          result[key] = value;
        }
      }
    });
  }

  return result;
};

// 便利な関数を提供
export function expandPath(
  userPath: string,
  options: PathExpandOptions = {}
): Result<string, PathError> {
  const {
    dangerousCharsPattern = defaultDangerousCharsPattern,
    ...restOptions
  } = options;
  // defaultAllowedVarsを使用してallowedVarsを構築
  const defaultVars = defaultAllowedVars({
    allowedVars: restOptions.allowedVars || {},
    includeProcessEnv: restOptions.includeProcessEnv ?? true,
    trustedPatterns: restOptions.trustedPatterns || [
      "HOME",
      "USERPROFILE",
      "APPDATA",
      "LOCALAPPDATA",
      "TEMP",
      "TMP",
      "PATH",
      "PROGRAMFILES*",
      "SYSTEM*",
      "USER*",
    ],
    ignoredPatterns: restOptions.ignoredPatterns || [
      "*PASSWORD*",
      "*SECRET*",
      "*TOKEN*",
      "*KEY*",
      "*PRIVATE*",
      "*CREDENTIAL*",
      "*AUTH*",
    ],
  });
  return secureExpandPathSafe(userPath, {
    ...restOptions,
    allowedVars: defaultVars,
    dangerousCharsPattern,
  });
}

// 文字列内の環境変数置き換え用オプション
export interface VarsExpandOptions {
  /** 追加で許可する変数マップ */
  allowedVars?: Record<string, string>;
  /** process.env を取り込むか (既定: true) */
  includeProcessEnv?: boolean;
  /** 取り込む変数のホワイトリストパターン */
  trustedPatterns?: Array<string>;
  /** 除外する変数のブラックリストパターン */
  ignoredPatterns?: Array<string>;
}

/**
 * 文字列内の環境変数置き換えを行う。
 * ${VAR} または %VAR% 形式をサポートします。
 */
export function expandVars(
  input: string,
  options: VarsExpandOptions = {}
): string {
  const defaultVars = defaultAllowedVars({
    allowedVars: options.allowedVars || {},
    includeProcessEnv: options.includeProcessEnv ?? true,
    trustedPatterns: options.trustedPatterns || [],
    ignoredPatterns: options.ignoredPatterns || [],
  });
  return evalVars(input, defaultVars);
}
