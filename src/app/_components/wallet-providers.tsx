"use client";

import { useState, type ReactNode } from "react";
import {
  darkTheme,
  getDefaultConfig,
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import {
  binanceWallet,
  bybitWallet,
  coinbaseWallet,
  injectedWallet,
  metaMaskWallet,
  okxWallet,
  rabbyWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, http } from "wagmi";
import { arbitrum, base, bsc, mainnet, optimism, polygon } from "wagmi/chains";
import { isWalletConnectConfigured, rainbowKitProjectId } from "@/app/_lib/wallet-connect";

const walletGroups = isWalletConnectConfigured
  ? [
      {
        groupName: "推荐",
        wallets: [metaMaskWallet, walletConnectWallet, coinbaseWallet],
      },
      {
        groupName: "流行",
        wallets: [binanceWallet, okxWallet, bybitWallet, rabbyWallet, injectedWallet],
      },
    ]
  : [
      {
        groupName: "浏览器插件",
        wallets: [injectedWallet],
      },
    ];

const walletConfig = getDefaultConfig({
  appName: "SmartKline",
  appUrl: "https://www.smartkline.com",
  chains: [mainnet, arbitrum, base, optimism, polygon, bsc],
  projectId: rainbowKitProjectId,
  ssr: true,
  transports: {
    [mainnet.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
    [optimism.id]: http(),
    [polygon.id]: http(),
    [bsc.id]: http(),
  },
  wallets: walletGroups,
});

export function WalletProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={walletConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          locale="zh-CN"
          theme={darkTheme({
            accentColor: "#7C5CFF",
            borderRadius: "large",
            fontStack: "system",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
