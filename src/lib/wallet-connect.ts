const WALLETCONNECT_EXAMPLE_PROJECT_ID = "21fef48091f12692cad574a6f7753643";
const WALLETCONNECT_PLACEHOLDER_PROJECT_ID = "YOUR_PROJECT_ID";
const WALLETCONNECT_DISABLED_PROJECT_ID = "walletconnect-disabled";

function normalizeWalletConnectProjectId(projectId: string | undefined): string {
  const trimmedProjectId = projectId?.trim() ?? "";
  if (
    !trimmedProjectId ||
    trimmedProjectId === WALLETCONNECT_PLACEHOLDER_PROJECT_ID ||
    trimmedProjectId === WALLETCONNECT_EXAMPLE_PROJECT_ID
  ) {
    return "";
  }

  return trimmedProjectId;
}

export const walletConnectProjectId = normalizeWalletConnectProjectId(process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID);
export const isWalletConnectConfigured = walletConnectProjectId.length > 0;

/**
 * RainbowKit turns "YOUR_PROJECT_ID" into its shared demo id, which makes
 * production failures look like a valid WalletConnect relay session.
 */
export const rainbowKitProjectId = isWalletConnectConfigured ? walletConnectProjectId : WALLETCONNECT_DISABLED_PROJECT_ID;
