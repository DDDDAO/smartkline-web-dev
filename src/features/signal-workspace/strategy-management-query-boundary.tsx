"use client";

import { useState, type ComponentProps } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrategyManagementPanel } from "./copy-trading-prototype/strategy-management-panel";

type StrategyManagementPanelWithQueryProviderProps = ComponentProps<
  typeof StrategyManagementPanel
>;

export function StrategyManagementPanelWithQueryProvider(
  props: StrategyManagementPanelWithQueryProviderProps,
) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <StrategyManagementPanel {...props} />
    </QueryClientProvider>
  );
}
