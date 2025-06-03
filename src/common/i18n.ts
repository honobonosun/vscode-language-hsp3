import i18next, { TOptions } from "i18next";
import jaLocales from "../../locales/ja.json";
import enLocales from "../../locales/en.json";

interface I18nOption {
  debug: boolean;
}

async function init(lng: string, option?: I18nOption) {
  return i18next.init({
    lng,
    debug: option?.debug ?? false,
    defaultNS: "ns",
    resources: {
      ja: {
        ns: jaLocales,
      },
      en: {
        ns: enLocales,
      },
    },
    interpolation: {
      prefix: "{",
      suffix: "}",
    },
  });
}

// [i18next.t() の引数をTemplate Literal Types で縛る](https://queq1890.info/blog/typesafe-i18n)

type RecursiveRecord = {
  [key in string]: string | RecursiveRecord;
};

type PickKeys<T extends RecursiveRecord, K = keyof T> = K extends string
  ? T[K] extends string
    ? K
    : `${K}.${PickKeys<Extract<T[K], RecursiveRecord>>}`
  : never;

type I18nKey = PickKeys<typeof jaLocales>;

export const translate = (key: I18nKey | I18nKey[], options?: TOptions) => {
  return i18next.t(key, options);
};

export default {
  init,
  t: translate,
};
