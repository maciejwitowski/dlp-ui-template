import Para, { Environment, OAuthMethod } from "@getpara/react-sdk";
import { paraConnector } from "@getpara/wagmi-v2-integration";
import { createConfig, http, type CreateConfigParameters } from "wagmi";
import { sepolia } from "wagmi/chains";

// Create the Para client instance
export const paraClient = new Para(
  Environment.BETA,
  process.env.NEXT_PUBLIC_PARA_API_KEY || ""
);

// Create Para connector
export const connector = paraConnector({
  para: paraClient,
  chains: [sepolia], // Add your supported chains
  appName: "Vana DLP Template",
  options: {},
  nameOverride: "Para",
  idOverride: "para",
  oAuthMethods: Object.values(OAuthMethod),
  disableEmailLogin: false,
  disablePhoneLogin: false,
  onRampTestMode: true,
});

// Configure Wagmi
const config: CreateConfigParameters = {
  chains: [sepolia],
  // @ts-expect-error - Type compatibility issue between Para connector and Wagmi
  connectors: [connector],
  transports: {
    [sepolia.id]: http(),
  },
};

export const wagmiConfig = createConfig(config);
