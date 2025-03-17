import { blobToBase64, clientSideEncrypt } from "@/lib/utils";
import { useState } from "react";
import { DriveInfo, UserInfo } from "../ContributionSummary";

export interface UploadResponse {
  fileUrl: string;
  downloadUrl: string;
  fileId: string;
  vanaFileId: string;
}

/**
 * Hook for uploading and encrypting data
 */
export function useDataUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);

  /**
   * Upload data to Google Drive
   */
  const uploadData = async (
    userInfo: UserInfo,
    driveInfo?: DriveInfo
  ): Promise<UploadResponse | null> => {
    setIsUploading(true);
    setError(null);

    try {
      // Generate a simple signature for encryption
      const signature = `signature_${Date.now()}_${userInfo.id || "unknown"}`;

      // Prepare data package for VANA DLP
      const timestamp = Date.now();
      const dataPackage = {
        userId: userInfo.id || "unknown",
        email: userInfo.email,
        timestamp,
        profile: {
          name: userInfo.name,
          locale: userInfo.locale || "en",
        },
        storage: driveInfo
          ? {
              percentUsed: driveInfo.percentUsed,
            }
          : undefined,
        metadata: {
          source: "Google",
          collectionDate: new Date().toISOString(),
          dataType: "profile",
        },
      };

      const fileString = JSON.stringify(dataPackage);
      const fileBlob = new Blob([fileString], { type: "application/json" });

      // Encrypt the data on the client side
      const encryptedData = await clientSideEncrypt(fileBlob, signature);

      // Convert the encrypted Blob to Base64 string for JSON serialization
      const base64EncryptedFile = await blobToBase64(encryptedData);

      // Call API to upload already encrypted data
      const response = await fetch("/api/vana/upload-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          encryptedFile: base64EncryptedFile,
          timestamp,
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to process data" }));
        throw new Error(errorData.error || "Failed to upload and encrypt data");
      }

      const result = await response.json();

      setUploadResult(result);
      return result;
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to upload data");
      setError(error);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadData,
    isUploading,
    error,
    uploadResult,
  };
}
