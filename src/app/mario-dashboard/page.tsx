import type { Metadata } from "next";
import { MarioDashboard } from "./mario-dashboard";

export const metadata: Metadata = {
  title: "马里奥的狙击台",
  description: "交易坐标、挂单、持仓、历史订单和倒计时面板",
};

export default function MarioDashboardPage() {
  return <MarioDashboard />;
}
