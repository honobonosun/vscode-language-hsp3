# Project Dependencies

## src/desktop/extension.ts

Imports:

- `vscode` (from "vscode")
- `../common/config` (as `createConfig`)
- `../common/langCfg` (as `createLanguageConfigurationManager`)
- `../common/constant` (as `EXTENSION_ID`, `LANGUAGE_ID`, `OUTPUT_NAME`)
- `../common/log` (as `createLogger`)
- `./terminal` (as `terminalManager`)
- `./executor` (as `createExecutor`)
- `./helpman` (as `createHelpman`)
- `../common/i18n` (as `i18n`)
- `./toolset` (as `createToolset`)
- `../common/extmgr` (as `createExtensionManager`)

## src/common/config.ts

Imports:

- `vscode` (from "vscode")

## src/common/langCfg.ts

Imports:

- `vscode` (from "vscode")

## src/common/constant.ts

Imports: (None)

## src/common/log.ts

Imports:

- `vscode` (from "vscode")
- `./i18n` (as `i18n`)
- `./delay` (as `createDelayTimer`)

## src/common/i18n.ts

Imports:

- `i18next` (from "i18next")
- `../../locales/ja.json` (as `jaLocales`)
- `../../locales/en.json` (as `enLocales`)

## src/common/delay.ts

Imports:

- `zod` (from "zod")

## src/desktop/terminal.ts

Imports:

- `vscode` (from "vscode")
- `string-width` (from "string-width")

## src/desktop/executor.ts

Imports:

- `child_process` (from "child_process")
- `./terminal` (as `TerminalStream`)
- `../common/config` (as `ConfigInstance`)

## src/desktop/helpman.ts

Imports:

- `vscode` (from "vscode")
- `child_process` (from "child_process")
- `opener` (from "opener")
- `../common/config` (as `ConfigInstance`)

## src/desktop/toolset.ts

Imports:

- `vscode` (from "vscode")
- `../common/constant` (as `TOOLSET_HSP3_EXTENSION_ID`, `EXTENSION_ID`)
- `../common/config` (as `ConfigInstance`)
- `../common/extmgr` (as `ExtMgrInstance`)
- `../common/log` (as `LoggerInstance`)
- `./pathex` (as `expandPath`)
- `zod` (from "zod")
- `../common/types` (as `Result`)

## src/desktop/pathex.ts

Imports:

- `untildify` (from "untildify")
- `path` (from "path")
- `minimatch` (from "minimatch")
- `../common/types` (as `Result`)

## src/common/types.ts

Imports: (None)

## src/common/extmgr.ts

Imports:

- `vscode` (from "vscode")
- `./log` (as `LoggerInstance`)
- `./types` (as `Result`)
- `./i18n` (as `i18n`)
