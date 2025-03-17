"use client";

import { activeChain } from "@/contracts/chains";
import { paraClient } from "@/lib/wallet";
import {
  coinbaseWallet,
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
  zerionWallet,
} from "@getpara/evm-wallet-connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { ReactNode, useMemo } from "react";
import { cookieStorage, cookieToInitialState, createStorage } from "wagmi";

// Create a client
const queryClient = new QueryClient();
const ParaEvmProvider = dynamic(
  () =>
    import("@getpara/evm-wallet-connectors").then((mod) => mod.ParaEvmProvider),
  { ssr: false }
);

const getWagmiConfig = () => ({
  para: paraClient,
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID!,
  appName: "Data Hub",
  chains: [activeChain],
  wallets: [
    metaMaskWallet,
    coinbaseWallet,
    walletConnectWallet,
    zerionWallet,
    rainbowWallet,
  ],
  syncConnectedChain: true,
  ssr: false,
  storage: createStorage({
    storage: cookieStorage,
  }),
});

export const WalletProvider: React.FC<{
  children: ReactNode;
  cookieHeader: string;
}> = ({ children, cookieHeader }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- This is a dynamic import
  const config: any = useMemo(() => getWagmiConfig(), []);
  const initialState = cookieToInitialState(config, cookieHeader);

  return (
    <ParaEvmProvider config={config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ParaEvmProvider>
  );
};
