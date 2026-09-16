const tseslint = require("@typescript-eslint/eslint-plugin");
const tsparser = require("@typescript-eslint/parser");

module.exports = [
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
      "@typescript-eslint/no-require-imports": "off",
      "no-undef": "off",

      // 一般的なJavaScript/TypeScriptルール
      "no-console": "off", // 開発用ツールなのでconsoleを許可
      "prefer-const": "off",
      "no-var": "off",
      eqeqeq: "error",
      curly: "off",
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

  // 除外設定
  {
    ignores: ["out/**", "node_modules/**", "*.d.ts", "dist/**", ".vscode-test/**"],
  },
];
