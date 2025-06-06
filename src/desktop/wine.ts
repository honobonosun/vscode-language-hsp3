"use strict";
import { execFile } from "child_process";
import { promisify } from "util";
import { Result } from "../common/types";

/**
 * 配列変数で渡したファイルパスをwinepathで変換します。
 * @param options winepathに渡すオプション
 * @param paths 変換するファイルパス
 */

export async function convertPath(
  paths: string[],
  options: { transfer: "windows" | "unix" }
) {
  const command = [options.transfer === "unix" ? "-u" : "-w", ...paths];
  const asyncFileExecutor = promisify(execFile);
  const r = await asyncFileExecutor("winepath", command, {
    maxBuffer: 1024 * paths.length,
  });

  return;
}
