import { unknown } from "zod";

export default function createDelayTimer<T extends unknown[] = []>(
  fn: (...args: T) => void
) {
  let timer: number;
  const clear = () => {
    if (timer) clearTimeout(timer);
  };
  return {
    setTimer: (delay: number, ...args: T) => {
      clear();
      timer = setTimeout(fn, delay, ...args);
    },
    clearTimer: () => clear(),
    dispose: () => clear(),
  };
}
