import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import Script from "next/script";
import { Suspense, type ReactNode } from "react";

import { GoogleTagManagerPageView } from "../_components/google-tag-manager-page-view";
import {
  getHtmlLanguage,
  getWorkspaceLanguageFromAppLocale,
} from "../_lib/i18n";
import "@rainbow-me/rainbowkit/styles.css";
import "../globals.css";
import { APP_LOCALES, isAppLocale, type AppLocale } from "@/i18n/locales";

const GOOGLE_TAG_MANAGER_ID = "GTM-MVGXC53S";

const SITE_METADATA: Record<AppLocale, Metadata> = {
  en: {
    title: "K-Line Intelligence Hub",
    description: "KOL signal intelligence tool for Crypto trading communities",
  },
  zh: {
    title: "K线情报局",
    description: "面向 Crypto 交易社群的 KOL 信号情报工具",
  },
};

type LocaleLayoutProps = Readonly<{
  children: ReactNode;
  params: Promise<{ locale: string }>;
}>;

export function generateStaticParams() {
  return APP_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: Pick<LocaleLayoutProps, "params">): Promise<Metadata> {
  const locale = await readLocaleParam(params);
  return SITE_METADATA[locale];
}

export default async function RootLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const locale = await readLocaleParam(params);
  const language = getWorkspaceLanguageFromAppLocale(locale);
  setRequestLocale(locale);

  return (
    <html lang={getHtmlLanguage(language)} className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider locale={locale} messages={{}}>
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GOOGLE_TAG_MANAGER_ID}`}
              height="0"
              width="0"
              title="Google Tag Manager"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
          <Suspense fallback={null}>
            <GoogleTagManagerPageView />
          </Suspense>
          {children}
          <Script id="google-tag-manager" strategy="afterInteractive">
            {`
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GOOGLE_TAG_MANAGER_ID}');
          `}
          </Script>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

async function readLocaleParam(params: LocaleLayoutProps["params"]): Promise<AppLocale> {
  const { locale } = await params;
  if (!isAppLocale(locale)) {
    notFound();
  }
  return locale;
}
