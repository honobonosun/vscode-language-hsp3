import * as iconv from "iconv-lite";

/**
 * configに基づいてcharsをデコードしてstringに変換します。
 * @param chars
 * @param encoding
 */
export function decode(chars: Buffer, encoding: string): string {
  return iconv.decode(chars, encoding).replace(/\r?\n/g, "\n");
}
