import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { MarioDashboard } from "./mario-dashboard";
import "./mario-dashboard.css";

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "马里奥的狙击台",
  description: "交易坐标、挂单、持仓、历史订单和倒计时面板",
};

export default function MarioDashboardPage() {
  return <MarioDashboard className={jetBrainsMono.className} />;
}
