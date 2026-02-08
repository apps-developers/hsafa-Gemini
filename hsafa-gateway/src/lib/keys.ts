import { randomBytes } from 'crypto';

/**
 * Generate a random key with a prefix.
 * Format: prefix_<32 random hex chars>
 */
function generateKey(prefix: string): string {
  return `${prefix}_${randomBytes(24).toString('hex')}`;
}

/** Generate a public key (pk_...) for the HSAFA_PUBLIC_KEY env var */
export function generatePublicKey(): string {
  return generateKey('pk');
}

/** Generate a secret key (sk_...) for the HSAFA_SECRET_KEY env var */
export function generateSecretKey(): string {
  return generateKey('sk');
}

/** Generate a JWT signing secret (base64url, 48 bytes) */
export function generateJwtSecret(): string {
  return randomBytes(48).toString('base64url');
}
