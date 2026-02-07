import { Request, Response, NextFunction } from 'express';
import { jwtVerify, createRemoteJWKSet, JWTPayload } from 'jose';
import { prisma } from '../lib/db.js';

// =============================================================================
// Types
// =============================================================================

export interface AuthContext {
  /** The authentication method used */
  method: 'gateway_admin' | 'secret_key' | 'public_key_jwt';
  /** The resolved SmartSpace ID (only set for space-scoped auth) */
  smartSpaceId?: string;
  /** The resolved Entity ID (from JWT or from request) */
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

const GATEWAY_ADMIN_KEY = process.env.GATEWAY_ADMIN_KEY;
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
// Middleware: Gateway Admin Key Authentication
// =============================================================================

/**
 * Authenticates requests using the gateway-level admin key.
 * Used for gateway-wide operations: creating spaces, managing entities, etc.
 * The key must be passed in the `x-admin-key` header.
 */
export function requireGatewayAdmin() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminKey = req.headers['x-admin-key'] as string | undefined;

      if (!adminKey) {
        res.status(401).json({ error: 'Missing x-admin-key header' });
        return;
      }

      if (!GATEWAY_ADMIN_KEY || adminKey !== GATEWAY_ADMIN_KEY) {
        res.status(401).json({ error: 'Invalid admin key' });
        return;
      }

      req.auth = {
        method: 'gateway_admin',
      };

      next();
    } catch (error) {
      console.error('Gateway admin auth error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  };
}

// =============================================================================
// Middleware: Secret Key Authentication
// =============================================================================

/**
 * Authenticates requests using a SmartSpace secret key.
 * The secret key must be passed in the `x-secret-key` header.
 * Grants full admin access to the SmartSpace.
 *
 * Usage: For admin backends and Node.js services.
 */
export function requireSecretKey() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const secretKey = req.headers['x-secret-key'] as string | undefined;

      if (!secretKey) {
        res.status(401).json({ error: 'Missing x-secret-key header' });
        return;
      }

      // Look up SmartSpace by secret key
      const smartSpace = await prisma.smartSpace.findUnique({
        where: { secretKey },
        select: { id: true },
      });

      if (!smartSpace) {
        res.status(401).json({ error: 'Invalid secret key' });
        return;
      }

      req.auth = {
        method: 'secret_key',
        smartSpaceId: smartSpace.id,
      };

      next();
    } catch (error) {
      console.error('Secret key auth error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  };
}

// =============================================================================
// Middleware: Public Key + JWT Authentication
// =============================================================================

/**
 * Authenticates requests using a public key + JWT token.
 * - Public key in `x-public-key` header identifies the SmartSpace.
 * - JWT in `Authorization: Bearer <token>` header identifies the human user.
 * - Resolves the entity by matching JWT claim to entity.externalId.
 *
 * Usage: For React/browser clients with human users.
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

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or invalid Authorization header' });
        return;
      }

      const token = authHeader.slice(7);

      // 1. Look up SmartSpace by public key
      const smartSpace = await prisma.smartSpace.findUnique({
        where: { publicKey },
        select: { id: true },
      });

      if (!smartSpace) {
        res.status(401).json({ error: 'Invalid public key' });
        return;
      }

      // 2. Verify JWT
      let payload: JWTPayload;
      try {
        payload = await verifyJWT(token);
      } catch (err) {
        res.status(401).json({ error: 'Invalid or expired JWT' });
        return;
      }

      // 3. Extract external ID from JWT
      const externalId = extractExternalId(payload);
      if (!externalId) {
        res.status(401).json({ error: `JWT missing claim: ${JWT_ENTITY_CLAIM}` });
        return;
      }

      // 4. Look up entity by externalId
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
        smartSpaceId: smartSpace.id,
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
 * - Gateway admin key (gateway-wide operations)
 * - Secret key (space admin/service access)
 * - Public key + JWT (human user access)
 *
 * Tries admin key first, then secret key, then public key + JWT.
 */
export function requireAuth() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const adminKey = req.headers['x-admin-key'] as string | undefined;
    const secretKey = req.headers['x-secret-key'] as string | undefined;
    const publicKey = req.headers['x-public-key'] as string | undefined;

    if (adminKey) {
      return requireGatewayAdmin()(req, res, next);
    }

    if (secretKey) {
      return requireSecretKey()(req, res, next);
    }

    if (publicKey) {
      return requirePublicKeyJWT()(req, res, next);
    }

    res.status(401).json({
      error: 'Authentication required. Provide x-admin-key, x-secret-key, or x-public-key + Authorization header.',
    });
  };
}

/**
 * Accepts either secret key or gateway admin key.
 * For space management operations (update, delete, manage members).
 */
export function requireSpaceAdmin() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const adminKey = req.headers['x-admin-key'] as string | undefined;
    const secretKey = req.headers['x-secret-key'] as string | undefined;

    if (adminKey) {
      return requireGatewayAdmin()(req, res, next);
    }

    if (secretKey) {
      return requireSecretKey()(req, res, next);
    }

    res.status(401).json({
      error: 'Space admin access required. Provide x-admin-key or x-secret-key header.',
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
 * For secret key auth: checks entityId from request body/params.
 * For public key + JWT auth: checks the resolved entityId from JWT.
 */
export function requireMembership() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.auth) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { smartSpaceId, method } = req.auth;

      // Admin or secret key = full access, skip membership check
      if (method === 'gateway_admin' || method === 'secret_key') {
        return next();
      }

      // For JWT auth, check membership
      const entityId = req.auth.entityId;
      if (!entityId) {
        res.status(403).json({ error: 'No entity resolved from JWT' });
        return;
      }

      if (!smartSpaceId) {
        res.status(403).json({ error: 'No SmartSpace resolved from authentication' });
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
