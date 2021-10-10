"use strict";
import { execFile } from "child_process";
import { promisify } from "util";

/**
 * 配列変数で渡したファイルパスをwinepathで変換します。
 * @param options winepathに渡すオプション
 * @param paths 変換するファイルパス
 */
export async function convertPath(
  options: string[],
  paths: string[]
): Promise<string[]> {
  const option = { maxBuffer: 1024 * paths.length };
  try {
    const { stdout } = await promisify(execFile)(
      "winepath",
      options.concat(paths),
      option
    );
    return stdout.split("\n");
  } catch (err) {
    console.log(err);
    return [];
  }
}
