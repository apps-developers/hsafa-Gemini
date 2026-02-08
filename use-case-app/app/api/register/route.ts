import { HsafaClient } from "@hsafa/node";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signToken } from "@/lib/auth";

const GATEWAY_URL = process.env.HSAFA_GATEWAY_URL || "http://localhost:3001";
const SECRET_KEY = process.env.HSAFA_SECRET_KEY || "";

const AGENT_CONFIG = {
  version: "1.0",
  agent: {
    name: "hsafa-assistant",
    description: "A helpful AI assistant for Hsafa users.",
    system:
      "You are a helpful assistant.\nKeep answers concise and helpful.\nBe friendly and approachable.",
  },
  model: {
    provider: "openai",
    name: "gpt-5",
    api: "responses",
    maxOutputTokens: 16000,
    reasoning: {
      enabled: true,
      effort: "medium",
      summary: "auto",
    },
  },
  loop: {
    maxSteps: 10,
    toolChoice: "auto",
  },
  runtime: {
    response: {
      type: "ui-message-stream",
    },
  },
};

let cachedAgentEntityId: string | null = null;

async function ensureAgent(client: HsafaClient): Promise<string> {
  if (cachedAgentEntityId) return cachedAgentEntityId;

  try {
    // Try to create the agent + entity
    const { agentId } = await client.agents.create({
      name: "hsafa-assistant",
      config: AGENT_CONFIG,
    });

    const { entity: agentEntity } = await client.entities.createAgent({
      agentId,
      displayName: "Hsafa Assistant",
    });

    cachedAgentEntityId = agentEntity.id;
    return agentEntity.id;
  } catch {
    // Agent likely already exists (e.g., server restart) — look it up
    const { agents } = await client.agents.list();
    const existing = agents.find((a: any) => a.name === "hsafa-assistant");
    if (!existing) throw new Error("Failed to create or find hsafa-assistant agent");

    const { entities } = await client.entities.list({ type: "agent" });
    const agentEntity = entities.find((e: any) => e.agentId === existing.id);
    if (!agentEntity) throw new Error("Agent exists but has no entity");

    cachedAgentEntityId = agentEntity.id;
    return agentEntity.id;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password } = body as {
      name: string;
      email: string;
      password: string;
    };

    if (!name || !email || !password) {
      return Response.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return Response.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return Response.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // 1. Create user in local DB first (so we have user.id for externalId)
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
      },
    });

    const hsafaClient = new HsafaClient({
      gatewayUrl: GATEWAY_URL,
      secretKey: SECRET_KEY,
    });

    // 2. Ensure the agent + agent entity exist
    const agentEntityId = await ensureAgent(hsafaClient);

    // 3. Create human entity in hsafa gateway
    //    externalId = user.id so it matches the JWT sub claim
    const { entity: human } = await hsafaClient.entities.create({
      type: "human",
      externalId: user.id,
      displayName: name,
      metadata: { email },
    });

    // 4. Create a SmartSpace for this user + agent
    const { smartSpace } = await hsafaClient.spaces.create({
      name: `${name}'s Chat`,
    });

    // 5. Add human as admin
    await hsafaClient.spaces.addMember(smartSpace.id, {
      entityId: human.id,
      role: "admin",
    });

    // 6. Add agent as member
    await hsafaClient.spaces.addMember(smartSpace.id, {
      entityId: agentEntityId,
      role: "member",
    });

    // 7. Update user with hsafa references
    await prisma.user.update({
      where: { id: user.id },
      data: {
        hsafaEntityId: human.id,
        hsafaSpaceId: smartSpace.id,
        agentEntityId,
      },
    });

    // 8. Generate JWT (sub = user.id, matches entity.externalId)
    const token = await signToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      entityId: human.id,
      agentEntityId,
    });

    return Response.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        entityId: human.id,
        smartSpaceId: smartSpace.id,
        agentEntityId,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    const message =
      error instanceof Error ? error.message : "Registration failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
