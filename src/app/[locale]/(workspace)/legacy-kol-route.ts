import { redirect } from "next/navigation";

export type LegacyKolRoutePageProps = {
  params: Promise<{ locale: string; symbol?: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function redirectToTopSignalsKolPanel({
  params,
  searchParams,
}: LegacyKolRoutePageProps): Promise<never> {
  const { locale, symbol } = await params;
  const sourceSearchParams = (await searchParams) ?? {};
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(sourceSearchParams)) {
    if (key === "panel" || value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        query.append(key, item);
      }
      continue;
    }

    query.set(key, value);
  }

  query.set("panel", "kol");
  const symbolPath = symbol ? `/${encodeURIComponent(symbol)}` : "";
  const pathname = `/${locale}/signal${symbolPath}`;
  redirect(`${pathname}?${query.toString()}`);
}
