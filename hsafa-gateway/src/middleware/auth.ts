import { Request, Response, NextFunction } from 'express';
import { jwtVerify, createRemoteJWKSet, JWTPayload } from 'jose';
import { prisma } from '../lib/db.js';

// =============================================================================
// Types
// =============================================================================

export interface AuthContext {
  /** The authentication method used */
  method: 'secret_key' | 'public_key_jwt';
  /** The resolved Entity ID (from JWT) */
  entityId?: string;
  /** The entity's externalId from JWT */
  externalId?: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

// =============================================================================
// JWT Configuration
// =============================================================================

const HSAFA_SECRET_KEY = process.env.HSAFA_SECRET_KEY;
const HSAFA_PUBLIC_KEY = process.env.HSAFA_PUBLIC_KEY;
const JWT_SECRET = process.env.JWT_SECRET;
const JWKS_URL = process.env.JWKS_URL;
const JWT_ENTITY_CLAIM = process.env.JWT_ENTITY_CLAIM || 'sub';

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!jwks && JWKS_URL) {
    jwks = createRemoteJWKSet(new URL(JWKS_URL));
  }
  return jwks;
}

/**
 * Verify a JWT token and return the payload.
 * Supports both shared secret and JWKS URL verification.
 */
async function verifyJWT(token: string): Promise<JWTPayload> {
  if (JWT_SECRET) {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  }

  const jwksSet = getJWKS();
  if (jwksSet) {
    const { payload } = await jwtVerify(token, jwksSet);
    return payload;
  }

  throw new Error('No JWT_SECRET or JWKS_URL configured');
}

/**
 * Extract the entity identifier from JWT payload.
 * Uses the configured JWT_ENTITY_CLAIM (default: "sub").
 */
function extractExternalId(payload: JWTPayload): string | null {
  const value = payload[JWT_ENTITY_CLAIM];
  if (typeof value === 'string') return value;
  return null;
}

// =============================================================================
// Middleware: Secret Key Authentication (Full Access)
// =============================================================================

/**
 * Authenticates requests using the system-wide secret key.
 * The secret key must be passed in the `x-secret-key` header.
 * Grants full admin access to all gateway operations.
 *
 * Usage: For admin backends, Node.js services, and CLI.
 * Optionally accepts a JWT to identify who sent a message.
 */
export function requireSecretKey() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const secretKey = req.headers['x-secret-key'] as string | undefined;

      if (!secretKey) {
        res.status(401).json({ error: 'Missing x-secret-key header' });
        return;
      }

      if (!HSAFA_SECRET_KEY || secretKey !== HSAFA_SECRET_KEY) {
        res.status(401).json({ error: 'Invalid secret key' });
        return;
      }

      // Optionally resolve entity from JWT if provided
      const authHeader = req.headers['authorization'] as string | undefined;
      let entityId: string | undefined;
      let externalId: string | undefined;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.slice(7);
          const payload = await verifyJWT(token);
          externalId = extractExternalId(payload) ?? undefined;

          if (externalId) {
            const entity = await prisma.entity.findUnique({
              where: { externalId },
              select: { id: true },
            });
            if (entity) {
              entityId = entity.id;
            }
          }
        } catch {
          // JWT is optional with secret key — ignore verification errors
        }
      }

      req.auth = {
        method: 'secret_key',
        entityId,
        externalId,
      };

      next();
    } catch (error) {
      console.error('Secret key auth error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  };
}

// =============================================================================
// Middleware: Public Key + JWT Authentication (Limited Access)
// =============================================================================

/**
 * Authenticates requests using the system-wide public key + JWT token.
 * - Public key in `x-public-key` header validates the request comes from a known client.
 * - JWT in `Authorization: Bearer <token>` header identifies the human user.
 * - Resolves the entity by matching JWT claim to entity.externalId.
 *
 * Usage: For React/browser clients with human users.
 * Limited capabilities: send messages, read streams, submit tool results.
 */
export function requirePublicKeyJWT() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const publicKey = req.headers['x-public-key'] as string | undefined;
      const authHeader = req.headers['authorization'] as string | undefined;

      if (!publicKey) {
        res.status(401).json({ error: 'Missing x-public-key header' });
        return;
      }

      if (!HSAFA_PUBLIC_KEY || publicKey !== HSAFA_PUBLIC_KEY) {
        res.status(401).json({ error: 'Invalid public key' });
        return;
      }

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or invalid Authorization header' });
        return;
      }

      const token = authHeader.slice(7);

      // 1. Verify JWT
      let payload: JWTPayload;
      try {
        payload = await verifyJWT(token);
      } catch (err) {
        res.status(401).json({ error: 'Invalid or expired JWT' });
        return;
      }

      // 2. Extract external ID from JWT
      const externalId = extractExternalId(payload);
      if (!externalId) {
        res.status(401).json({ error: `JWT missing claim: ${JWT_ENTITY_CLAIM}` });
        return;
      }

      // 3. Look up entity by externalId
      const entity = await prisma.entity.findUnique({
        where: { externalId },
        select: { id: true },
      });

      if (!entity) {
        res.status(403).json({ error: 'No entity found for this user' });
        return;
      }

      req.auth = {
        method: 'public_key_jwt',
        entityId: entity.id,
        externalId,
      };

      next();
    } catch (error) {
      console.error('Public key + JWT auth error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  };
}

// =============================================================================
// Middleware: Either Secret Key OR Public Key + JWT
// =============================================================================

/**
 * Accepts either authentication method:
 * - Secret key (full admin access)
 * - Public key + JWT (human user access, limited)
 *
 * Tries secret key first, then public key + JWT.
 */
export function requireAuth() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const secretKey = req.headers['x-secret-key'] as string | undefined;
    const publicKey = req.headers['x-public-key'] as string | undefined;

    if (secretKey) {
      return requireSecretKey()(req, res, next);
    }

    if (publicKey) {
      return requirePublicKeyJWT()(req, res, next);
    }

    res.status(401).json({
      error: 'Authentication required. Provide x-secret-key, or x-public-key + Authorization header.',
    });
  };
}

// =============================================================================
// Middleware: Membership Check
// =============================================================================

/**
 * Checks that the authenticated entity is a member of the SmartSpace.
 * Must be used AFTER requireAuth() or requirePublicKeyJWT().
 *
 * The SmartSpace ID comes from the route params (`:smartSpaceId`).
 * For secret key auth: skips membership check (full access).
 * For public key + JWT auth: checks the resolved entityId from JWT.
 */
export function requireMembership() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.auth) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { method } = req.auth;

      // Secret key = full access, skip membership check
      if (method === 'secret_key') {
        return next();
      }

      // For JWT auth, check membership
      const entityId = req.auth.entityId;
      if (!entityId) {
        res.status(403).json({ error: 'No entity resolved from JWT' });
        return;
      }

      // Get smartSpaceId from route params
      const smartSpaceId = req.params.smartSpaceId;
      if (!smartSpaceId) {
        res.status(403).json({ error: 'No SmartSpace ID in route params' });
        return;
      }

      const membership = await prisma.smartSpaceMembership.findUnique({
        where: {
          smartSpaceId_entityId: {
            smartSpaceId,
            entityId,
          },
        },
        select: { id: true, role: true },
      });

      if (!membership) {
        res.status(403).json({ error: 'Entity is not a member of this SmartSpace' });
        return;
      }

      next();
    } catch (error) {
      console.error('Membership check error:', error);
      res.status(500).json({ error: 'Membership check failed' });
    }
  };
}
