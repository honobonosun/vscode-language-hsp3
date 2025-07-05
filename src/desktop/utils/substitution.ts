import { Result } from "../../common/types";
import { expandPath, PathError } from "../pathex";
import { minimatch } from "minimatch";

export interface VariableSubstitutionOptions {
  /** ファイルパス変数のパターンリスト（minimatch形式） */
  filePathPatterns?: string[];
  /** ファイルパス変数判定用のコールバック関数 */
  isFilePathVariable?: (variableName: string) => boolean;
}

/**
 * 文字列内の変数（%FILEPATH%, %EDITORPATH%）を展開します。
 * @param input 置換対象の文字列
 * @param context 置換用コンテキスト
 * @param options 変数置換オプション
 * @returns 置換済み文字列
 */
export function substituteVariables(
  input: string,
  context: { editorPath: string; filePath: string; hsp3Root?: string },
  options?: VariableSubstitutionOptions
): Result<string, PathError> {
  const {
    filePathPatterns = ["*FILEPATH*", "*EDITORPATH*", "*PATH*", "*DIR*"],
    isFilePathVariable,
  } = options || {};

  // 変数が含まれていない場合はそのまま返す
  if (!input.includes("%") && !input.includes("$")) {
    return { success: true, value: input };
  }

  const allowedVars: Record<string, string> = {
    FILEPATH: context.filePath,
    EDITORPATH: context.editorPath,
  };
  if (context.hsp3Root) {
    allowedVars.HSP3_ROOT = context.hsp3Root;
  }

  // ファイルパス変数かどうかを判定
  const shouldExpandAsPath = (varName: string): boolean => {
    // コールバック関数が提供されている場合はそれを優先
    if (isFilePathVariable) {
      return isFilePathVariable(varName);
    }
    
    // パターンマッチングで判定
    return filePathPatterns.some(pattern => 
      minimatch(varName, pattern, { nocase: true })
    );
  };

  // 変数が存在し、ファイルパス変数の場合のみexpandPathを使用
  const varsInInput = Object.keys(allowedVars).filter(varName => 
    input.includes(`%${varName}%`) || input.includes(`$${varName}`) || input.includes(`\${${varName}}`)
  );

  const hasFilePathVars = varsInInput.some(shouldExpandAsPath);

  if (hasFilePathVars) {
    // ファイルパス変数が含まれている場合はexpandPathを使用
    return expandPath(input, {
      baseDir: process.cwd(),
      allowOutsideBase: true,
      allowedVars,
      includeProcessEnv: false,
    });
  } else {
    // ファイルパス変数が含まれていない場合は単純な文字列置換
    let result = input;
    for (const [varName, value] of Object.entries(allowedVars)) {
      const patterns = [`%${varName}%`, `$${varName}`, `\${${varName}}`];
      for (const pattern of patterns) {
        result = result.replace(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
      }
    }
    return { success: true, value: result };
  }
}
