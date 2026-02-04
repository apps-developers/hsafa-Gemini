import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_AGENT_ID = 'de1b221c-8549-43be-a6e3-b1e416405874';
const DEMO_USER_EXTERNAL_ID = 'test-user-1';
const DEMO_SPACE_NAME = 'Demo SmartSpace';

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create demo agent
  const agentConfigJson = {
    version: '1.0',
    agent: {
      name: 'demo-agent',
      description: 'A simple demo agent for testing',
      system: 'You are a helpful assistant. Keep responses concise.',
    },
    model: {
      provider: 'openai',
      name: 'gpt-4o-mini',
      temperature: 0.7,
      maxOutputTokens: 1000,
    },
    loop: {
      maxSteps: 5,
      toolChoice: 'auto',
    },
    tools: [],
  };

  const agent = await prisma.agent.upsert({
    where: { id: DEMO_AGENT_ID },
    update: { configJson: agentConfigJson },
    create: {
      id: DEMO_AGENT_ID,
      name: 'demo-agent',
      description: 'A simple demo agent for testing',
      configJson: {
        version: '1.0',
        agent: {
          name: 'demo-agent',
          description: 'A simple demo agent for testing',
          system: 'You are a helpful assistant. Keep responses concise.',
        },
        model: {
          provider: 'openai',
          name: 'gpt-4o-mini',
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
        loop: {
          maxSteps: 5,
          toolChoice: 'auto',
        },
        tools: [],
      },
    },
  });
  console.log('✅ Agent created:', agent.name);

  // 2. Create human entity
  const humanEntity = await prisma.entity.upsert({
    where: { externalId: DEMO_USER_EXTERNAL_ID },
    update: {},
    create: {
      type: 'human',
      externalId: DEMO_USER_EXTERNAL_ID,
      displayName: 'Test User',
    },
  });
  console.log('✅ Human entity created:', humanEntity.displayName);

  // 3. Create agent entity (linked to agent)
  const agentEntity = await prisma.entity.upsert({
    where: { agentId: DEMO_AGENT_ID },
    update: {},
    create: {
      type: 'agent',
      agentId: DEMO_AGENT_ID,
      displayName: 'Demo Agent',
    },
  });
  console.log('✅ Agent entity created:', agentEntity.displayName);

  // 4. Create SmartSpace
  let smartSpace = await prisma.smartSpace.findFirst({
    where: { name: DEMO_SPACE_NAME },
  });

  if (!smartSpace) {
    smartSpace = await prisma.smartSpace.create({
      data: {
        name: DEMO_SPACE_NAME,
        description: 'A demo SmartSpace for testing the chat interface',
      },
    });
  }
  console.log('✅ SmartSpace created:', smartSpace.name);

  // 5. Add human to SmartSpace
  await prisma.smartSpaceMembership.upsert({
    where: {
      smartSpaceId_entityId: {
        smartSpaceId: smartSpace.id,
        entityId: humanEntity.id,
      },
    },
    update: {},
    create: {
      smartSpaceId: smartSpace.id,
      entityId: humanEntity.id,
      role: 'member',
    },
  });
  console.log('✅ Human added to SmartSpace');

  // 6. Add agent to SmartSpace
  await prisma.smartSpaceMembership.upsert({
    where: {
      smartSpaceId_entityId: {
        smartSpaceId: smartSpace.id,
        entityId: agentEntity.id,
      },
    },
    update: {},
    create: {
      smartSpaceId: smartSpace.id,
      entityId: agentEntity.id,
      role: 'assistant',
    },
  });
  console.log('✅ Agent added to SmartSpace');

  console.log('\n🎉 Seed complete!');
  console.log('\nDemo data:');
  console.log(`  Agent ID: ${agent.id}`);
  console.log(`  Human Entity ID: ${humanEntity.id}`);
  console.log(`  Agent Entity ID: ${agentEntity.id}`);
  console.log(`  SmartSpace ID: ${smartSpace.id}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
