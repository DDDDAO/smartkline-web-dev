export const APP_LOCALES = ["zh", "en"] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_APP_LOCALE: AppLocale = "zh";

export function isAppLocale(locale: string | null | undefined): locale is AppLocale {
  return APP_LOCALES.some((supportedLocale) => supportedLocale === locale);
}

export function getAppLocaleFromPathname(pathname: string): AppLocale {
  const firstSegment = pathname.split("/").filter(Boolean)[0] ?? "";
  return isAppLocale(firstSegment) ? firstSegment : DEFAULT_APP_LOCALE;
}

export function replacePathnameLocale(pathname: string, nextLocale: AppLocale): string {
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];
  const routeSegments = isAppLocale(firstSegment) ? segments.slice(1) : segments;
  return `/${[nextLocale, ...routeSegments].join("/")}`;
}
