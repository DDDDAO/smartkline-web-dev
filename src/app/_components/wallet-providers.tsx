"use client";

import { useState, type ReactNode } from "react";
import {
  darkTheme,
  getDefaultConfig,
  RainbowKitProvider,
  type WalletList,
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

type RainbowKitWalletFactory = WalletList[number]["wallets"][number];

const installedOnlyWallet = (createWallet: RainbowKitWalletFactory): RainbowKitWalletFactory => {
  return (params) => {
    const wallet = createWallet(params);

    return {
      ...wallet,
      hidden: () => !wallet.installed || wallet.hidden?.() === true,
    };
  };
};

const browserInjectedWallet = (params: Parameters<RainbowKitWalletFactory>[0]) => {
  void params;
  const wallet = injectedWallet();

  return {
    ...wallet,
    hidden: () => typeof window === "undefined" || typeof (window as Window & { ethereum?: unknown }).ethereum === "undefined" || wallet.hidden?.() === true,
  };
};

const walletGroups = isWalletConnectConfigured
  ? [
      {
        groupName: "推荐",
        wallets: [walletConnectWallet, metaMaskWallet, binanceWallet, okxWallet],
      },
      {
        groupName: "流行",
        wallets: [bybitWallet, coinbaseWallet, installedOnlyWallet(rabbyWallet), browserInjectedWallet],
      },
    ]
  : [
      {
        groupName: "浏览器插件",
        wallets: [
          installedOnlyWallet(metaMaskWallet),
          installedOnlyWallet(binanceWallet),
          installedOnlyWallet(okxWallet),
          installedOnlyWallet(bybitWallet),
          installedOnlyWallet(rabbyWallet),
          browserInjectedWallet,
        ],
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
