import { PrismaClient, Difficulty, Language } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Updating Lab 2...');

  const lab2 = await prisma.lab.update({
    where: { slug: 'lab-2' },
    data: {
      titleEn: 'Lab 2: Functions and Grouping',
      titleAr: 'المعمل 2: الدوال والتجميع',
    },
  });

  const challenges = [
    {
      slug: 'lab2-c1-lower-coalesce',
      titleEn: 'Lowercase Names & NULL Handling',
      titleAr: 'تحويل الأسماء لحروف صغيرة والتعامل مع NULL',
      descriptionEn: 'Retrieve the last name converted to lowercase, and the commission percentage. If the commission percentage is null, display it as 0.',
      descriptionAr: 'استرجع الاسم الأخير محولاً إلى حروف صغيرة، ونسبة العمولة. إذا كانت نسبة العمولة فارغة (null)، اعرضها كـ 0.',
      difficulty: Difficulty.EASY,
      points: 100,
      schema: { tables: [{ name: 'employees', columns: [
        { name: 'last_name', type: 'varchar' }, { name: 'commission_pct', type: 'numeric' },
      ]}]},
      answer: `SELECT LOWER(last_name), COALESCE(commission_pct, 0) FROM employees;`,
      hints: [
        'Convert character strings to lowercase using the LOWER function.',
        'Use COALESCE to substitute a real value whenever a column is NULL.',
        'Pass 0 as the second argument to COALESCE — that becomes the fallback when commission_pct is null.',
      ],
      hintsAr: [
        'حوّل النصوص إلى حروف صغيرة باستخدام دالة LOWER.',
        'استخدم COALESCE لاستبدال قيمة حقيقية كلما كان العمود NULL.',
        'مرّر 0 كوسيط ثانٍ لـ COALESCE — ستكون هذه القيمة البديلة عندما تكون commission_pct فارغة.',
      ],
    },
    {
      slug: 'lab2-c2-min-max-avg',
      titleEn: 'Min, Max & Average Salary',
      titleAr: 'أدنى وأعلى ومتوسط الراتب',
      descriptionEn: 'Write a query to display the minimum salary, maximum salary, and average salary of all employees.',
      descriptionAr: 'اكتب استعلامًا لعرض أقل راتب وأعلى راتب ومتوسط الراتب لجميع الموظفين.',
      difficulty: Difficulty.EASY,
      points: 100,
      schema: { tables: [{ name: 'employees', columns: [{ name: 'salary', type: 'int' }] }] },
      answer: `SELECT MIN(salary), MAX(salary), AVG(salary) FROM employees;`,
      hints: [
        'Use MIN to find the lowest value in a column, and MAX for the highest.',
        'Use AVG to calculate the numeric average of a column.',
        'These are called aggregate (group) functions — they collapse many rows into a single summary value.',
      ],
      hintsAr: [
        'استخدم MIN لإيجاد أقل قيمة في عمود، و MAX لإيجاد أعلى قيمة.',
        'استخدم AVG لحساب المتوسط العددي لعمود.',
        'تُسمى هذه دوال تجميعية (group functions) — فهي تختصر عدة صفوف في قيمة ملخصة واحدة.',
      ],
    },
    {
      slug: 'lab2-c3-avg-by-department',
      titleEn: 'Average Salary per Department',
      titleAr: 'متوسط الراتب لكل قسم',
      descriptionEn: 'Display the department ID and the average salary for each department.',
      descriptionAr: 'اعرض معرف القسم ومتوسط الراتب لكل قسم.',
      difficulty: Difficulty.MEDIUM,
      points: 150,
      schema: { tables: [{ name: 'employees', columns: [
        { name: 'department_id', type: 'int', key: 'FK' }, { name: 'salary', type: 'int' },
      ]}]},
      answer: `SELECT department_id, AVG(salary) FROM employees GROUP BY department_id;`,
      hints: [
        'Any column in SELECT that isn\'t inside an aggregate function must appear in GROUP BY.',
        'Use GROUP BY to split the rows into one group per department.',
        'AVG(salary) is then calculated separately for each group.',
      ],
      hintsAr: [
        'أي عمود في SELECT ليس داخل دالة تجميعية يجب أن يظهر في GROUP BY.',
        'استخدم GROUP BY لتقسيم الصفوف إلى مجموعة واحدة لكل قسم.',
        'يتم بعد ذلك حساب AVG(salary) بشكل منفصل لكل مجموعة.',
      ],
    },
    {
      slug: 'lab2-c4-weeks-employed',
      titleEn: 'Weeks Since Hire Date',
      titleAr: 'عدد الأسابيع منذ تاريخ التعيين',
      descriptionEn: "Calculate the number of weeks an employee has worked by subtracting their hire date from the current date. Display the last name and the calculated weeks for the employee named 'higgins' (ensure the search is case-insensitive).",
      descriptionAr: "احسب عدد الأسابيع التي عمل فيها الموظف بطرح تاريخ تعيينه من التاريخ الحالي. اعرض الاسم الأخير وعدد الأسابيع المحسوب للموظف المسمى 'higgins' (تأكد أن البحث غير حساس لحالة الأحرف).",
      difficulty: Difficulty.MEDIUM,
      points: 150,
      schema: { tables: [{ name: 'employees', columns: [
        { name: 'last_name', type: 'varchar' }, { name: 'hire_date', type: 'date' },
      ]}]},
      answer: `SELECT last_name, (CURRENT_DATE - hire_date) / 7.0 FROM employees WHERE LOWER(last_name) = 'higgins';`,
      hints: [
        'CURRENT_DATE returns today\'s date.',
        'Subtracting two dates gives you the number of days between them; divide by 7.0 (not just 7) to get a precise weeks value instead of a truncated whole number.',
        'Use LOWER(last_name) in your WHERE clause so the match works regardless of how the name was typed.',
      ],
      hintsAr: [
        'تُرجع CURRENT_DATE تاريخ اليوم.',
        'طرح تاريخين يعطيك عدد الأيام بينهما؛ اقسم على 7.0 (وليس 7 فقط) للحصول على قيمة أسابيع دقيقة بدلاً من رقم صحيح مقرّب.',
        'استخدم LOWER(last_name) في جملة WHERE حتى تعمل المطابقة بغض النظر عن طريقة كتابة الاسم.',
      ],
    },
    {
      slug: 'lab2-c5-having-max-salary',
      titleEn: 'Filtering Groups with HAVING',
      titleAr: 'تصفية المجموعات باستخدام HAVING',
      descriptionEn: 'Display the department ID and the maximum salary for each department, but ONLY include departments where the maximum salary is strictly greater than 10000.',
      descriptionAr: 'اعرض معرف القسم وأعلى راتب لكل قسم، مع تضمين الأقسام التي يكون فيها أعلى راتب أكبر تمامًا من 10000 فقط.',
      difficulty: Difficulty.HARD,
      points: 200,
      schema: { tables: [{ name: 'employees', columns: [
        { name: 'department_id', type: 'int', key: 'FK' }, { name: 'salary', type: 'int' },
      ]}]},
      answer: `SELECT department_id, MAX(salary) FROM employees GROUP BY department_id HAVING MAX(salary) > 10000;`,
      hints: [
        'You cannot use WHERE to filter based on an aggregate result — WHERE filters rows before grouping. Use HAVING instead.',
        'Group the rows by department_id first, just like in a normal GROUP BY query.',
        'Add HAVING MAX(salary) > 10000 after the GROUP BY clause to filter out entire groups.',
      ],
      hintsAr: [
        'لا يمكنك استخدام WHERE للتصفية بناءً على نتيجة دالة تجميعية — فـ WHERE يُصفّي الصفوف قبل التجميع. استخدم HAVING بدلاً من ذلك.',
        'اجمع الصفوف حسب department_id أولاً، تمامًا كما في استعلام GROUP BY العادي.',
        'أضف HAVING MAX(salary) > 10000 بعد جملة GROUP BY لاستبعاد مجموعات كاملة.',
      ],
    },
  ];

  for (let i = 0; i < challenges.length; i++) {
    const c = challenges[i];
    const existing = await prisma.challenge.findUnique({ where: { slug: c.slug } });
    if (existing) {
      console.log(`  ↷ Skipping ${c.slug} (already exists)`);
      continue;
    }
    await prisma.challenge.create({
      data: {
        slug: c.slug, titleEn: c.titleEn, titleAr: c.titleAr,
        descriptionEn: c.descriptionEn, descriptionAr: c.descriptionAr,
        difficulty: c.difficulty, points: c.points, orderIndex: i, labId: lab2.id,
        schemaJson: JSON.stringify(c.schema), referenceAnswer: c.answer,
        starterCodes: { create: [{ language: Language.SQL, code: '-- write your SQL query here\n' }] },
        hints: { create: c.hints.map((h, idx) => ({
          order: idx + 1, contentEn: h, contentAr: c.hintsAr[idx], pointPenalty: (idx + 1) * 10,
        })) },
      },
    });
    console.log(`  ✓ Created ${c.slug}`);
  }

  console.log('✅ Lab 2 is ready.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });