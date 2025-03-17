import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import * as openpgp from "openpgp";
import eccrypto from "eccrypto";
import { getEncryptionParameters } from "./crypto-utils";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Client-side encryption of file data
 * @param data The data to encrypt
 * @param signature The signature to use for encryption
 * @returns The encrypted data as a Blob
 */
export async function clientSideEncrypt(
  data: Blob,
  signature: string
): Promise<Blob> {
  const dataBuffer = await data.arrayBuffer();
  const message = await openpgp.createMessage({
    binary: new Uint8Array(dataBuffer),
  });

  const encrypted = await openpgp.encrypt({
    message,
    passwords: [signature],
    format: "binary",
  });

  // Convert WebStream<Uint8Array> to Blob
  const response = new Response(encrypted as ReadableStream<Uint8Array>);
  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  const encryptedBlob = new Blob([uint8Array], {
    type: "application/octet-stream",
  });
  return encryptedBlob;
}

/**
 * Encrypts data using a wallet public key
 * @param data The data to encrypt
 * @param publicKey The wallet public key
 * @returns The encrypted data as a hex string
 */
export const encryptWithWalletPublicKey = async (
  data: string,
  publicKey: string
): Promise<string> => {
  // Get consistent encryption parameters
  const { iv, ephemeralKey } = getEncryptionParameters();

  const publicKeyBytes = Buffer.from(
    publicKey.startsWith("0x") ? publicKey.slice(2) : publicKey,
    "hex"
  );
  const uncompressedKey =
    publicKeyBytes.length === 64
      ? Buffer.concat([Buffer.from([4]), publicKeyBytes])
      : publicKeyBytes;

  const encryptedBuffer = await eccrypto.encrypt(
    uncompressedKey,
    Buffer.from(data),
    {
      iv: Buffer.from(iv),
      ephemPrivateKey: Buffer.from(ephemeralKey),
    }
  );

  const encryptedHex = Buffer.concat([
    encryptedBuffer.iv,
    encryptedBuffer.ephemPublicKey,
    encryptedBuffer.ciphertext,
    encryptedBuffer.mac,
  ]).toString("hex");

  return encryptedHex;
};

/**
 * Prepares a file ID for the VANA DLP registry
 * @param url The URL of the file
 * @param timestamp Optional timestamp
 * @returns A formatted file ID
 */
export function formatVanaFileId(
  url: string,
  timestamp: number = Date.now()
): string {
  return `vana_submission_${timestamp}_${url.substring(
    url.lastIndexOf("/") + 1
  )}`;
}

/**
 * Convert Blob to Base64 string for data transmission
 * @param blob The Blob to convert
 * @returns Promise resolving to a Base64 string
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remove the data URL prefix (e.g., "data:application/octet-stream;base64,")
      const base64Data = base64.split(",")[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Convert Base64 string back to Blob
 * @param base64 The Base64 string to convert
 * @param mimeType The MIME type of the resulting Blob
 * @returns A Blob created from the Base64 string
 */
export function base64ToBlob(
  base64: string,
  mimeType: string = "application/octet-stream"
): Blob {
  const byteCharacters = Buffer.from(base64, "base64").toString("binary");
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}
