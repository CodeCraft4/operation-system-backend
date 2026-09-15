const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

function readQuotedEnv(name) {
  const envFile = readFileSync(resolve(__dirname, '..', '.env'), 'utf8');
  const match = envFile.match(new RegExp(`^${name}="([^"]+)"`, 'm'));
  if (!match) {
    throw new Error(`${name} is missing or not double-quoted in .env`);
  }
  return match[1];
}

const pilots = [
  {
    slug: 'pilot-alpha',
    name: 'Pilot Alpha',
    email: 'operator.alpha@pilot.local',
    userName: 'Alpha Operator',
  },
  {
    slug: 'pilot-beta',
    name: 'Pilot Beta',
    email: 'operator.beta@pilot.local',
    userName: 'Beta Operator',
  },
];

async function main() {
  const adapter = new PrismaPg({
    connectionString: readQuotedEnv('DATABASE_URL'),
  });
  const prisma = new PrismaClient({ adapter });

  for (const pilot of pilots) {
    const workspace = await prisma.workspace.upsert({
      where: { slug: pilot.slug },
      update: { name: pilot.name },
      create: { name: pilot.name, slug: pilot.slug },
    });

    const user = await prisma.user.upsert({
      where: { email: pilot.email },
      update: { name: pilot.userName },
      create: { email: pilot.email, name: pilot.userName },
    });

    await prisma.membership.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: user.id,
        },
      },
      update: { role: 'operator' },
      create: {
        workspaceId: workspace.id,
        userId: user.id,
        role: 'operator',
      },
    });
  }

  const [workspaceCount, userCount, membershipCount] = await Promise.all([
    prisma.workspace.count(),
    prisma.user.count(),
    prisma.membership.count(),
  ]);

  await prisma.$disconnect();

  console.log(
    `Seed complete. workspaces=${workspaceCount} users=${userCount} memberships=${membershipCount}`,
  );
}

main().catch(async (error) => {
  console.error(error.message);
  process.exit(1);
});
