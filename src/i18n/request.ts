import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";

import { isAppLocale } from "./locales";

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;

  if (!isAppLocale(locale)) {
    notFound();
  }

  return {
    locale,
    messages: {},
  };
});
