import type { Metadata } from "next";
import Script from "next/script";
import { Suspense } from "react";
import { GoogleTagManagerPageView } from "./_components/google-tag-manager-page-view";
import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";

const GOOGLE_TAG_MANAGER_ID = "GTM-MVGXC53S";

export const metadata: Metadata = {
  title: "K线情报局",
  description: "面向 Crypto 交易社群的 KOL 信号情报工具",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
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
      </body>
    </html>
  );
}
