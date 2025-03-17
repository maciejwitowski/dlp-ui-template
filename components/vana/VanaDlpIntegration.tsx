"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, Upload } from "lucide-react";
import { useAccount, useSignMessage } from "wagmi";
import { useUserData } from "@/components/profile/hooks/useUserData";
import { useAuthModal } from "../auth/AuthModal";
import { ContributionSteps } from "./ContributionSteps";
import {
  ContributionSummary,
  UserInfo,
  DriveInfo,
} from "./ContributionSummary";
import { ContributionSuccess, ContributionData } from "./ContributionSuccess";
import { ConnectWalletButton } from "./ConnectWalletButton";
import { useAddFile } from "./hooks/useAddFile";
import { useDataUpload } from "./hooks/useDataUpload";
import {
  useTeeProof,
  getDlpPublicKey,
  SIGN_MESSAGE,
} from "./hooks/useTeeProof";
import { useRewardClaim } from "./hooks/useRewardClaim";
import { encryptWithWalletPublicKey } from "@/lib/utils";
import { type Log, parseEventLogs, TransactionReceipt } from "viem";
import { getAbi } from "@/contracts/abi";

// Define the type for the FileAdded event arguments
type FileAddedEventArgs = {
  fileId: bigint;
  ownerAddress: `0x${string}`; // viem uses branded string type for addresses
  url: string;
};

/**
 * Get file ID from transaction receipt logs
 */
function extractFileIdFromReceipt(receipt: TransactionReceipt): number {
  try {
    // Ensure receipt exists and has logs
    if (!receipt || !receipt.logs || receipt.logs.length === 0) {
      throw new Error("Transaction receipt has no logs");
    }

    // Parse the event logs using viem's parseEventLogs
    const logs = parseEventLogs({
      abi: getAbi("DataRegistryProxy"),
      logs: receipt.logs as Log[],
      eventName: "FileAdded",
    });

    // Check if the FileAdded event was emitted
    if (logs.length === 0) {
      throw new Error("No FileAdded event found in transaction receipt");
    }

    // Safely cast the first log to the expected event type
    const fileAddedEvent = logs[0] as unknown as {
      args: FileAddedEventArgs;
      eventName: "FileAdded";
    };

    // Extract fileId from the event arguments
    const fileId = Number(fileAddedEvent.args.fileId);

    // Log for debugging purposes
    console.log("FileAdded event parsed:", {
      fileId,
      ownerAddress: fileAddedEvent.args.ownerAddress,
      url: fileAddedEvent.args.url,
    });

    return fileId;
  } catch (error) {
    console.error("Error extracting file ID from receipt:", error);
    throw new Error("Failed to extract file ID from transaction receipt");
  }
}

/**
 * VanaDlpIntegration component for users to contribute data to VANA's Data Liquidity Pools
 */
export function VanaDlpIntegration() {
  const { data: session } = useSession();
  const { userInfo, driveInfo } = useUserData();
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0); // 0 = not started, 1 = first step, 2 = second step, etc.
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [contributionData, setContributionData] =
    useState<ContributionData | null>(null);
  const [shareUrl, setShareUrl] = useState<string>("");

  // Para connection
  const { isConnected } = useAccount();
  const { isOpen, openModal, closeModal } = useAuthModal();
  const { signMessageAsync, isPending: isSigningMessage } = useSignMessage();

  // Custom hooks for data operations
  const { uploadData, isUploading } = useDataUpload();
  const { addFile, isAdding, contractError } = useAddFile();
  const { requestContributionProof, isProcessing } = useTeeProof();
  const { requestReward, isClaiming } = useRewardClaim();

  const handleContributeData = async () => {
    if (!session?.user) {
      setError("You need to sign in to contribute data");
      return;
    }

    if (!userInfo) {
      setError("Unable to access user information. Please try again.");
      return;
    }

    try {
      setError(null);

      // Sign the message to get a signature
      let signature;
      try {
        signature = await signMessageAsync({ message: SIGN_MESSAGE });
      } catch (signError) {
        console.error("Error signing message:", signError);
        setError("Failed to sign the message. Please try again.");
        return;
      }

      // Step 1: Upload data to Google Drive
      setCurrentStep(1);
      const uploadResult = await uploadData(
        userInfo as UserInfo,
        signature,
        driveInfo as DriveInfo
      );

      if (!uploadResult) {
        setError("Failed to upload data to Google Drive");
        return;
      }

      // Save the file URL that will be registered on blockchain
      setShareUrl(uploadResult.fileUrl);

      // Mark first step as completed
      setCompletedSteps((prev) => [...prev, 1]);

      // Step 2: Register on blockchain
      setCurrentStep(2);

      // Check wallet connection
      if (!isConnected) {
        setError("Wallet connection required to register on blockchain");
        return;
      }

      // Get DLP public key and encrypt the signature
      const publicKey = await getDlpPublicKey();
      const encryptedKey = await encryptWithWalletPublicKey(
        signature,
        publicKey
      );

      // Add the file to blockchain
      const txReceipt = await addFile(uploadResult.fileUrl, encryptedKey);

      if (!txReceipt) {
        // Use the specific contract error if available
        if (contractError) {
          setError(`Contract error: ${contractError}`);
        } else {
          setError("Failed to add file to blockchain");
        }
        return;
      }

      // Extract file ID from transaction receipt
      const fileId = extractFileIdFromReceipt(txReceipt);

      setContributionData({
        contributionId: uploadResult.vanaFileId,
        encryptedUrl: uploadResult.fileUrl,
        transactionReceipt: {
          hash: txReceipt.transactionHash,
          blockNumber: txReceipt.blockNumber
            ? Number(txReceipt.blockNumber)
            : undefined,
        },
        fileId,
      });

      // Mark second step as completed
      setCompletedSteps((prev) => [...prev, 2]);

      // Step 3: Request TEE Proof (if we have a file ID)
      if (fileId) {
        setCurrentStep(3);

        try {
          // Request the proof
          const proofResult = await requestContributionProof(
            fileId,
            encryptedKey,
            signature
          );

          // Mark third step as completed
          setCompletedSteps((prev) => [...prev, 3]);

          // Step 4: Process Proof
          setCurrentStep(4);

          // Update contribution data with TEE job info
          setContributionData((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              teeJobId: proofResult.jobId,
              teeProofData: proofResult.proofData,
            };
          });

          // Mark fourth step as completed
          setCompletedSteps((prev) => [...prev, 4]);

          // Step 5: Claim Reward
          setCurrentStep(5);

          // Request reward
          const rewardResult = await requestReward(fileId);

          // Update contribution data with reward transaction
          setContributionData((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              rewardTxHash: rewardResult.txHash,
            };
          });

          // Mark fifth step as completed
          setCompletedSteps((prev) => [...prev, 5]);

          // Set success after all steps are completed
          setIsSuccess(true);
        } catch (proofErr) {
          console.error("Error in TEE/reward process:", proofErr);
          setError(
            proofErr instanceof Error
              ? proofErr.message
              : "Failed to process TEE proof or claim reward"
          );
          // We don't return here because we still want to show the successful blockchain registration
        }
      } else {
        // If there's no fileId, we can't continue with steps 3-5, so set success now
        setIsSuccess(true);
      }
    } catch (error) {
      console.error("Error contributing data:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to process your contribution. Please try again."
      );
    }
  };

  // Check if any operation is in progress
  const isLoading =
    isUploading || isAdding || isProcessing || isClaiming || isSigningMessage;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Contribute to Data Liquidity Pools</CardTitle>
        <CardDescription>
          Share your Google account data to earn rewards from VANA Data
          Liquidity Pools
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isSuccess && contributionData ? (
          <ContributionSuccess
            contributionData={contributionData}
            completedSteps={completedSteps}
            shareUrl={shareUrl}
            userInfo={userInfo as UserInfo}
            driveInfo={driveInfo as DriveInfo}
          />
        ) : (
          <div className="space-y-4">
            {currentStep > 0 && (
              <ContributionSteps
                currentStep={currentStep}
                completedSteps={completedSteps}
                hasError={!!error}
              />
            )}

            {/* Display user data summary */}
            {userInfo && (
              <ContributionSummary
                userInfo={userInfo as UserInfo}
                driveInfo={driveInfo as DriveInfo}
                isEncrypted={false}
              />
            )}

            <Button
              onClick={handleContributeData}
              disabled={isLoading || !isConnected || !userInfo}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {currentStep === 1
                    ? "Uploading to Google Drive..."
                    : currentStep === 2
                    ? isSigningMessage
                      ? "Signing message..."
                      : "Adding to blockchain..."
                    : currentStep === 3
                    ? "Requesting TEE proof..."
                    : currentStep === 4
                    ? "Processing proof..."
                    : currentStep === 5
                    ? "Claiming reward..."
                    : "Processing..."}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Contribute Google Data
                </>
              )}
            </Button>

            {!isConnected && (
              <ConnectWalletButton
                isOpen={isOpen}
                openModal={openModal}
                closeModal={closeModal}
              />
            )}

            {!userInfo && (
              <div className="bg-yellow-50 text-yellow-800 p-2 text-xs rounded mt-2">
                Sign in with Google to contribute your data
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Your data is encrypted and securely stored in your Google Drive. You
        maintain control over who can access it.
      </CardFooter>
    </Card>
  );
}
