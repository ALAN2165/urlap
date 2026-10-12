import 'dotenv/config';
import { PrismaClient, Difficulty, Language } from '@prisma/client';

const prisma = new PrismaClient();

const LAB_SLUG = 'lab-3-subqueries-joins-dml';
const LAB_TITLE_EN = 'SQL Fundamentals - Lab 3: Subqueries, Joins & DML';
const LAB_TITLE_AR = 'أساسيات SQL - المعمل 3: الاستعلامات الفرعية والدمج وعمليات DML';

const EMPLOYEES_TABLE = {
  name: 'employees',
  columns: [
    { name: 'employee_id', type: 'int', key: 'PK' },
    { name: 'last_name', type: 'varchar' },
    { name: 'job_id', type: 'varchar' },
    { name: 'salary', type: 'int' },
    { name: 'hire_date', type: 'date' },
    { name: 'commission_pct', type: 'numeric' },
    { name: 'manager_id', type: 'int', key: 'FK' },
    { name: 'department_id', type: 'int', key: 'FK' },
  ],
};

const DEPARTMENTS_TABLE = {
  name: 'departments',
  columns: [
    { name: 'department_id', type: 'int', key: 'PK' },
    { name: 'department_name', type: 'varchar' },
    { name: 'manager_id', type: 'int' },
    { name: 'location_id', type: 'int' },
  ],
};

interface SeedHint { en: string; ar: string; penalty: number }
interface SeedChallenge {
  slug: string;
  difficulty: Difficulty;
  points: number;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  tables: object[];
  referenceAnswer: string;
  starterCode: string;
  hints: SeedHint[];
}

const CHALLENGES: SeedChallenge[] = [
  {
    slug: 'lab3-explicit-insert',
    difficulty: 'EASY',
    points: 100,
    titleEn: 'Explicit Data Insertion',
    titleAr: 'إدخال البيانات الصريح',
    descriptionEn:
      "Add a new row to the departments table containing the 'Purchasing' department with ID 30. Use the explicit method where column names are clearly specified, skipping other columns.",
    descriptionAr:
      "قم بإضافة صف جديد إلى جدول الأقسام departments يحتوي على القسم 'Purchasing' بالرقم 30. استخدم الطريقة التي يتم فيها تحديد أسماء الأعمدة بوضوح (Explicit method) وتخطي الأعمدة الأخرى.",
    tables: [DEPARTMENTS_TABLE],
    referenceAnswer: "INSERT INTO departments (department_id, department_name) VALUES (30, 'Purchasing');",
    starterCode: "-- Insert the 'Purchasing' department (ID 30) into the departments table\n",
    hints: [
      { en: "Think about which two columns you actually have values for: the department's ID and its name.", ar: 'فكّر في العمودين اللذين لديك قيم لهما فعلاً: رقم القسم واسمه.', penalty: 10 },
      { en: 'The explicit method lists the column names in parentheses right after the table name: INSERT INTO table (col1, col2).', ar: 'الطريقة الصريحة تذكر أسماء الأعمدة بين قوسين مباشرة بعد اسم الجدول: INSERT INTO table (col1, col2).', penalty: 20 },
      { en: "Then give the values in the same order: VALUES (30, 'Purchasing'). Text values need single quotes.", ar: "ثم اكتب القيم بنفس الترتيب: VALUES (30, 'Purchasing'). القيم النصية تحتاج إلى علامات اقتباس مفردة.", penalty: 30 },
    ],
  },
  {
    slug: 'lab3-single-row-subquery',
    difficulty: 'EASY',
    points: 100,
    titleEn: 'Single-Row Subquery',
    titleAr: 'استعلام فرعي بصف واحد',
    descriptionEn:
      'Write a query to find which employees earn a higher salary than employee number 141. The query should display only the last_name of these employees using a subquery.',
    descriptionAr:
      'اكتب استعلاماً لمعرفة من من الموظفين يتقاضى راتباً أعلى من راتب الموظف رقم 141. يجب أن يعرض الاستعلام الاسم الأخير last_name فقط لهؤلاء الموظفين باستخدام استعلام فرعي.',
    tables: [EMPLOYEES_TABLE],
    referenceAnswer: 'SELECT last_name FROM employees WHERE salary > (SELECT salary FROM employees WHERE employee_id = 141);',
    starterCode: '-- Show the last_name of every employee who earns more than employee 141\n',
    hints: [
      { en: "First work out how to get employee 141's salary on its own with a simple SELECT.", ar: 'ابدأ بمعرفة راتب الموظف 141 وحده باستخدام SELECT بسيط.', penalty: 10 },
      { en: 'Put that query inside parentheses and use it on the right side of a comparison in the WHERE clause.', ar: 'ضع هذا الاستعلام بين قوسين واستخدمه في الطرف الأيمن من المقارنة داخل جملة WHERE.', penalty: 20 },
      { en: 'The comparison you need is greater-than: WHERE salary > ( ...your subquery... ).', ar: 'المقارنة المطلوبة هي "أكبر من": WHERE salary > ( ...الاستعلام الفرعي... ).', penalty: 30 },
    ],
  },
  {
    slug: 'lab3-fix-multi-row-subquery',
    difficulty: 'MEDIUM',
    points: 150,
    titleEn: 'Fixing Multiple-Row Subquery',
    titleAr: 'تصحيح استعلام فرعي متعدد الصفوف',
    descriptionEn:
      'The following query has an error because it uses a single-row operator = with a subquery that returns multiple values (minimum salaries grouped by department). Fix the query using the correct operator to avoid the ORA-01427 error: SELECT employee_id, last_name FROM employees WHERE salary = (SELECT MIN(salary) FROM employees GROUP BY department_id);',
    descriptionAr:
      'الاستعلام التالي يحتوي على خطأ لأنه يستخدم معامل صف واحد = مع استعلام فرعي يرجع قيماً متعددة (الحد الأدنى للرواتب مجمعة حسب القسم). قم بتصحيح الاستعلام باستخدام المعامل الصحيح لتجنب الخطأ ORA-01427: SELECT employee_id, last_name FROM employees WHERE salary = (SELECT MIN(salary) FROM employees GROUP BY department_id);',
    tables: [EMPLOYEES_TABLE],
    referenceAnswer: 'SELECT employee_id, last_name FROM employees WHERE salary IN (SELECT MIN(salary) FROM employees GROUP BY department_id);',
    starterCode: 'SELECT employee_id, last_name\nFROM employees\nWHERE salary = (SELECT MIN(salary) FROM employees GROUP BY department_id);\n',
    hints: [
      { en: 'The subquery returns one minimum salary per department, so it returns many rows, not one.', ar: 'الاستعلام الفرعي يرجع حدًّا أدنى للراتب لكل قسم، أي صفوفًا متعددة وليس صفًّا واحدًا.', penalty: 10 },
      { en: 'The = operator can only compare against a single value. Which operator compares against a list of values?', ar: 'المعامل = يقارن بقيمة واحدة فقط. ما المعامل الذي يقارن بقائمة من القيم؟', penalty: 20 },
      { en: 'Use IN: WHERE salary IN (SELECT MIN(salary) ...).', ar: 'استخدم IN: WHERE salary IN (SELECT MIN(salary) ...).', penalty: 30 },
    ],
  },
  {
    slug: 'lab3-update-two-columns',
    difficulty: 'MEDIUM',
    points: 150,
    titleEn: 'Updating Two Columns',
    titleAr: 'تحديث عمودين',
    descriptionEn:
      "Use the UPDATE statement to modify the data for employee number 114. Change their job_id to 'sales_man' and their salary to 2000 in the same statement.",
    descriptionAr:
      "استخدم جملة التحديث UPDATE لتعديل بيانات الموظف رقم 114. قم بتغيير وظيفته job_id لتصبح 'sales_man' وراتبه salary ليصبح 2000 في نفس الجملة.",
    tables: [EMPLOYEES_TABLE],
    referenceAnswer: "UPDATE employees SET job_id = 'sales_man', salary = 2000 WHERE employee_id = 114;",
    starterCode: '-- Update employee 114: new job_id and new salary, in one statement\n',
    hints: [
      { en: 'UPDATE changes existing rows. Start with: UPDATE employees SET ...', ar: 'جملة UPDATE تعدّل صفوفًا موجودة. ابدأ بـ UPDATE employees SET ...', penalty: 10 },
      { en: 'To change two columns in one statement, separate the assignments with a comma.', ar: 'لتعديل عمودين في جملة واحدة افصل بين التعيينات بفاصلة.', penalty: 20 },
      { en: "Don't forget the WHERE clause, otherwise every employee would be updated: WHERE employee_id = 114.", ar: 'لا تنسَ جملة WHERE وإلا سيتم تحديث جميع الموظفين: WHERE employee_id = 114.', penalty: 30 },
    ],
  },
  {
    slug: 'lab3-equijoin-aliases',
    difficulty: 'HARD',
    points: 200,
    titleEn: 'Equijoin with Aliases & Conditions',
    titleAr: 'الدمج المتساوي مع الأسماء المستعارة والشروط',
    descriptionEn:
      "Join the employees and departments tables to display the following columns: employee_id, last_name, department_id (from both tables), and location_id. Use Table Aliases to simplify the code. Finally, add an AND condition to display only the data for the employee with the last name 'Matos'.",
    descriptionAr:
      "قم بدمج (Join) جدولي الموظفين employees والأقسام departments لعرض الأعمدة التالية: employee_id، و last_name، و department_id (من الجدولين)، و location_id. استخدم الأسماء المستعارة للجداول (Table Aliases) لتبسيط الكود وتقليل استهلاك الذاكرة. وأخيراً، أضف شرطاً إضافياً AND لعرض بيانات الموظف الذي يحمل الاسم الأخير 'Matos' فقط.",
    tables: [EMPLOYEES_TABLE, DEPARTMENTS_TABLE],
    referenceAnswer:
      "SELECT e.employee_id, e.last_name, e.department_id, d.department_id, d.location_id FROM employees e, departments d WHERE e.department_id = d.department_id AND e.last_name = 'Matos';",
    starterCode: "-- Join employees (e) and departments (d), then keep only the employee 'Matos'\n",
    hints: [
      { en: "Both tables share the department_id column — that's what links an employee to their department.", ar: 'الجدولان يشتركان في العمود department_id وهو ما يربط الموظف بقسمه.', penalty: 10 },
      { en: 'Give each table a short alias (e.g. employees e, departments d) and prefix every column with it, e.g. e.department_id.', ar: 'أعطِ كل جدول اسمًا مستعارًا قصيرًا (مثل employees e, departments d) وابدأ كل عمود به، مثل e.department_id.', penalty: 20 },
      { en: "Join with WHERE e.department_id = d.department_id, then add AND e.last_name = 'Matos'.", ar: "اربط بـ WHERE e.department_id = d.department_id ثم أضف AND e.last_name = 'Matos'.", penalty: 30 },
    ],
  },
  {
    slug: 'lab3-oracle-outer-join',
    difficulty: 'EXPERT',
    points: 300,
    titleEn: 'Oracle Outer Joins',
    titleAr: 'الدمج الخارجي في Oracle',
    descriptionEn:
      "A standard join does not show departments that have no employees. Use the Oracle outer join operator (+) to display the employee's last_name, department_id, and department_name for all departments, even those without a direct match in the employees table.",
    descriptionAr:
      'الدمج العادي لا يظهر الأقسام التي لا تحتوي على موظفين. استخدم معامل الدمج الخارجي الخاص بـ Oracle وهو (+) لعرض الاسم الأخير للموظف last_name، ومعرف القسم department_id، واسم القسم department_name لجميع الأقسام، حتى تلك التي ليس لها تطابق مباشر مع جدول الموظفين.',
    tables: [EMPLOYEES_TABLE, DEPARTMENTS_TABLE],
    referenceAnswer:
      'SELECT e.last_name, e.department_id, d.department_name FROM employees e, departments d WHERE e.department_id(+) = d.department_id;',
    starterCode: '-- Show every department, even those with no employees, using the Oracle (+) operator\n',
    hints: [
      { en: 'A regular join drops departments that have no matching employee rows.', ar: 'الدمج العادي يُسقط الأقسام التي ليس لها موظفون مطابقون.', penalty: 10 },
      { en: 'In the older Oracle join syntax you put (+) on the side of the join that may have missing rows.', ar: 'في صيغة الدمج القديمة في Oracle تضع (+) على الطرف الذي قد تنقصه صفوف.', penalty: 20 },
      { en: 'Departments must always appear, so the employees side gets the marker: WHERE e.department_id(+) = d.department_id.', ar: 'يجب أن تظهر الأقسام دائمًا، لذا يوضع الرمز على جانب الموظفين: WHERE e.department_id(+) = d.department_id.', penalty: 30 },
    ],
  },
];

async function ensureLab() {
  const existing = await prisma.lab.findFirst({ where: { OR: [{ slug: LAB_SLUG }, { titleEn: LAB_TITLE_EN }] } });
  if (existing) {
    return prisma.lab.update({ where: { id: existing.id }, data: { titleEn: LAB_TITLE_EN, titleAr: LAB_TITLE_AR } });
  }

  // Reuse the empty placeholder "Lab 3" (the third lab) if there is one.
  const labs = await prisma.lab.findMany({
    orderBy: { orderIndex: 'asc' },
    include: { _count: { select: { challenges: true } } },
  });
  const placeholder = labs[2];
  if (placeholder && placeholder._count.challenges === 0) {
    return prisma.lab.update({ where: { id: placeholder.id }, data: { titleEn: LAB_TITLE_EN, titleAr: LAB_TITLE_AR } });
  }

  const maxOrder = labs.reduce((max, l) => Math.max(max, l.orderIndex), -1);
  return prisma.lab.create({ data: { slug: LAB_SLUG, titleEn: LAB_TITLE_EN, titleAr: LAB_TITLE_AR, orderIndex: maxOrder + 1 } });
}

async function main() {
  const lab = await ensureLab();
  console.log(`📚 Lab ready: "${lab.titleEn}" (${lab.slug})`);

  for (let index = 0; index < CHALLENGES.length; index++) {
    const c = CHALLENGES[index];
    const schemaJson = JSON.stringify({ tables: c.tables });

    const scalar = {
      titleEn: c.titleEn,
      titleAr: c.titleAr,
      descriptionEn: c.descriptionEn,
      descriptionAr: c.descriptionAr,
      difficulty: c.difficulty,
      points: c.points,
      orderIndex: index,
      labId: lab.id,
      schemaJson,
      referenceAnswer: c.referenceAnswer,
    };

    const existing = await prisma.challenge.findUnique({ where: { slug: c.slug } });

    let challengeId: string;
    if (existing) {
      await prisma.challenge.update({ where: { id: existing.id }, data: scalar });
      challengeId = existing.id;
    } else {
      const created = await prisma.challenge.create({ data: { slug: c.slug, ...scalar } });
      challengeId = created.id;
    }

    await prisma.starterCode.upsert({
      where: { challengeId_language: { challengeId, language: Language.SQL } },
      update: { code: c.starterCode },
      create: { challengeId, language: Language.SQL, code: c.starterCode },
    });

    for (let h = 0; h < c.hints.length; h++) {
      const hint = c.hints[h];
      await prisma.hint.upsert({
        where: { challengeId_order: { challengeId, order: h + 1 } },
        update: { contentEn: hint.en, contentAr: hint.ar, pointPenalty: hint.penalty },
        create: { challengeId, order: h + 1, contentEn: hint.en, contentAr: hint.ar, pointPenalty: hint.penalty },
      });
    }

    console.log(`  ${existing ? '↻ updated' : '＋ created'}  ${index + 1}. ${c.titleEn} (${c.difficulty})`);
  }

  console.log('✅ Lab 3 seeded.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());