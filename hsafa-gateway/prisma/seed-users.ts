import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_AGENT_ID = 'de1b221c-8549-43be-a6e3-b1e416405874';

async function main() {
  console.log('🌱 Seeding users and spaces...');

  // --- Ensure the agent entity exists ---
  const agentEntity = await prisma.entity.findUnique({
    where: { agentId: DEMO_AGENT_ID },
  });
  if (!agentEntity) {
    throw new Error('Agent entity not found. Run the main seed first.');
  }
  console.log('✅ Found agent entity:', agentEntity.displayName);

  // --- Create Manager ---
  const manager = await prisma.entity.upsert({
    where: { externalId: 'manager-sarah' },
    update: {},
    create: {
      type: 'human',
      externalId: 'manager-sarah',
      displayName: 'Sarah Mitchell',
      metadata: { role: 'manager' },
    },
  });
  console.log('✅ Manager created:', manager.displayName);

  // --- Create Employee ---
  const employee = await prisma.entity.upsert({
    where: { externalId: 'employee-ahmed' },
    update: {},
    create: {
      type: 'human',
      externalId: 'employee-ahmed',
      displayName: 'Ahmed Hassan',
      metadata: { role: 'employee' },
    },
  });
  console.log('✅ Employee created:', employee.displayName);

  // --- Space 1: Manager + Agent ---
  let managerSpace = await prisma.smartSpace.findFirst({
    where: { name: 'Manager Hub' },
  });
  if (!managerSpace) {
    managerSpace = await prisma.smartSpace.create({
      data: {
        name: 'Manager Hub',
        description: 'Private space for the manager and AI assistant',
      },
    });
  }
  console.log('✅ Space created:', managerSpace.name);

  for (const entityId of [manager.id, agentEntity.id]) {
    await prisma.smartSpaceMembership.upsert({
      where: { smartSpaceId_entityId: { smartSpaceId: managerSpace.id, entityId } },
      update: {},
      create: {
        smartSpaceId: managerSpace.id,
        entityId,
        role: entityId === manager.id ? 'admin' : 'assistant',
      },
    });
  }
  console.log('   Members: Sarah Mitchell, AI Agent');

  // --- Space 2: Employee + Agent ---
  let employeeSpace = await prisma.smartSpace.findFirst({
    where: { name: 'Employee Workspace' },
  });
  if (!employeeSpace) {
    employeeSpace = await prisma.smartSpace.create({
      data: {
        name: 'Employee Workspace',
        description: 'Private space for the employee and AI assistant',
      },
    });
  }
  console.log('✅ Space created:', employeeSpace.name);

  for (const entityId of [employee.id, agentEntity.id]) {
    await prisma.smartSpaceMembership.upsert({
      where: { smartSpaceId_entityId: { smartSpaceId: employeeSpace.id, entityId } },
      update: {},
      create: {
        smartSpaceId: employeeSpace.id,
        entityId,
        role: entityId === employee.id ? 'member' : 'assistant',
      },
    });
  }
  console.log('   Members: Ahmed Hassan, AI Agent');

  // --- Space 3: Manager + Employee + Agent ---
  let teamSpace = await prisma.smartSpace.findFirst({
    where: { name: 'Team Channel' },
  });
  if (!teamSpace) {
    teamSpace = await prisma.smartSpace.create({
      data: {
        name: 'Team Channel',
        description: 'Shared space for the whole team and AI assistant',
      },
    });
  }
  console.log('✅ Space created:', teamSpace.name);

  for (const entityId of [manager.id, employee.id, agentEntity.id]) {
    const role = entityId === manager.id ? 'admin' : entityId === employee.id ? 'member' : 'assistant';
    await prisma.smartSpaceMembership.upsert({
      where: { smartSpaceId_entityId: { smartSpaceId: teamSpace.id, entityId } },
      update: {},
      create: {
        smartSpaceId: teamSpace.id,
        entityId,
        role,
      },
    });
  }
  console.log('   Members: Sarah Mitchell, Ahmed Hassan, AI Agent');

  console.log('\n🎉 Seed complete!');
  console.log('\nCreated data:');
  console.log(`  Manager (Sarah Mitchell): ${manager.id}`);
  console.log(`  Employee (Ahmed Hassan):  ${employee.id}`);
  console.log(`  Agent Entity:             ${agentEntity.id}`);
  console.log(`  Manager Hub:              ${managerSpace.id}`);
  console.log(`  Employee Workspace:       ${employeeSpace.id}`);
  console.log(`  Team Channel:             ${teamSpace.id}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
