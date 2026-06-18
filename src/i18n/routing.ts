import { defineRouting } from "next-intl/routing";

import { APP_LOCALES, DEFAULT_APP_LOCALE } from "./locales";

export const routing = defineRouting({
  defaultLocale: DEFAULT_APP_LOCALE,
  localeCookie: false,
  localeDetection: false,
  localePrefix: "always",
  locales: APP_LOCALES,
});
