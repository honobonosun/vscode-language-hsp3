import { secureExpandPathSafe } from "../pathex";

export function substituteVariables(
  input: string,
  context: { editorPath: string; filePath: string }
): string {
  // %VAR% または ${VAR} の形式で変数を検出
  return input.replace(/%(\w+)%|\$\{(\w+)\}/g, (match, winVar, unixVar) => {
    const varName = winVar || unixVar;
    let value: string | undefined;
    if (varName === "FILEPATH") {
      value = context.filePath;
    } else if (varName === "editorPath") {
      value = context.editorPath;
    }
    if (value !== undefined) {
      const result = secureExpandPathSafe(value);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.value;
    }
    // 未知の変数はそのまま返す
    return match;
  });
}
