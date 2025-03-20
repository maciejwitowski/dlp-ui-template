import { useState } from 'react';
import { useAccount, useConfig, useWriteContract } from 'wagmi';
import { waitForTransactionReceipt } from '@wagmi/core';
import { getAbi } from '@/contracts/abi';

export const useRewardClaim = () => {
  const { address } = useAccount();
  const config = useConfig();
  const { writeContractAsync, isPending } = useWriteContract();
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestReward = async (fileId: number) => {
    setIsClaiming(true);
    setError(null);
    
    try {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      // Get contract address from environment or config
      const dlpContractAddress = process.env.NEXT_PUBLIC_DLP_CONTRACT_ADDRESS;
      if (!dlpContractAddress) {
        throw new Error("DLP contract address not found");
      }
      
      // Request reward using wagmi hooks
      const hash = await writeContractAsync({
        address: dlpContractAddress as `0x${string}`,
        abi: getAbi('DataRegistryProxy'), // Assuming this is the correct ABI
        functionName: "requestReward",
        args: [fileId, 1], // Default quantity of 1
      });
      
      // Wait for transaction receipt
      const receipt = await waitForTransactionReceipt(config, {
        hash,
        confirmations: 1,
      });
      
      return {
        txHash: receipt.transactionHash,
        success: true
      };
    } catch (err) {
      console.error("Error claiming reward:", err);
      setError(err instanceof Error ? err.message : "Failed to claim reward");
      throw err;
    } finally {
      setIsClaiming(false);
    }
  };

  return {
    requestReward,
    isClaiming: isClaiming || isPending,
    error,
  };
}; 