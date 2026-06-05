import type { Metadata } from "next";
import "./globals.css";


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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
