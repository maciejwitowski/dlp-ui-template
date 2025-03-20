import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { AuthModal } from "../auth/AuthModal";

type ConnectWalletButtonProps = {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
};

export function ConnectWalletButton({
  isOpen,
  openModal,
  closeModal,
}: ConnectWalletButtonProps) {
  return (
    <div className="mt-4">
      <Button
        onClick={openModal}
        variant="outline"
        className="w-full flex items-center"
      >
        <Wallet className="h-4 w-4 mr-2" />
        Connect Wallet
      </Button>
      <p className="text-xs text-muted-foreground mt-2">
        Connect your wallet to register data on the blockchain
      </p>
      <AuthModal isOpen={isOpen} onClose={closeModal} />
    </div>
  );
}
