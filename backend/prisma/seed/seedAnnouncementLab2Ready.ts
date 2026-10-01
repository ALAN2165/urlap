import { PrismaClient, AnnouncementType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const titleEn = 'Lab 2 is now ready!';

  const existing = await prisma.announcement.findFirst({ where: { titleEn } });
  if (existing) {
    console.log('↷ Announcement already exists — skipping.');
    return;
  }

  await prisma.announcement.create({
    data: {
      titleEn,
      titleAr: 'المعمل 2 أصبح جاهزًا الآن!',
      contentEn: 'Lab 2 — "Functions and Grouping" — is live with 5 new challenges covering NULL handling, aggregate functions, GROUP BY, date arithmetic, and HAVING. Head over to the Challenges page and give it a try!',
      contentAr: 'المعمل 2 — "الدوال والتجميع" — متاح الآن ويحتوي على 5 تحديات جديدة تغطي التعامل مع NULL، الدوال التجميعية، GROUP BY، حسابات التاريخ، وHAVING. توجه إلى صفحة التحديات وجرّبه!',
      type: AnnouncementType.NEW_LAB,
    },
  });

  console.log('✅ Announcement created: "Lab 2 is now ready!"');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());