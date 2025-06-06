import untildify from "untildify";
import path from "path";
import { Result } from "../common/types";

const hasOwnProp = (obj: object, prop: string | number | symbol): boolean => {
  return Object.prototype.hasOwnProperty.call(obj, prop);
};

// Result型の定義

// エラー型を明確に定義
export type PathError =
  | { type: "invalid_input"; message: string }
  | { type: "dangerous_chars"; message: string }
  | { type: "path_traversal"; message: string };

// secureExpandPathSafe用のオプション
export interface SecureExpandOptions {
  baseDir?: string;
  allowedVars?: Record<string, string>;
  allowOutsideBase?: boolean;
}

// expandPath用の拡張オプション
export interface PathExpandOptions extends SecureExpandOptions {
  includeProcessEnv?: boolean;
  trustedKeys?: Array<string>;
  ignoredKeys?: Array<string>;
}

export function secureExpandPathSafe(
  userPath: string,
  options: SecureExpandOptions = {}
): Result<string, PathError> {
  const {
    baseDir = process.cwd(),
    allowedVars = {},
    allowOutsideBase = false,
  } = options;

  // 入力検証
  if (typeof userPath !== "string" || userPath.length === 0) {
    return {
      success: false,
      error: { type: "invalid_input", message: "Invalid path input" },
    };
  }

  // 危険な文字をチェック
  const dangerousChars = /[;&|`(){}[\]]/;
  if (dangerousChars.test(userPath)) {
    return {
      success: false,
      error: {
        type: "dangerous_chars",
        message: "Path contains dangerous characters",
      },
    };
  }

  let expandedPath = userPath;

  // 1. 環境変数を安全に展開（ホワイトリスト形式、UnixとWindowsの両方をサポート）
  expandedPath = expandedPath.replace(
    /\$\{?(\w+)\}?|%(\w+)%/g,
    (match: string, unixVar: string, winVar: string) => {
      const varName = unixVar || winVar;
      if (hasOwnProp(allowedVars, varName)) return allowedVars[varName];
      return match; // 許可されていない変数はそのまま
    }
  );

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

// デフォルトの許可された環境変数を提供
export const defaultAllowedVars = ({
  allowedVars = {},
  includeProcessEnv = false,
  trustedKeys = [],
  ignoredKeys = [],
}: {
  allowedVars: Record<string, string>;
  includeProcessEnv: boolean;
  trustedKeys: Array<string>;
  ignoredKeys: Array<string>;
}): Record<string, string> => {
  const result: Record<string, string> = allowedVars;

  if (includeProcessEnv) {
    Object.entries(process.env).forEach(([key, value]) => {
      if (!hasOwnProp(allowedVars, key)) {
        const shouldInclude =
          trustedKeys.length > 0
            ? trustedKeys.includes(key)
            : !ignoredKeys.includes(key);
        if (shouldInclude && value) {
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
  // defaultAllowedVarsを使用してallowedVarsを構築
  const defaultVars = defaultAllowedVars({
    allowedVars: options.allowedVars || {},
    includeProcessEnv: options.includeProcessEnv ?? true,
    trustedKeys: options.trustedKeys || [
      "HOME",
      "USERPROFILE",
      "APPDATA",
      "LOCALAPPDATA",
      "TEMP",
      "TMP",
      "PATH",
    ],
    ignoredKeys: options.ignoredKeys || [
      "PASSWORD",
      "SECRET",
      "TOKEN",
      "KEY",
      "PRIVATE",
    ],
  });

  return secureExpandPathSafe(userPath, {
    ...options,
    allowedVars: defaultVars,
  });
}
