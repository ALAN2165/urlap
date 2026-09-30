import { PrismaClient, Difficulty, Language } from '@prisma/client';

const prisma = new PrismaClient();

const LAB_TITLES = [
  { en: 'Lab 1: SELECT & WHERE Fundamentals', ar: 'المعمل 1: أساسيات SELECT و WHERE' },
  { en: 'Lab 2: Joins', ar: 'المعمل 2: الربط بين الجداول' },
  { en: 'Lab 3: Aggregation & GROUP BY', ar: 'المعمل 3: التجميع و GROUP BY' },
  { en: 'Lab 4: Subqueries', ar: 'المعمل 4: الاستعلامات الفرعية' },
  { en: 'Lab 5: Window Functions', ar: 'المعمل 5: دوال النافذة' },
  { en: 'Lab 6: Set Operations', ar: 'المعمل 6: عمليات المجموعات' },
  { en: 'Lab 7: Advanced Challenges', ar: 'المعمل 7: تحديات متقدمة' },
];

async function main() {
  console.log('🌱 Seeding urlap (SQL-only)...');

  const labs = [];
  for (let i = 0; i < LAB_TITLES.length; i++) {
    const lab = await prisma.lab.create({
      data: { slug: `lab-${i + 1}`, titleEn: LAB_TITLES[i].en, titleAr: LAB_TITLES[i].ar, orderIndex: i },
    });
    labs.push(lab);
  }

  const lab1 = labs[0];

  const challenges = [
    {
      slug: 'lab1-c1-salary-filter',
      titleEn: 'Filter by Exact Salary',
      titleAr: 'تصفية حسب الراتب الدقيق',
      descriptionEn: 'Retrieve the last name, job ID, and salary of all employees earning exactly 17000.',
      descriptionAr: 'استرجع الاسم الأخير ومعرف الوظيفة والراتب لجميع الموظفين الذين يكسبون بالضبط 17000.',
      difficulty: Difficulty.EASY,
      points: 100,
      schema: { tables: [{ name: 'employees', columns: [
        { name: 'last_name', type: 'varchar' }, { name: 'job_id', type: 'varchar' }, { name: 'salary', type: 'int' },
      ]}]},
      answer: `SELECT last_name, job_id, salary FROM employees WHERE salary = 17000;`,
      hints: [
        'Start with the SELECT statement to choose the required columns.',
        'You need a WHERE clause to filter the results based on the salary.',
        'Use the = operator to match the exact value 17000.',
      ],
      hintsAr: [
        'ابدأ بجملة SELECT لاختيار الأعمدة المطلوبة.',
        'تحتاج إلى جملة WHERE لتصفية النتائج بناءً على الراتب.',
        'استخدم عامل = لمطابقة القيمة الدقيقة 17000.',
      ],
    },
    {
      slug: 'lab1-c2-adjusted-salary',
      titleEn: 'Calculated Column: Adjusted Salary',
      titleAr: 'عمود محسوب: الراتب المعدل',
      descriptionEn: 'Display the last name and a calculated column showing the salary increased by 500. Name the new calculated column "Adjusted Salary".',
      descriptionAr: 'اعرض الاسم الأخير وعمودًا محسوبًا يوضح الراتب بعد زيادته بمقدار 500. سمِّ العمود الجديد "Adjusted Salary".',
      difficulty: Difficulty.EASY,
      points: 100,
      schema: { tables: [{ name: 'employees', columns: [
        { name: 'last_name', type: 'varchar' }, { name: 'salary', type: 'int' },
      ]}]},
      answer: `SELECT last_name, salary + 500 AS "Adjusted Salary" FROM employees;`,
      hints: [
        'Use the + arithmetic operator directly on the salary column in your SELECT clause.',
        'To rename the calculated column, use an alias.',
        'Since the alias contains a space, you must enclose it in double quotation marks "".',
      ],
      hintsAr: [
        'استخدم عامل الجمع + مباشرة على عمود الراتب داخل جملة SELECT.',
        'لإعادة تسمية العمود المحسوب، استخدم اسمًا مستعارًا (alias).',
        'بما أن الاسم المستعار يحتوي على مسافة، يجب وضعه بين علامتي اقتباس مزدوجتين "".',
      ],
    },
    {
      slug: 'lab1-c3-job-name-filter-sort',
      titleEn: 'Filter, Pattern Match & Sort',
      titleAr: 'تصفية ومطابقة نمط وترتيب',
      descriptionEn: "Find the last names and hire dates of employees whose job ID is either 'SA_REP' or 'ST_CLERK', and whose last name contains the letter 'a'. Sort the output by hire date from newest to oldest.",
      descriptionAr: "ابحث عن الاسم الأخير وتاريخ التعيين للموظفين الذين معرف وظيفتهم 'SA_REP' أو 'ST_CLERK'، والذين يحتوي اسمهم الأخير على الحرف 'a'. رتب النتائج حسب تاريخ التعيين من الأحدث إلى الأقدم.",
      difficulty: Difficulty.MEDIUM,
      points: 150,
      schema: { tables: [{ name: 'employees', columns: [
        { name: 'last_name', type: 'varchar' }, { name: 'hire_date', type: 'date' }, { name: 'job_id', type: 'varchar' },
      ]}]},
      answer: `SELECT last_name, hire_date FROM employees WHERE job_id IN ('SA_REP', 'ST_CLERK') AND last_name LIKE '%a%' ORDER BY hire_date DESC;`,
      hints: [
        'Use the IN condition to check if the job ID matches multiple specific values.',
        "Use the LIKE operator with % wildcards to find the letter 'a' anywhere in the name.",
        'Use ORDER BY with DESC to sort the results from newest to oldest.',
      ],
      hintsAr: [
        'استخدم شرط IN للتحقق مما إذا كان معرف الوظيفة يطابق عدة قيم محددة.',
        "استخدم عامل LIKE مع علامات % للعثور على الحرف 'a' في أي مكان بالاسم.",
        'استخدم ORDER BY مع DESC لترتيب النتائج من الأحدث إلى الأقدم.',
      ],
    },
    {
      slug: 'lab1-c4-null-or-commission',
      titleEn: 'NULL Handling & Logical OR',
      titleAr: 'التعامل مع NULL وعامل OR المنطقي',
      descriptionEn: 'Display the employee ID, last name, and commission percentage for employees who do NOT have a manager, or who have a commission percentage of exactly 0.2.',
      descriptionAr: 'اعرض معرف الموظف والاسم الأخير ونسبة العمولة للموظفين الذين ليس لديهم مدير، أو الذين نسبة عمولتهم تساوي بالضبط 0.2.',
      difficulty: Difficulty.MEDIUM,
      points: 150,
      schema: { tables: [{ name: 'employees', columns: [
        { name: 'employee_id', type: 'int', key: 'PK' }, { name: 'last_name', type: 'varchar' },
        { name: 'commission_pct', type: 'float' }, { name: 'manager_id', type: 'int', key: 'FK' },
      ]}]},
      answer: `SELECT employee_id, last_name, commission_pct FROM employees WHERE manager_id IS NULL OR commission_pct = .2;`,
      hints: [
        "To check if an employee doesn't have a manager, you cannot use = NULL.",
        'Use the IS NULL operator to check for unavailable or unassigned values.',
        'Connect your two conditions using the logical OR operator.',
      ],
      hintsAr: [
        'للتحقق من عدم وجود مدير للموظف، لا يمكنك استخدام = NULL.',
        'استخدم عامل IS NULL للتحقق من القيم غير المتاحة أو غير المعينة.',
        'اربط الشرطين باستخدام عامل OR المنطقي.',
      ],
    },
    {
      slug: 'lab1-c5-distinct-between-exclude',
      titleEn: 'DISTINCT, BETWEEN & Exclusion',
      titleAr: 'DISTINCT و BETWEEN والاستبعاد',
      descriptionEn: "Get a unique list of department IDs where the employees working there earn a salary between 5000 and 10000, but exclude employees whose job ID is 'IT_PROG'.",
      descriptionAr: "احصل على قائمة فريدة من معرفات الأقسام التي يكسب موظفوها راتبًا بين 5000 و10000، مع استبعاد الموظفين الذين معرف وظيفتهم 'IT_PROG'.",
      difficulty: Difficulty.HARD,
      points: 200,
      schema: { tables: [{ name: 'employees', columns: [
        { name: 'department_id', type: 'int', key: 'FK' }, { name: 'salary', type: 'int' }, { name: 'job_id', type: 'varchar' },
      ]}]},
      answer: `SELECT DISTINCT department_id FROM employees WHERE salary BETWEEN 5000 AND 10000 AND job_id NOT IN ('IT_PROG');`,
      hints: [
        'Use the DISTINCT keyword right after SELECT to eliminate duplicate department IDs.',
        'Use the BETWEEN ... AND ... condition to specify the salary range.',
        'Connect a second condition using AND, and use NOT IN (or <>) to exclude the specific job ID.',
      ],
      hintsAr: [
        'استخدم كلمة DISTINCT مباشرة بعد SELECT لإزالة معرفات الأقسام المكررة.',
        'استخدم شرط BETWEEN ... AND ... لتحديد نطاق الراتب.',
        'اربط شرطًا ثانيًا باستخدام AND، واستخدم NOT IN (أو <>) لاستبعاد الوظيفة المحددة.',
      ],
    },
  ];

  for (let i = 0; i < challenges.length; i++) {
    const c = challenges[i];
    await prisma.challenge.create({
      data: {
        slug: c.slug, titleEn: c.titleEn, titleAr: c.titleAr,
        descriptionEn: c.descriptionEn, descriptionAr: c.descriptionAr,
        difficulty: c.difficulty, points: c.points, orderIndex: i, labId: lab1.id,
        schemaJson: JSON.stringify(c.schema), referenceAnswer: c.answer,
        starterCodes: { create: [{ language: Language.SQL, code: '-- write your SQL query here\n' }] },
        hints: { create: c.hints.map((h, idx) => ({
          order: idx + 1, contentEn: h, contentAr: c.hintsAr[idx], pointPenalty: (idx + 1) * 10,
        })) },
      },
    });
  }

  console.log('📢 Seeding announcements...');
  await prisma.announcement.createMany({
    data: [
      {
        titleEn: 'Welcome to urlap!',
        titleAr: 'مرحبًا بك في urlap!',
        contentEn: 'Lab 1 is live with 5 real SQL challenges, graded by actually executing your query against a live database. Good luck!',
        contentAr: 'المعمل الأول متاح الآن ويحتوي على 5 تحديات SQL حقيقية، ويتم تصحيحها عبر تنفيذ استعلامك فعليًا على قاعدة بيانات حية. بالتوفيق!',
        type: 'FEATURE',
      },
      {
        titleEn: 'Labs 2–7 are coming soon',
        titleAr: 'المعامل من 2 إلى 7 قادمة قريبًا',
        contentEn: 'We are preparing new challenges covering joins, aggregation, subqueries, window functions, and more. Stay tuned!',
        contentAr: 'نجهّز تحديات جديدة تغطي الربط بين الجداول، والتجميع، والاستعلامات الفرعية، ودوال النافذة، والمزيد. ترقبوا ذلك!',
        type: 'NEW_LAB',
      },
    ],
  });

  console.log(`✅ Seeded ${labs.length} labs, ${challenges.length} challenges in Lab 1, and 2 announcements.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
