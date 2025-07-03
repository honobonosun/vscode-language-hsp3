// テスト用のダミーを用意

import { ConfigInstance } from "../common/config";

const createExecutor = (config: ConfigInstance) => {
  return {
    dispose: () => {
      console.log("dispose");
    },
  };
};
export default createExecutor;
export type ExecutorInstance = ReturnType<typeof createExecutor>;
