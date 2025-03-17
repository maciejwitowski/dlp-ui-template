/**
 * Shared encryption utilities for VANA DLP integration
 */

// Store the generated values so they remain consistent
let generatedIV: Uint8Array | null = null;
let generatedEphemeralKey: Uint8Array | null = null;

/**
 * Generate or retrieve the encryption parameters (IV and ephemeral key)
 * Ensures the same values are used across multiple calls
 * @returns An object containing the IV and ephemeral key
 */
export function getEncryptionParameters() {
  // Generate values only once
  if (!generatedIV || !generatedEphemeralKey) {
    generatedIV = crypto.getRandomValues(new Uint8Array(16));
    generatedEphemeralKey = crypto.getRandomValues(new Uint8Array(32));
  }
  
  return {
    iv: generatedIV,
    ephemeralKey: generatedEphemeralKey,
    ivHex: Buffer.from(generatedIV).toString('hex'),
    ephemeralKeyHex: Buffer.from(generatedEphemeralKey).toString('hex')
  };
} 