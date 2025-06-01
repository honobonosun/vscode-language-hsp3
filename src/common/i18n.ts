import i18next from "i18next";
import jaLocales from "../../locales/ja.json";
import enLocales from "../../locales/en.json";

interface I18nOption {
  debug: boolean;
}

export async function init(lng: string, option?: I18nOption) {
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

export const i18n = i18next;
