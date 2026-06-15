"use client";

import { useState, type ReactNode } from "react";
import {
  darkTheme,
  getWalletConnectConnector,
  getDefaultConfig,
  RainbowKitProvider,
  type Wallet,
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
import { injected as injectedConnector } from "wagmi/connectors";
import type { EIP1193Provider } from "viem";
import { isWalletConnectConfigured, rainbowKitProjectId } from "@/app/_lib/wallet-connect";

type RainbowKitWalletFactory = WalletList[number]["wallets"][number];
type BrowserWalletProvider = EIP1193Provider & {
  isBinance?: true;
  providers?: BrowserWalletProvider[];
};
type BrowserWalletWindow = Window & {
  binancew3w?: {
    isExtension?: boolean;
  };
  bybitWallet?: BrowserWalletProvider;
  ethereum?: BrowserWalletProvider;
  okxwallet?: BrowserWalletProvider;
};

const BINANCE_WALLET_ICON_URL = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="130" height="130" fill="none"><path fill="#000" d="M0 0h130v130H0z"/><path fill="#F3BA2F" d="M45.587 57.02 65.01 37.606l19.43 19.43 11.295-11.303L65.01 15 34.284 45.725zM15 65.004l11.299-11.299 11.298 11.299L26.3 76.302zM45.587 72.983 65.01 92.406l19.43-19.43 11.303 11.287-.008.007-30.725 30.734-30.725-30.718-.016-.016zM92.403 65.006 103.7 53.708 115 65.006l-11.299 11.299z"/><path fill="#F3BA2F" d="m76.471 64.998-11.46-11.469-8.476 8.475-.98.972-2.005 2.006-.016.016.016.024 11.46 11.453 11.461-11.47.008-.007z"/></svg>',
)}`;

const isAndroidUserAgent = () => (
  typeof navigator !== "undefined" && /android/iu.test(navigator.userAgent)
);

const getBrowserWalletWindow = (windowRef: Window | undefined = typeof window === "undefined" ? undefined : window): BrowserWalletWindow | undefined => {
  return windowRef as BrowserWalletWindow | undefined;
};

const createWalletConnectOrInjectedConnector = (
  getProvider: () => BrowserWalletProvider | undefined,
  createWalletConnectConnector: ReturnType<typeof getWalletConnectConnector>,
): Wallet["createConnector"] => {
  return (walletDetails) => {
    const provider = getProvider();
    if (!provider) {
      return createWalletConnectConnector(walletDetails);
    }

    return (config) => ({
      ...injectedConnector({
        target: () => ({
          id: walletDetails.rkDetails.id,
          name: walletDetails.rkDetails.name,
          provider,
        }),
      })(config),
      ...walletDetails,
    });
  };
};

const getBinanceExtensionProvider = (): BrowserWalletProvider | undefined => {
  const binanceWindow = getBrowserWalletWindow();
  if (binanceWindow?.binancew3w?.isExtension !== true) {
    return undefined;
  }

  const injectedProviders: BrowserWalletProvider[] | undefined = binanceWindow.ethereum?.providers;
  return injectedProviders?.find((provider: BrowserWalletProvider) => provider.isBinance === true)
    ?? (binanceWindow.ethereum?.isBinance === true ? binanceWindow.ethereum : undefined);
};

const getOkxExtensionProvider = (): BrowserWalletProvider | undefined => {
  return getBrowserWalletWindow()?.okxwallet;
};

const getBybitExtensionProvider = (): BrowserWalletProvider | undefined => {
  return getBrowserWalletWindow()?.bybitWallet;
};

const withStrictProviderQrFallback = (
  createWallet: RainbowKitWalletFactory,
  getProvider: () => BrowserWalletProvider | undefined,
): RainbowKitWalletFactory => {
  return (params) => {
    const wallet = createWallet(params);
    const createWalletConnectConnector = getWalletConnectConnector({
      projectId: params.projectId,
      walletConnectParameters: params.walletConnectParameters,
    });

    return {
      ...wallet,
      installed: getProvider() ? true : undefined,
      createConnector: createWalletConnectOrInjectedConnector(getProvider, createWalletConnectConnector),
    };
  };
};

/**
 * Gate injected mode behind each wallet's own provider namespace, then use
 * WalletConnect QR when that exact plugin is absent.
 */
const binanceWalletWithQrFallback: RainbowKitWalletFactory = ({ projectId, walletConnectParameters }): Wallet => {
  const createWalletConnectConnector = getWalletConnectConnector({ projectId, walletConnectParameters });

  return {
    id: "binance",
    name: "Binance Wallet",
    rdns: "com.binance.wallet",
    iconUrl: BINANCE_WALLET_ICON_URL,
    iconBackground: "#000000",
    installed: getBinanceExtensionProvider() ? true : undefined,
    downloadUrls: {
      android: "https://play.google.com/store/apps/details?id=com.binance.dev",
      ios: "https://apps.apple.com/us/app/id1436799971",
      mobile: "https://www.binance.com/en/download",
      qrCode: "https://www.binance.com/en/web3wallet",
      chrome: "https://chromewebstore.google.com/detail/cadiboklkpojfamcoggejbbdjcoiljjk",
    },
    mobile: {
      getUri: (uri) => (isAndroidUserAgent() ? uri : `bnc://app.binance.com/cedefi/wc?uri=${encodeURIComponent(uri)}`),
    },
    qrCode: {
      getUri: (uri) => uri,
      instructions: {
        learnMoreUrl: "https://www.binance.com/en/web3wallet",
        steps: [
          {
            description: "wallet_connectors.binance.qr_code.step1.description",
            step: "install",
            title: "wallet_connectors.binance.qr_code.step1.title",
          },
          {
            description: "wallet_connectors.binance.qr_code.step2.description",
            step: "create",
            title: "wallet_connectors.binance.qr_code.step2.title",
          },
          {
            description: "wallet_connectors.binance.qr_code.step3.description",
            step: "scan",
            title: "wallet_connectors.binance.qr_code.step3.title",
          },
        ],
      },
    },
    createConnector: createWalletConnectOrInjectedConnector(getBinanceExtensionProvider, createWalletConnectConnector),
  };
};

const okxWalletWithQrFallback = withStrictProviderQrFallback(okxWallet, getOkxExtensionProvider);
const bybitWalletWithQrFallback = withStrictProviderQrFallback(bybitWallet, getBybitExtensionProvider);

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
        wallets: [walletConnectWallet, metaMaskWallet, binanceWalletWithQrFallback, okxWalletWithQrFallback],
      },
      {
        groupName: "流行",
        wallets: [bybitWalletWithQrFallback, coinbaseWallet, installedOnlyWallet(rabbyWallet), browserInjectedWallet],
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
