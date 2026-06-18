"use client";

import type { ComponentProps } from "react";
import { WalletProviders } from "@/components/providers/wallet-providers";
import {
  AccountManagementPanel,
  CopyTradingPrototypeModal,
  type CopyTradingPrototypeModalProps,
} from "./copy-trading-prototype";

type AccountManagementPanelWithWalletProps = ComponentProps<typeof AccountManagementPanel>;

export function AccountManagementPanelWithWallet(props: AccountManagementPanelWithWalletProps) {
  return (
    <WalletProviders>
      <AccountManagementPanel {...props} />
    </WalletProviders>
  );
}

export function CopyTradingPrototypeModalWithWallet(props: CopyTradingPrototypeModalProps) {
  return (
    <WalletProviders>
      <CopyTradingPrototypeModal {...props} />
    </WalletProviders>
  );
}
