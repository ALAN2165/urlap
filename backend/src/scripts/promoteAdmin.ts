import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: npx ts-node src/scripts/promoteAdmin.ts <your-email>');
    process.exit(1);
  }

  const user = await prisma.user.update({ where: { email }, data: { role: 'ADMIN' } });
  console.log(`✅ ${user.username} (${user.email}) is now an ADMIN.`);
}

main()
  .catch((e) => { console.error(e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());