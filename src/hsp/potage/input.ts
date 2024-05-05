// 文字列向けinput配列を作成する関数。
export function input(str: string) {
  const chars = [...str];
  const length = chars.length - 1;
  const result: {
    char: string;
    point: number;
    line: number;
    column: number;
  }[] = [];
  let line = 0;
  let column = 0;

  for (let point = 0; point <= length; point++) {
    result.push({ char: chars[point], point, line, column });
    if (chars[point] === "\n") {
      line++;
      column = 0;
    } else {
      column++;
    }
  }
  return result;
}
