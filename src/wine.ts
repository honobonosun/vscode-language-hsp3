"use strict";
import { execFile } from "child_process";
import { promisify } from "util";

export async function convertPath(options: string[], paths: string[]): Promise<string[]> {
  const option = { "maxBuffer": (1024 * paths.length) };
  try {
    const { stdout } = await promisify(execFile)("winepath", options.concat(paths), option);
    return stdout.split("\n");
  } catch (err) {
    return Promise.resolve(err);
  }
}
