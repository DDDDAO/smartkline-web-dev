import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ chainId: string }>;
};

const WALLET_RPC_UPSTREAMS: Record<string, { envKey: string; fallbackUrl: string }> = {
  "1": { envKey: "ETHEREUM_RPC_URL", fallbackUrl: "https://ethereum-rpc.publicnode.com" },
  "10": { envKey: "OPTIMISM_RPC_URL", fallbackUrl: "https://optimism-rpc.publicnode.com" },
  "56": { envKey: "BSC_RPC_URL", fallbackUrl: "https://bsc-rpc.publicnode.com" },
  "137": { envKey: "POLYGON_RPC_URL", fallbackUrl: "https://polygon-bor-rpc.publicnode.com" },
  "42161": { envKey: "ARBITRUM_RPC_URL", fallbackUrl: "https://arbitrum-one-rpc.publicnode.com" },
  "8453": { envKey: "BASE_RPC_URL", fallbackUrl: "https://base-rpc.publicnode.com" },
};

/**
 * Keep wallet RPC reads same-origin so browser wallets never fall back to
 * viem's public chain defaults, which can rate-limit CORS preflights.
 */
function walletRpcError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function resolveWalletRpcUrl(chainId: string): string | null {
  const upstream = WALLET_RPC_UPSTREAMS[chainId];
  if (!upstream) {
    return null;
  }

  return process.env[upstream.envKey]?.trim() || upstream.fallbackUrl;
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { chainId } = await context.params;
  const rpcUrl = resolveWalletRpcUrl(chainId);
  if (!rpcUrl) {
    return walletRpcError("Unsupported wallet RPC chain.", 404);
  }

  const body = await request.text();
  const upstreamResponse = await fetch(rpcUrl, {
    body,
    cache: "no-store",
    headers: {
      "content-type": request.headers.get("content-type") || "application/json",
    },
    method: "POST",
  });

  return new NextResponse(await upstreamResponse.text(), {
    headers: {
      "cache-control": "no-store",
      "content-type": upstreamResponse.headers.get("content-type") || "application/json",
    },
    status: upstreamResponse.status,
  });
}
