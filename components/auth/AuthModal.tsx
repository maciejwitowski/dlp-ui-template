"use client";

import { ParaModal as AuthModalComponent } from "@getpara/react-sdk";
import { AuthLayout, ExternalWallet, OAuthMethod } from "@getpara/react-sdk";
import { paraClient } from "@/lib/wallet";
import { useState, useCallback } from "react";

interface AuthModalCustomProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalCustomProps) {
  return (
    <AuthModalComponent
      para={paraClient}
      isOpen={isOpen}
      onClose={onClose}
      logo="https://ohhoeotttdfnlowymysp.supabase.co/storage/v1/object/public/images-public/assets/vanaBlueLogo.png"
      theme={{
        mode: "dark",
        font: "__Noto_Sans_Mono_825853, __Noto_Sans_Mono_Fallback_825853",
        foregroundColor: "#ffffff",
        backgroundColor: "#0a0a14",
        accentColor: "#ffffff",
        borderRadius: "md",
      }}
      oAuthMethods={[OAuthMethod.GOOGLE, OAuthMethod.TWITTER]}
      disableEmailLogin={false}
      disablePhoneLogin
      authLayout={[AuthLayout.EXTERNAL_FULL, AuthLayout.AUTH_CONDENSED]}
      externalWallets={[
        ExternalWallet.METAMASK,
        ExternalWallet.COINBASE,
        ExternalWallet.WALLETCONNECT,
        ExternalWallet.ZERION,
        ExternalWallet.RAINBOW,
      ]}
      twoFactorAuthEnabled={false}
      recoverySecretStepEnabled
      onRampTestMode
    />
  );
}

// Export the open modal function to be used in other components
export function useAuthModal() {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    openModal,
    closeModal,
  };
}
