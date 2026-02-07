import { randomBytes } from 'crypto';

/**
 * Generate a random key with a prefix.
 * Format: prefix_<32 random hex chars>
 */
function generateKey(prefix: string): string {
  return `${prefix}_${randomBytes(24).toString('hex')}`;
}

/** Generate a public key for a SmartSpace (pk_...) */
export function generatePublicKey(): string {
  return generateKey('pk');
}

/** Generate a secret key for a SmartSpace (sk_...) */
export function generateSecretKey(): string {
  return generateKey('sk');
}
