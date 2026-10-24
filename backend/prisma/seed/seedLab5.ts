
import 'dotenv/config';
import { PrismaClient, Difficulty, Language } from '@prisma/client';

const prisma = new PrismaClient();

const LAB_SLUG = 'lab-5-plsql-fundamentals';
const LAB_TITLE_EN = 'Lab 5: PL/SQL Fundamentals';
const LAB_TITLE_AR = 'المعمل الخامس: أساسيات PL/SQL';

// ---------------------------------------------------------------------------
// Table shapes shown to students (ERD viewer)
// ---------------------------------------------------------------------------

const EMP_TABLE = {
  name: 'emp',
  columns: [
    { name: 'empno', type: 'number(4)', key: 'PK' },
    { name: 'last_name', type: 'varchar2(25)' },
    { name: 'salary', type: 'number(8,2)' },
  ],
};

const ORDERS_TABLE = {
  name: 'orders',
  columns: [
    { name: 'orderid', type: 'number(4)', key: 'PK' },
    { name: 'date_ordered', type: 'date' },
    { name: 'date_shipped', type: 'date' },
  ],
};

const DEPT_TABLE = {
  name: 'dept',
  columns: [
    { name: 'deptno', type: 'number(2)', key: 'PK' },
    { name: 'dname', type: 'varchar2(14)' },
    { name: 'loc', type: 'varchar2(13)' },
  ],
};

const DEPT_ARCHIVE_TABLE = {
  name: 'dept_archive',
  columns: [
    { name: 'deptno', type: 'number(2)', key: 'PK' },
    { name: 'dname', type: 'varchar2(14)' },
    { name: 'loc', type: 'varchar2(13)' },
  ],
};

const EMPLOYEES_TABLE = {
  name: 'employees',
  columns: [
    { name: 'employee_id', type: 'number(6)', key: 'PK' },
    { name: 'emp_id', type: 'number(6)' },
    { name: 'last_name', type: 'varchar2(25)' },
    { name: 'hire_date', type: 'date' },
    { name: 'salary', type: 'number(8,2)' },
    { name: 'dept_id', type: 'number(4)' },
  ],
};

const RETIRED_EMPS_TABLE = {
  name: 'retired_emps',
  columns: [
    { name: 'empno', type: 'number(6)' },
    { name: 'ename', type: 'varchar2(25)' },
    { name: 'hiredate', type: 'date' },
    { name: 'leavedate', type: 'date' },
    { name: 'sal', type: 'number(8,2)' },
    { name: 'deptno', type: 'number(4)' },
  ],
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const EMP_SETUP = `CREATE TABLE emp (
    empno NUMBER(4) PRIMARY KEY,
    last_name VARCHAR2(25),
    salary NUMBER(8,2)
);
INSERT INTO emp VALUES (7369, 'Smith', 850.00);
INSERT INTO emp VALUES (7499, 'Allen', 1600.00);
INSERT INTO emp VALUES (7566, 'Jones', 2975.00);`;

const ORDERS_SETUP = `CREATE TABLE orders (
    orderid NUMBER(4) PRIMARY KEY,
    date_ordered DATE,
    date_shipped DATE
);
INSERT INTO orders VALUES (101, '2026-01-05', '2026-01-09');
INSERT INTO orders VALUES (102, '2026-02-14', '2026-02-20');
INSERT INTO orders VALUES (103, '2026-03-01', NULL);`;

const DEPT_SETUP = `CREATE TABLE dept (
    deptno NUMBER(2) PRIMARY KEY,
    dname VARCHAR2(14),
    loc VARCHAR2(13)
);
INSERT INTO dept VALUES (10, 'ACCOUNTING', 'NEW YORK');
INSERT INTO dept VALUES (20, 'RESEARCH', 'DALLAS');
INSERT INTO dept VALUES (30, 'SALES', 'CHICAGO');
CREATE TABLE dept_archive (
    deptno NUMBER(2) PRIMARY KEY,
    dname VARCHAR2(14),
    loc VARCHAR2(13)
);`;

// The shared playground sample DB already has its own "employees" table
// (employee_id, last_name, job_id, salary, hire_date, commission_pct, manager_id,
// department_id) that gets copied into every sandbox automatically. Lab 5's
// "employees" shape is different (emp_id, dept_id), so we must drop the
// auto-copied one before creating ours, or CREATE TABLE collides with it.
const EMPLOYEES_SETUP = `DROP TABLE IF EXISTS employees CASCADE;
CREATE TABLE employees (
    employee_id NUMBER(6) PRIMARY KEY,
    emp_id NUMBER(6),
    last_name VARCHAR2(25),
    hire_date DATE,
    salary NUMBER(8,2),
    dept_id NUMBER(4)
);
INSERT INTO employees VALUES (124, 7124, 'Bautista', '2022-04-04', 7800.00, 10);
INSERT INTO employees VALUES (125, 7125, 'Fenn', '2017-02-20', 9900.00, 30);
CREATE TABLE retired_emps (
    empno NUMBER(6),
    ename VARCHAR2(25),
    hiredate DATE,
    leavedate DATE,
    sal NUMBER(8,2),
    deptno NUMBER(4)
);`;

interface SeedHint {
  en: string;
  ar: string;
  penalty: number;
}

interface SeedChallenge {
  slug: string;
  difficulty: Difficulty;
  points: number;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  tables: object[];
  setupSql?: string;
  referenceAnswer: string;
  starterCode: string;
  hints: SeedHint[];
}

const CHALLENGES: SeedChallenge[] = [
  {
    slug: 'lab5-variables-and-constants',
    difficulty: 'EASY',
    points: 100,
    titleEn: 'Variables, Constants, and Annual Salary',
    titleAr: 'المتغيرات والثوابت والراتب السنوي',
    descriptionEn:
      'Declare v_sal (NUMBER(9,2) = 5000), constant c_tax_rate (NUMBER(3,2) = 8.25), mandatory v_valid (BOOLEAN = TRUE), and v_order_date (7 days after today), then update v_sal to its 12-month annual value.',
    descriptionAr:
      'عرّف المتغير v_sal (رقمي 9,2 بقيمة 5000)، والثابت c_tax_rate (رقمي 3,2 بقيمة 8.25)، والمتغير الإجباري v_valid (منطقي بقيمة TRUE)، و v_order_date (بعد 7 أيام من تاريخ اليوم)، ثم حدّث v_sal لقيمته السنوية (12 شهراً).',
    tables: [],
    referenceAnswer: `DECLARE
    v_sal NUMBER(9,2) := 5000;
    c_tax_rate CONSTANT NUMBER(3,2) := 8.25;
    v_valid BOOLEAN NOT NULL := TRUE;
    v_order_date DATE := SYSDATE + 7;
BEGIN
    v_sal := v_sal * 12;
END;`,
    starterCode:
      '-- Declare v_sal, c_tax_rate, v_valid, and v_order_date\n-- Then update v_sal to its 12-month annual value\nDECLARE\n\nBEGIN\n\nEND;\n',
    hints: [
      {
        en: 'Define all variables and constants in the DECLARE section and update the salary in the BEGIN section.',
        ar: 'عرّف جميع المتغيرات والثوابت في قسم DECLARE وحدّث الراتب في قسم BEGIN.',
        penalty: 10,
      },
      {
        en: 'Use CONSTANT for the tax rate, NOT NULL for the boolean, and := for initialization.',
        ar: 'استخدم CONSTANT لمعدل الضريبة، و NOT NULL للمتغير المنطقي، و := لإعطاء القيم الابتدائية.',
        penalty: 20,
      },
      {
        en: 'Use SYSDATE + 7 for v_order_date and v_sal := v_sal * 12; inside BEGIN ... END;.',
        ar: 'استخدم SYSDATE + 7 للتاريخ، واكتب v_sal := v_sal * 12; داخل BEGIN ... END;.',
        penalty: 30,
      },
    ],
  },
  {
    slug: 'lab5-type-attribute',
    difficulty: 'EASY',
    points: 100,
    titleEn: 'Dynamic Datatype Inheritance',
    titleAr: 'وراثة أنواع البيانات ديناميكياً',
    descriptionEn:
      'Declare v_last_name matching the datatype of emp.last_name, v_balance (NUMBER(4) = 500), and v_minimum_balance matching the datatype of v_balance (= 10), then subtract v_minimum_balance from v_balance.',
    descriptionAr:
      'عرّف v_last_name مطابقاً لنوع العمود emp.last_name، و v_balance (رقمي بطول 4 وقيمة 500)، و v_minimum_balance مطابقاً لنوع v_balance (بقيمة 10)، ثم اطرح v_minimum_balance من v_balance.',
    tables: [EMP_TABLE],
    setupSql: EMP_SETUP,
    referenceAnswer: `DECLARE
    v_last_name emp.last_name%TYPE;
    v_balance NUMBER(4) := 500;
    v_minimum_balance v_balance%TYPE := 10;
BEGIN
    v_balance := v_balance - v_minimum_balance;
END;`,
    starterCode:
      '-- Declare v_last_name (emp.last_name%TYPE), v_balance, and v_minimum_balance\n-- Then subtract v_minimum_balance from v_balance\nDECLARE\n\nBEGIN\n\nEND;\n',
    hints: [
      {
        en: 'Use the attribute that inherits datatypes from a table column or a previously declared variable.',
        ar: 'استخدم الخاصية التي ترث نوع البيانات من عمود في جدول أو من متغير معرّف مسبقاً.',
        penalty: 10,
      },
      {
        en: 'Prefix %TYPE with table.column for the first variable and with the variable name for the third.',
        ar: 'اسبق %TYPE باسم الجدول والعمود للمتغير الأول، وباسم المتغير للمتغير الثالث.',
        penalty: 20,
      },
      {
        en: 'Declare emp.last_name%TYPE and v_balance%TYPE := 10;, then run v_balance := v_balance - v_minimum_balance;.',
        ar: 'عرّف emp.last_name%TYPE و v_balance%TYPE := 10;، ثم نفّذ v_balance := v_balance - v_minimum_balance;.',
        penalty: 30,
      },
    ],
  },
  {
    slug: 'lab5-select-into',
    difficulty: 'MEDIUM',
    points: 150,
    titleEn: 'Fetch Order Dates into Variables',
    titleAr: 'استرجاع تواريخ الطلب في متغيرات',
    descriptionEn:
      'Declare v_date_ordered and v_date_shipped matching the column datatypes in the orders table, then retrieve date_ordered and date_shipped for orderid 102 into them.',
    descriptionAr:
      'عرّف المتغيرين v_date_ordered و v_date_shipped مطابقين لنوعي العمودين في جدول orders، ثم استرجع بداخلهما تاريخ الطلب وتاريخ الشحن للطلب رقم 102.',
    tables: [ORDERS_TABLE],
    setupSql: ORDERS_SETUP,
    referenceAnswer: `DECLARE
    v_date_ordered orders.date_ordered%TYPE;
    v_date_shipped orders.date_shipped%TYPE;
BEGIN
    SELECT date_ordered, date_shipped
    INTO v_date_ordered, v_date_shipped
    FROM orders
    WHERE orderid = 102;
END;`,
    starterCode:
      '-- Declare v_date_ordered and v_date_shipped using %TYPE\n-- Then SELECT ... INTO them for orderid 102\nDECLARE\n\nBEGIN\n\nEND;\n',
    hints: [
      {
        en: 'Declare both variables using %TYPE, then write a SELECT query inside the BEGIN block.',
        ar: 'عرّف المتغيرين بخاصية %TYPE، ثم اكتب استعلام SELECT داخل قسم BEGIN.',
        penalty: 10,
      },
      {
        en: 'Use the mandatory clause that stores query results into PL/SQL variables.',
        ar: 'استخدم الجملة الإجبارية المخصصة لتخزين نتائج الاستعلام داخل متغيرات PL/SQL.',
        penalty: 20,
      },
      {
        en: 'Use SELECT date_ordered, date_shipped INTO v_date_ordered, v_date_shipped FROM orders WHERE orderid = 102;.',
        ar: 'استخدم SELECT date_ordered, date_shipped INTO v_date_ordered, v_date_shipped FROM orders WHERE orderid = 102;.',
        penalty: 30,
      },
    ],
  },
  {
    slug: 'lab5-rowtype-copy-row',
    difficulty: 'MEDIUM',
    points: 150,
    titleEn: 'Copy Full Department Row',
    titleAr: 'نسخ صف قسم كامل',
    descriptionEn:
      'Declare a record dept_record matching the row structure of dept, retrieve the full row for deptno 10 into it, and insert the record directly into dept_archive.',
    descriptionAr:
      'عرّف السجل dept_record مطابقاً لهيكل صف جدول dept، واسترجع بداخله الصف الكامل للقسم رقم 10، ثم أدرج السجل مباشرة في جدول dept_archive.',
    tables: [DEPT_TABLE, DEPT_ARCHIVE_TABLE],
    setupSql: DEPT_SETUP,
    referenceAnswer: `DECLARE
    dept_record dept%ROWTYPE;
BEGIN
    SELECT *
    INTO dept_record
    FROM dept
    WHERE deptno = 10;

    INSERT INTO dept_archive VALUES dept_record;
END;`,
    starterCode:
      '-- Declare dept_record as dept%ROWTYPE\n-- SELECT * INTO it for deptno 10, then insert it into dept_archive\nDECLARE\n\nBEGIN\n\nEND;\n',
    hints: [
      {
        en: 'Use the attribute that declares a record matching all columns of a table.',
        ar: 'استخدم الخاصية التي تعرّف سجلاً يطابق جميع أعمدة الجدول.',
        penalty: 10,
      },
      {
        en: 'Select all columns into the record, then pass the record name directly after VALUES in the INSERT statement.',
        ar: 'استرجع كل الأعمدة داخل السجل، ثم مرر اسم السجل مباشرة بعد كلمة VALUES في جملة الإدراج.',
        penalty: 20,
      },
      {
        en: 'Declare dept_record dept%ROWTYPE;, fetch with SELECT * INTO dept_record, and run INSERT INTO dept_archive VALUES dept_record;.',
        ar: 'عرّف dept_record dept%ROWTYPE;، واسترجع بـ SELECT * INTO dept_record، ونفّذ INSERT INTO dept_archive VALUES dept_record;.',
        penalty: 30,
      },
    ],
  },
  {
    slug: 'lab5-rowtype-archive-insert',
    difficulty: 'HARD',
    points: 200,
    titleEn: 'Archive Retired Employee Record',
    titleAr: 'أرشفة سجل موظف متقاعد',
    descriptionEn:
      'Retrieve the full row of employee_id 124 from employees into a record emp_rec, then insert their details into retired_emps using the current system date for leavedate.',
    descriptionAr:
      'استرجع الصف الكامل للموظف رقم 124 من جدول employees داخل السجل emp_rec، ثم أدرج بياناته في جدول retired_emps مستخدماً تاريخ النظام الحالي لعمود leavedate.',
    tables: [EMPLOYEES_TABLE, RETIRED_EMPS_TABLE],
    setupSql: EMPLOYEES_SETUP,
    referenceAnswer: `DECLARE
    emp_rec employees%ROWTYPE;
BEGIN
    SELECT *
    INTO emp_rec
    FROM employees
    WHERE employee_id = 124;

    INSERT INTO retired_emps(empno, ename, hiredate, leavedate, sal, deptno)
    VALUES (emp_rec.emp_id, emp_rec.last_name, emp_rec.hire_date, SYSDATE, emp_rec.salary, emp_rec.dept_id);
END;`,
    starterCode:
      '-- Declare emp_rec as employees%ROWTYPE and fetch employee_id 124\n-- Then insert its fields into retired_emps, using SYSDATE for leavedate\nDECLARE\n\nBEGIN\n\nEND;\n',
    hints: [
      {
        en: 'Declare emp_rec using %ROWTYPE and fetch employee 124 using SELECT * INTO.',
        ar: 'عرّف emp_rec باستخدام %ROWTYPE واسترجع بيانات الموظف 124 باستخدام SELECT * INTO.',
        penalty: 10,
      },
      {
        en: 'Reference individual fields inside the record using dot notation (emp_rec.column_name).',
        ar: 'أشر إلى كل حقل داخل السجل باستخدام النقطة (emp_rec.column_name).',
        penalty: 20,
      },
      {
        en: 'Insert (emp_rec.emp_id, emp_rec.last_name, emp_rec.hire_date, SYSDATE, emp_rec.salary, emp_rec.dept_id) into retired_emps.',
        ar: 'أدرج القيم (emp_rec.emp_id, emp_rec.last_name, emp_rec.hire_date, SYSDATE, emp_rec.salary, emp_rec.dept_id) في جدول retired_emps.',
        penalty: 30,
      },
    ],
  },
  {
    slug: 'lab5-retirement-bonus-transaction',
    difficulty: 'EXPERT',
    points: 250,
    titleEn: 'Retirement Bonus & Database Transaction',
    titleAr: 'مكافأة التقاعد ومعاملة قاعدة البيانات',
    descriptionEn:
      "Fetch employee_id 124 into a record emp_rec, compute v_final_sal (matching employees.salary type) by multiplying the record's salary by constant c_bonus (NUMBER(3,2) = 1.10), update employee 124's salary to v_final_sal, insert their record into retired_emps with SYSDATE and v_final_sal, and commit.",
    descriptionAr:
      'استرجع بيانات الموظف 124 داخل السجل emp_rec، واحسب v_final_sal (المطابق لنوع employees.salary) بضرب راتب السجل في الثابت c_bonus (رقمي 3,2 بقيمة 1.10)، وحدّث راتب الموظف 124 إلى v_final_sal، ثم أدرج بياناته في retired_emps بتاريخ اليوم و v_final_sal، وثبّت المعاملة.',
    tables: [EMPLOYEES_TABLE, RETIRED_EMPS_TABLE],
    setupSql: EMPLOYEES_SETUP,
    referenceAnswer: `DECLARE
    emp_rec employees%ROWTYPE;
    c_bonus CONSTANT NUMBER(3,2) := 1.10;
    v_final_sal employees.salary%TYPE;
BEGIN
    SELECT *
    INTO emp_rec
    FROM employees
    WHERE employee_id = 124;

    v_final_sal := emp_rec.salary * c_bonus;

    UPDATE employees
    SET salary = v_final_sal
    WHERE employee_id = 124;

    INSERT INTO retired_emps(empno, ename, hiredate, leavedate, sal, deptno)
    VALUES (emp_rec.emp_id, emp_rec.last_name, emp_rec.hire_date, SYSDATE, v_final_sal, emp_rec.dept_id);

    COMMIT;
END;`,
    starterCode:
      '-- Declare emp_rec (%ROWTYPE), c_bonus (CONSTANT), and v_final_sal (%TYPE)\n-- Compute the bonus, update the salary, insert into retired_emps, then commit\nDECLARE\n\nBEGIN\n\nEND;\n',
    hints: [
      {
        en: 'Declare emp_rec with %ROWTYPE, c_bonus with CONSTANT, and v_final_sal with %TYPE.',
        ar: 'عرّف emp_rec بخاصية %ROWTYPE، و c_bonus بكلمة CONSTANT، و v_final_sal بخاصية %TYPE.',
        penalty: 10,
      },
      {
        en: 'Calculate v_final_sal := emp_rec.salary * c_bonus; after fetching the row, then run UPDATE and INSERT.',
        ar: 'احسب v_final_sal := emp_rec.salary * c_bonus; بعد استرجاع الصف، ثم نفّذ جملتي التحديث والإدراج.',
        penalty: 20,
      },
      {
        en: 'Use v_final_sal in both UPDATE employees and INSERT INTO retired_emps, then finish with COMMIT;.',
        ar: 'استخدم v_final_sal في كل من UPDATE employees و INSERT INTO retired_emps، ثم اختم بـ COMMIT;.',
        penalty: 30,
      },
    ],
  },
];

async function ensureLab() {
  const existing = await prisma.lab.findFirst({
    where: { OR: [{ slug: LAB_SLUG }, { titleEn: LAB_TITLE_EN }] },
  });
  if (existing) {
    return prisma.lab.update({
      where: { id: existing.id },
      data: { titleEn: LAB_TITLE_EN, titleAr: LAB_TITLE_AR },
    });
  }

  const labs = await prisma.lab.findMany({
    orderBy: { orderIndex: 'asc' },
    include: { _count: { select: { challenges: true } } },
  });
  const placeholder = labs[4];
  if (placeholder && placeholder._count.challenges === 0) {
    return prisma.lab.update({
      where: { id: placeholder.id },
      data: { slug: LAB_SLUG, titleEn: LAB_TITLE_EN, titleAr: LAB_TITLE_AR },
    });
  }

  const maxOrder = labs.reduce((max, l) => Math.max(max, l.orderIndex), -1);
  return prisma.lab.create({
    data: {
      slug: LAB_SLUG,
      titleEn: LAB_TITLE_EN,
      titleAr: LAB_TITLE_AR,
      orderIndex: maxOrder + 1,
    },
  });
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
      setupSql: c.setupSql ?? null,
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
        create: {
          challengeId,
          order: h + 1,
          contentEn: hint.en,
          contentAr: hint.ar,
          pointPenalty: hint.penalty,
        },
      });
    }

    console.log(`  ${existing ? '↻ updated' : '＋ created'}  ${index + 1}. ${c.titleEn} (${c.difficulty})`);
  }

  console.log('✅ Lab 5 seeded.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());