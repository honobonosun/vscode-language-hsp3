import * as iconv from "iconv-lite";

/**
 * configに基づいてcharsをデコードしてstringに変換します。
 * @param buffer
 * @param encoding
 */
export function canDecode(cp: string): boolean {
  return iconv.encodingExists(cp);
}

export function decode(buffer: Buffer, encoding: string): string {
  return iconv.decode(buffer, encoding);
}
