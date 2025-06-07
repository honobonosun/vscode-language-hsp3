import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import prettier from "eslint-plugin-prettier";

export default [
  // JavaScript推奨設定
  js.configs.recommended,

  // TypeScriptファイルの設定
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        project: "./tsconfig.json",
      },
      globals: {
        // Node.js環境
        NodeJS: "readonly",
        process: "readonly",
        Buffer: "readonly",
        console: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        global: "readonly",

        // Browser環境（Web拡張用）
        window: "readonly",
        document: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      prettier,
    },
    rules: {
      // TypeScript推奨ルール
      ...tseslint.configs.recommended.rules,

      // プロジェクト固有のルール調整
      "@typescript-eslint/no-unused-vars": [
        "off",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",

      // VSCode拡張開発でよく使用されるパターンを許可
      "@typescript-eslint/no-var-requires": "off",
      "no-undef": "off",

      // Prettier連携
      "prettier/prettier": "error",

      // 一般的なJavaScript/TypeScriptルール
      "no-console": "off", // 開発用ツールなのでconsoleを許可
      "prefer-const": "off",
      "no-var": "off",
      eqeqeq: "error",
      curly: "off",
    },
  },

  // JavaScriptファイルの設定
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      globals: {
        process: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        console: "readonly",
      },
    },
    plugins: {
      prettier,
    },
    rules: {
      "prettier/prettier": "error",
      "no-console": "off",
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: "error",
      curly: "error",
    },
  },

  // テストファイルの設定
  {
    files: ["**/*.spec.ts", "**/*.test.ts", "**/tests/**/*.ts"],
    languageOptions: {
      globals: {
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        jest: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },

  // 設定ファイルの設定
  {
    files: ["*.config.js", "*.config.ts", "webpack.config.js"],
    languageOptions: {
      globals: {
        module: "readonly",
        require: "readonly",
        __dirname: "readonly",
        process: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-var-requires": "off",
      "no-console": "off",
    },
  },

  // 除外設定
  {
    ignores: [
      "out/**",
      "node_modules/**",
      "*.d.ts",
      "dist/**",
      ".vscode-test/**",
    ],
  },
];
