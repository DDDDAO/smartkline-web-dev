import { connection, NextRequest } from "next/server";
import { proxyBackendReferralGet } from "../_proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  await connection();
  return proxyBackendReferralGet(request, "/referral/me", {
    enrichDashboard: true,
  });
}
