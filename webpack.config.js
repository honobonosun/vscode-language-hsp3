const path = require("path");

/**@type {import('webpack').Configuration}*/
const webConfig = {
  mode: "none",
  target: "webworker", // web拡張機能用
  entry: "./src/web/extension.ts",
  output: {
    path: path.resolve(__dirname, "out", "web"),
    filename: "extension.js",
    libraryTarget: "commonjs2",
    devtoolModuleFilenameTemplate: "../[resource-path]",
  },
  externals: {
    vscode: "commonjs vscode", // VSCode APIは外部依存として扱う
  },
  resolve: {
    mainFields: ["browser", "module", "main"],
    extensions: [".ts", ".js", "json"],
    alias: {
      // Node.js固有のモジュールをブラウザ対応版で置き換える場合
    },
    fallback: {
      // Node.js APIのポリフィル（必要に応じて）
      path: false,
      fs: false,
      child_process: false,
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: [/node_modules/, /test/],
        use: [
          {
            loader: "ts-loader",
            options: {
              configFile: "tsconfig.json",
            },
          },
        ],
      },
      {
        test: /\.json$/,
        type: "json",
      },
    ],
  },
  plugins: [],
  devtool: "nosources-source-map",
  infrastructureLogging: {
    level: "log", // webpack 5用のログ設定
  },
};

/**@type {import('webpack').Configuration}*/
const desktopConfig = {
  mode: "none",
  target: "node", // Node.js環境用
  entry: "./src/desktop/extension.ts",
  output: {
    path: path.resolve(__dirname, "out", "desktop"),
    filename: "extension.js",
    libraryTarget: "commonjs2",
    devtoolModuleFilenameTemplate: "../[resource-path]",
  },
  externals: {
    vscode: "commonjs vscode",
  },
  resolve: {
    extensions: [".ts", ".js", "json"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: [/node_modules/, /test/],
        use: [
          {
            loader: "ts-loader",
            options: {
              configFile: "tsconfig.json",
            },
          },
        ],
      },
      {
        test: /\.json$/,
        type: "json",
      },
    ],
  },
  plugins: [],
  devtool: "nosources-source-map",
  infrastructureLogging: {
    level: "log",
  },
};

module.exports = [webConfig, desktopConfig];
