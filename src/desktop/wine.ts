"use strict";
import { execFile } from "child_process";
import { promisify } from "util";

/**
 * 配列変数で渡したファイルパスをwinepathで変換します。
 * @param options winepathに渡すオプション
 * @param paths 変換するファイルパス
 */

export async function winepath(
  paths: string[],
  options: { transfer: "windows" | "unix" }
) {
  const totalLength = paths.reduce((sum, p) => sum + p.length, 0);
  const maxBuffer = totalLength * 4;
  const command = [options.transfer === "unix" ? "-u" : "-w", ...paths];
  const asyncFileExecutor = promisify(execFile);
  const r = await asyncFileExecutor("winepath", command, { maxBuffer });
  return r.stdout.trim().split(/\r?\n/);
}
