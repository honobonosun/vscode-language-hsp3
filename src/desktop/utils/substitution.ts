import { Result } from "../../common/types";
import { expandPath, PathError } from "../pathex";

/**
 * 文字列内の変数（%FILEPATH%, %EDITORPATH%）を展開します。
 * 失敗時は例外をスローします。
 * @param input 置換対象の文字列
 * @param context 置換用コンテキスト
 * @returns 置換済み文字列
 */
export function substituteVariables(
  input: string,
  context: { editorPath: string; filePath: string; hsp3Root?: string }
): Result<string, PathError> {
  // expandPath による一括置換
  const allowedVars: Record<string, string> = {
    FILEPATH: context.filePath,
    EDITORPATH: context.editorPath,
  };
  if (context.hsp3Root) {
    allowedVars.HSP3_ROOT = context.hsp3Root;
  }
  return expandPath(input, {
    baseDir: process.cwd(),
    allowOutsideBase: true,
    allowedVars,
    includeProcessEnv: false,
  });
}
