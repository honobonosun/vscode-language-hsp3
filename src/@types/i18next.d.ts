import jaNs from "../../locales/ja.json";

declare module "i18next" {
	interface CustomTypeOptions {
		defaultNS: "ns";
		resources: {
			ns: typeof jaNs;
		};
	}
}
