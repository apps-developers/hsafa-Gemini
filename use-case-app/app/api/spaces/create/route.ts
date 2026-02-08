import { HsafaClient } from "@hsafa/node";
import { verifyToken } from "@/lib/auth";

const GATEWAY_URL = process.env.HSAFA_GATEWAY_URL || "http://localhost:3001";
const SECRET_KEY = process.env.HSAFA_SECRET_KEY || "";

export async function POST(request: Request) {
  try {
    // Verify the user's JWT
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
    const { name } = body as { name?: string };

    const hsafaClient = new HsafaClient({
      gatewayUrl: GATEWAY_URL,
      secretKey: SECRET_KEY,
    });

    // 1. Create the SmartSpace
    const { smartSpace } = await hsafaClient.spaces.create({
      name: name || `Chat ${new Date().toLocaleTimeString()}`,
      visibility: "private",
    });

    // 2. Add user as admin
    await hsafaClient.spaces.addMember(smartSpace.id, {
      entityId: payload.entityId,
      role: "admin",
    });

    // 3. Add agent as member
    await hsafaClient.spaces.addMember(smartSpace.id, {
      entityId: payload.agentEntityId,
      role: "member",
    });

    return Response.json({
      smartSpace: {
        id: smartSpace.id,
        name: smartSpace.name,
      },
    });
  } catch (error) {
    console.error("Create space error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create space";
    return Response.json({ error: message }, { status: 500 });
  }
}
