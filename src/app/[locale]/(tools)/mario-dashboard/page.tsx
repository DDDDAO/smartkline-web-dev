import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isAppLocale, type AppLocale } from "@/i18n/locales";
import { MarioDashboard } from "./mario-dashboard";
import "./mario-dashboard.css";

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const MARIO_METADATA: Record<AppLocale, Metadata> = {
  en: {
    title: "Mario Sniper Dashboard",
    description: "Trading coordinates, pending orders, positions, order history, and countdown panels",
  },
  zh: {
    title: "马里奥的狙击台",
    description: "交易坐标、挂单、持仓、历史订单和倒计时面板",
  },
};

type MarioDashboardPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: MarioDashboardPageProps): Promise<Metadata> {
  const locale = await readLocaleParam(params);
  return MARIO_METADATA[locale];
}

export default async function MarioDashboardPage({
  params,
}: MarioDashboardPageProps) {
  const locale = await readLocaleParam(params);
  setRequestLocale(locale);

  return <MarioDashboard className={jetBrainsMono.className} />;
}

async function readLocaleParam(params: MarioDashboardPageProps["params"]): Promise<AppLocale> {
  const { locale } = await params;
  if (!isAppLocale(locale)) {
    notFound();
  }
  return locale;
}
