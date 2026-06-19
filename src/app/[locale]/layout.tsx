import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import Script from "next/script";
import { Suspense, type ReactNode } from "react";

import { GoogleTagManagerPageView } from "@/components/analytics/google-tag-manager-page-view";
import {
  getHtmlLanguage,
  getWorkspaceLanguageFromAppLocale,
} from "@/i18n/workspace";
import "@rainbow-me/rainbowkit/styles.css";
import "../globals.css";
import { APP_LOCALES, isAppLocale, type AppLocale } from "@/i18n/locales";
import { getAppMessages, getSiteMetadata } from "@/i18n/messages";

const GOOGLE_TAG_MANAGER_ID = "GTM-MVGXC53S";

const dmSans = DM_Sans({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const jetBrainsMono = JetBrains_Mono({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

const rootFontClassName = `${dmSans.variable} ${jetBrainsMono.variable}`;

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
  return getSiteMetadata(locale);
}

export default async function RootLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const locale = await readLocaleParam(params);
  const language = getWorkspaceLanguageFromAppLocale(locale);
  const messages = getAppMessages(locale);
  setRequestLocale(locale);

  return (
    <html lang={getHtmlLanguage(language)} className={`h-full antialiased ${rootFontClassName}`}>
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground">
        <link href="https://api.fontshare.com" rel="preconnect" />
        <link crossOrigin="anonymous" href="https://cdn.fontshare.com" rel="preconnect" />
        <link href="https://api.fontshare.com/v2/css?f[]=general-sans@600,700&display=swap" rel="stylesheet" />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GOOGLE_TAG_MANAGER_ID}`}
              height="0"
              sandbox=""
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
