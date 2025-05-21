import { createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected, coinbaseWallet, walletConnect } from "wagmi/connectors";

// Configure Wagmi
const config = createConfig({
  chains: [sepolia],
  connectors: [
    injected(), // MetaMask and browser injected wallets
    coinbaseWallet({
      appName: "Vana DLP Template",
    }),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
      showQrModal: true,
    }),
  ],
  transports: {
    [sepolia.id]: http(),
  },
});

export const wagmiConfig = config;
