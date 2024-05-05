import { execFile } from "child_process";
import { promisify } from "util";

/**
 * 配列変数で渡したファイルパスをwinepathで変換します。
 * @param options winepathに渡すオプション
 * @param paths 変換するファイルパス
 */
export async function winepath(
  options: string[],
  paths: string[],
): Promise<string[]> {
  const option = { maxBuffer: 1024 * paths.length };
  return (
    (
      await promisify(execFile)("winepath", options.concat(paths), option).then(
        undefined,
        (reason) => {
          console.log(reason);
          return undefined;
        },
      )
    )?.stdout
      .split(/\n|\r\n/)
      .slice(0, -1) ?? []
  );
}
