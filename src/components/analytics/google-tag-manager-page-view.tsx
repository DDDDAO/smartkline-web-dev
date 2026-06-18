"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type DataLayerEvent = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer: DataLayerEvent[];
  }
}

export function GoogleTagManagerPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const queryString = searchParams.toString();
    const pagePath = queryString ? `${pathname}?${queryString}` : pathname;

    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({
      event: "page_view",
      page_location: window.location.href,
      page_path: pagePath,
      page_title: document.title,
    });
  }, [pathname, searchParams]);

  return null;
}
