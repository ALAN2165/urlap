import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// The final challenge of Lab 3 and of Lab 4.
const MASTER_SLUGS = ['lab3-oracle-outer-join', 'lab4-transaction-control'];

async function main() {
  const result = await prisma.challenge.updateMany({ where: { slug: { in: MASTER_SLUGS } }, data: { isMaster: true } });
  console.log(`👑 ${result.count} challenge(s) are now Master Challenges.`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());