import { HsafaClient } from "@hsafa/node";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

const GATEWAY_URL = process.env.HSAFA_GATEWAY_URL || "http://localhost:3001";
const SECRET_KEY = process.env.HSAFA_SECRET_KEY || "";

export async function POST(request: Request) {
  try {
    // Verify the caller's JWT
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const payload = await verifyToken(token);
    if (!payload) {
      return Response.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { smartSpaceId, email } = body as {
      smartSpaceId: string;
      email: string;
    };

    if (!smartSpaceId || !email) {
      return Response.json(
        { error: "smartSpaceId and email are required" },
        { status: 400 }
      );
    }

    // Find the target user by email
    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) {
      return Response.json(
        { error: "No user found with that email" },
        { status: 404 }
      );
    }

    if (!targetUser.hsafaEntityId) {
      return Response.json(
        { error: "User has no entity in the gateway" },
        { status: 400 }
      );
    }

    const hsafaClient = new HsafaClient({
      gatewayUrl: GATEWAY_URL,
      secretKey: SECRET_KEY,
    });

    // Add the target user as a member of the space
    await hsafaClient.spaces.addMember(smartSpaceId, {
      entityId: targetUser.hsafaEntityId,
      role: "member",
    });

    return Response.json({
      success: true,
      member: {
        email: targetUser.email,
        name: targetUser.name,
        entityId: targetUser.hsafaEntityId,
      },
    });
  } catch (error) {
    console.error("Invite to space error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to invite user";
    return Response.json({ error: message }, { status: 500 });
  }
}
