import 'dotenv/config';
import { PrismaClient, Difficulty, Language } from '@prisma/client';

const prisma = new PrismaClient();

const LAB_SLUG = 'lab-4-ddl-constraints-sequences-tcl';
const LAB_TITLE_EN = 'Lab 4: DDL, Constraints, Sequences & TCL';
const LAB_TITLE_AR = 'المعمل 4: لغة تعريف البيانات (DDL)، القيود، المتسلسلات، والتحكم بالمعاملات';

const EMPLOYEES_TABLE = {
  name: 'employees',
  columns: [
    { name: 'employee_id', type: 'number(6)', key: 'PK' },
    { name: 'last_name', type: 'varchar2(25)' },
    { name: 'email', type: 'varchar2(25)' },
    { name: 'job_id', type: 'varchar2(10)' },
    { name: 'salary', type: 'number(8,2)' },
    { name: 'hire_date', type: 'date' },
    { name: 'commission_pct', type: 'number(2,2)' },
    { name: 'manager_id', type: 'number(6)', key: 'FK (emp_manager_fk)' },
    { name: 'department_id', type: 'number(4)', key: 'FK' },
  ],
};

const DEPARTMENTS_TABLE = {
  name: 'departments',
  columns: [
    { name: 'department_id', type: 'number(4)', key: 'PK' },
    { name: 'department_name', type: 'varchar2(30)' },
    { name: 'manager_id', type: 'number(6)' },
    { name: 'location_id', type: 'number(4)' },
  ],
};

const DEPT_TABLE = {
  name: 'dept',
  columns: [
    { name: 'deptno', type: 'number(2)' },
    { name: 'dname', type: 'varchar2(14)' },
    { name: 'loc', type: 'varchar2(13)' },
  ],
};

const DEPT80_TABLE = {
  name: 'dept80',
  columns: [
    { name: 'employee_id', type: 'number(6)' },
    { name: 'last_name', type: 'varchar2(20)' },
    { name: 'annsal', type: 'number(10,2)' },
    { name: 'hire_date', type: 'date' },
  ],
};

const EMP_TABLE = {
  name: 'emp',
  columns: [
    { name: 'empno', type: 'number(4)', key: 'PK' },
    { name: 'ename', type: 'varchar2(10)' },
    { name: 'job', type: 'varchar2(9)' },
    { name: 'mgr', type: 'number(4)' },
    { name: 'hiredate', type: 'date' },
    { name: 'sal', type: 'number(7,2)' },
    { name: 'comm', type: 'number(7,2)' },
    { name: 'deptno', type: 'number(2)' },
  ],
};

const REGION_TABLE = {
  name: 'region',
  columns: [
    { name: 'id', type: 'number(4)', key: 'PK' },
    { name: 'name', type: 'varchar2(50)' },
  ],
};

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
  referenceAnswer: string;
  starterCode: string;
  hints: SeedHint[];
}

const CHALLENGES: SeedChallenge[] = [
  {
    slug: 'lab4-create-table-dept',
    difficulty: 'EASY',
    points: 100,
    titleEn: 'Creating Tables from Scratch',
    titleAr: 'إنشاء الجداول من الصفر',
    descriptionEn:
      'Create a table named `dept` with three columns: `deptno` of type `NUMBER(2)`, `dname` of type `VARCHAR2(14)`, and `loc` of type `VARCHAR2(13)`.',
    descriptionAr:
      'باستخدام أوامر لغة تعريف البيانات (DDL)، قم بإنشاء جدول باسم `dept` يحتوي على ثلاثة أعمدة: العمود `deptno` من نوع `NUMBER(2)`، والعمود `dname` من نوع `VARCHAR2(14)`، والعمود `loc` من نوع `VARCHAR2(13)`.',
    tables: [DEPT_TABLE],
    referenceAnswer: `CREATE TABLE dept (
    deptno NUMBER(2),
    dname VARCHAR2(14),
    loc VARCHAR2(13)
);`,
    starterCode: '-- Create the dept table with deptno, dname, and loc\n',
    hints: [
      {
        en: 'Use the CREATE TABLE statement followed by the table name and parentheses containing the column definitions.',
        ar: 'استخدم جملة CREATE TABLE متبوعة باسم الجدول وقوسين بداخلهما تعريف الأعمدة.',
        penalty: 10,
      },
      {
        en: 'Each column definition takes the form: column_name DATA_TYPE(size), separated by commas.',
        ar: 'كل عمود يُعرّف بالشكل: اسم_العمود نوع_البيانات(الحجم)، ويفصل بينها بفاصلة.',
        penalty: 20,
      },
      {
        en: 'CREATE TABLE dept (deptno NUMBER(2), dname VARCHAR2(14), loc VARCHAR2(13));',
        ar: 'CREATE TABLE dept (deptno NUMBER(2), dname VARCHAR2(14), loc VARCHAR2(13));',
        penalty: 30,
      },
    ],
  },
  {
    slug: 'lab4-alter-table-dept80',
    difficulty: 'EASY',
    points: 100,
    titleEn: 'Altering Table Structure: Add, Modify & Drop',
    titleAr: 'تعديل هيكل الجدول: إضافة، تعديل، وحذف الأعمدة',
    descriptionEn:
      'Practice using the `ALTER TABLE` statement on table `dept80`:\n1. Add a new column `job_id` of type `VARCHAR2(9)`.\n2. Modify the existing column `last_name` to become `VARCHAR2(30)`.\n3. Drop the column `job_id` from the table.',
    descriptionAr:
      'طبق أوامر تعديل الجداول `ALTER TABLE` على جدول `dept80` بالترتيب التالي:\n1. أضف عموداً جديداً باسم `job_id` من نوع `VARCHAR2(9)`.\n2. عدّل حجم العمود `last_name` ليصبح `VARCHAR2(30)`.\n3. احذف العمود `job_id` نهائياً من الجدول.',
    tables: [DEPT80_TABLE],
    referenceAnswer: `ALTER TABLE dept80 ADD (job_id VARCHAR2(9));
ALTER TABLE dept80 MODIFY (last_name VARCHAR2(30));
ALTER TABLE dept80 DROP COLUMN job_id;`,
    starterCode: '-- Write the 3 ALTER TABLE statements on dept80 in order\n',
    hints: [
      {
        en: 'To add a column in Oracle: ALTER TABLE dept80 ADD (job_id VARCHAR2(9));',
        ar: 'لإضافة عمود في أوراكل: ALTER TABLE dept80 ADD (job_id VARCHAR2(9));',
        penalty: 10,
      },
      {
        en: 'To resize an existing column: ALTER TABLE dept80 MODIFY (last_name VARCHAR2(30));',
        ar: 'لتعديل حجم عمود حالي: ALTER TABLE dept80 MODIFY (last_name VARCHAR2(30));',
        penalty: 20,
      },
      {
        en: 'Finally, remove job_id with: ALTER TABLE dept80 DROP COLUMN job_id;',
        ar: 'أخيراً، احذف العمود عبر: ALTER TABLE dept80 DROP COLUMN job_id;',
        penalty: 30,
      },
    ],
  },
  {
    slug: 'lab4-sequences-nextval',
    difficulty: 'MEDIUM',
    points: 150,
    titleEn: 'Generating Primary Keys with Sequences',
    titleAr: 'توليد المفاتيح الأساسية باستخدام المتسلسلات (Sequences)',
    descriptionEn:
      "Create a sequence named `id_seq` that starts with `1`, increments by `1`, and has a maximum value of `2000`. Then, use `nextval` to insert a new row into the `dept` table with the next sequence value, department name `'finance'`, and location `'cairo'`.",
    descriptionAr:
      "قم بإنشاء متسلسلة (Sequence) باسم `id_seq` تبدأ من الرقم `1` (`START WITH 1`)، وتزيد بمقدار `1` (`INCREMENT BY 1`)، وتصل لقيمة قصوى `2000` (`MAXVALUE 2000`). بعد ذلك، استخدم الكلمة المفتاحية `nextval` لإدراج صف جديد في جدول `dept` يحمل الرقم التلقائي الجديد، واسم القسم `'finance'`، والموقع `'cairo'`.",
    tables: [DEPT_TABLE],
    referenceAnswer: `CREATE SEQUENCE id_seq START WITH 1 INCREMENT BY 1 MAXVALUE 2000;
INSERT INTO dept VALUES (id_seq.nextval, 'finance', 'cairo');`,
    starterCode: '-- 1. Create sequence id_seq\n-- 2. Insert a row into dept using id_seq.nextval\n',
    hints: [
      {
        en: 'Start by creating the sequence: CREATE SEQUENCE id_seq START WITH 1 INCREMENT BY 1 MAXVALUE 2000;',
        ar: 'ابدأ بإنشاء المتسلسلة: CREATE SEQUENCE id_seq START WITH 1 INCREMENT BY 1 MAXVALUE 2000;',
        penalty: 10,
      },
      {
        en: 'To fetch the next generated number from a sequence in Oracle, write id_seq.nextval.',
        ar: 'لجلب الرقم التالي من المتسلسلة في أوراكل، اكتب id_seq.nextval.',
        penalty: 20,
      },
      {
        en: "Follow the sequence creation with: INSERT INTO dept VALUES (id_seq.nextval, 'finance', 'cairo');",
        ar: "أتبع إنشاء المتسلسلة بـ: INSERT INTO dept VALUES (id_seq.nextval, 'finance', 'cairo');",
        penalty: 30,
      },
    ],
  },
  {
    slug: 'lab4-managing-constraints-alter',
    difficulty: 'MEDIUM',
    points: 150,
    titleEn: 'Managing Constraints with ALTER TABLE',
    titleAr: 'إدارة القيود (Constraints) عبر تعديل الجدول',
    descriptionEn:
      'Modify the existing tables using `ALTER TABLE` to manage their constraints:\n1. Add a `FOREIGN KEY` constraint on the `department_id` column in the `employees` table that references `departments(department_id)`.\n2. Drop the constraint named `emp_manager_fk` from the `employees` table.\n3. Drop the `PRIMARY KEY` on the `departments` table along with any associated foreign key constraints using `CASCADE`.',
    descriptionAr:
      'استخدم جملة `ALTER TABLE` لإدارة القيود على الجداول كالتالي:\n1. أضف قيد مفتاح أجنبي (`FOREIGN KEY`) على عمود `department_id` في جدول `employees` يشير إلى `departments(department_id)`.\n2. احذف القيد المسمى `emp_manager_fk` من جدول `employees`.\n3. احذف قيد المفتاح الأساسي (`PRIMARY KEY`) من جدول `departments` مع حذف جميع المفاتيح الأجنبية المرتبطة به تلقائياً باستخدام `CASCADE`.',
    tables: [EMPLOYEES_TABLE, DEPARTMENTS_TABLE],
    referenceAnswer: `ALTER TABLE employees ADD FOREIGN KEY(department_id) REFERENCES departments(department_id);
ALTER TABLE employees DROP CONSTRAINT emp_manager_fk;
ALTER TABLE departments DROP PRIMARY KEY CASCADE;`,
    starterCode: '-- 1. Add FOREIGN KEY on employees(department_id)\n-- 2. Drop constraint emp_manager_fk on employees\n-- 3. Drop PRIMARY KEY with CASCADE on departments\n',
    hints: [
      {
        en: 'To add a foreign key: ALTER TABLE employees ADD FOREIGN KEY(department_id) REFERENCES departments(department_id);',
        ar: 'لإضافة مفتاح أجنبي: ALTER TABLE employees ADD FOREIGN KEY(department_id) REFERENCES departments(department_id);',
        penalty: 10,
      },
      {
        en: 'To drop a named constraint: ALTER TABLE employees DROP CONSTRAINT emp_manager_fk;',
        ar: 'لحذف قيد مسمى: ALTER TABLE employees DROP CONSTRAINT emp_manager_fk;',
        penalty: 20,
      },
      {
        en: 'To drop a primary key along with dependent foreign keys: ALTER TABLE departments DROP PRIMARY KEY CASCADE;',
        ar: 'لحذف المفتاح الأساسي مع القيود المرتبطة به: ALTER TABLE departments DROP PRIMARY KEY CASCADE;',
        penalty: 30,
      },
    ],
  },
  {
    slug: 'lab4-column-table-constraints',
    difficulty: 'HARD',
    points: 200,
    titleEn: 'Column & Table Level Constraints Mastery',
    titleAr: 'إتقان قيود الجداول والأعمدة الشاملة',
    descriptionEn:
      'Create the `employees` table defining both column-level and table-level constraints:\n- `employee_id`: `NUMBER(6)`\n- `last_name`: `VARCHAR2(25)` with two column-level constraints: `NOT NULL` and `UNIQUE`\n- `email`: `VARCHAR2(25)`\n- `salary`: `NUMBER(8,2)` with a column-level constraint checking that `salary > 0`\n- `hire_date`: `DATE` with a named column-level constraint `emp_hire_date_nn` set to `NOT NULL`\n- `department_id`: `NUMBER(4)` referencing `departments(department_id)`\n- Finally, add two table-level constraints at the end: `emp_email_uk` as `UNIQUE(email)` and `emp_id_pk` as `PRIMARY KEY(employee_id)`.',
    descriptionAr:
      'قم بإنشاء جدول `employees` مع تطبيق القيود على مستوى العمود وعلى مستوى الجدول معاً كالتالي:\n- `employee_id`: من نوع `NUMBER(6)`.\n- `last_name`: من نوع `VARCHAR2(25)` يحمل قيدين معاً على مستوى العمود وهما `NOT NULL` و `UNIQUE`.\n- `email`: من نوع `VARCHAR2(25)`.\n- `salary`: من نوع `NUMBER(8,2)` مع قيد تحقق `CHECK (salary > 0)`.\n- `hire_date`: من نوع `DATE` مع قيد مُسمى `CONSTRAINT emp_hire_date_nn NOT NULL`.\n- `department_id`: من نوع `NUMBER(4)` يشير إلى جدول الأقسام `REFERENCES departments(department_id)`.\n- وفي نهاية الجدول (Table-level)، أضف القيدين المسميين: `emp_email_uk` كـ `UNIQUE(email)`، و `emp_id_pk` كـ `PRIMARY KEY (employee_id)`.',
    tables: [DEPARTMENTS_TABLE],
    referenceAnswer: `CREATE TABLE employees (
    employee_id NUMBER(6),
    last_name VARCHAR2(25) NOT NULL UNIQUE,
    email VARCHAR2(25),
    salary NUMBER(8,2) CHECK (salary > 0),
    hire_date DATE CONSTRAINT emp_hire_date_nn NOT NULL,
    department_id NUMBER(4) REFERENCES departments(department_id),
    CONSTRAINT emp_email_uk UNIQUE(email),
    CONSTRAINT emp_id_pk PRIMARY KEY (employee_id)
);`,
    starterCode: '-- Create the employees table with all required column-level and table-level constraints\n',
    hints: [
      {
        en: 'Column-level constraints are written right after the column data type (e.g., last_name VARCHAR2(25) NOT NULL UNIQUE).',
        ar: 'قيود العمود تُكتب مباشرة بعد نوع البيانات (مثل: last_name VARCHAR2(25) NOT NULL UNIQUE).',
        penalty: 10,
      },
      {
        en: 'For a named column constraint write: hire_date DATE CONSTRAINT emp_hire_date_nn NOT NULL, and for a foreign key column write: department_id NUMBER(4) REFERENCES departments(department_id).',
        ar: 'للقيد المسمى اكتب: hire_date DATE CONSTRAINT emp_hire_date_nn NOT NULL، وللمفتاح الأجنبي: department_id NUMBER(4) REFERENCES departments(department_id).',
        penalty: 20,
      },
      {
        en: 'At the end of CREATE TABLE, add: CONSTRAINT emp_email_uk UNIQUE(email), CONSTRAINT emp_id_pk PRIMARY KEY (employee_id).',
        ar: 'في نهاية الجدول أضف: CONSTRAINT emp_email_uk UNIQUE(email), CONSTRAINT emp_id_pk PRIMARY KEY (employee_id).',
        penalty: 30,
      },
    ],
  },
  {
    slug: 'lab4-tcl-savepoint-rollback-commit',
    difficulty: 'EXPERT',
    points: 300,
    titleEn: 'Transaction Control: SAVEPOINT, ROLLBACK & COMMIT',
    titleAr: 'التحكم بالمعاملات: نقاط الحفظ والتراجع والتأكيد',
    descriptionEn:
      "Manage a multi-step database transaction using TCL commands:\n1. Update the `emp` table to increase `sal` by 10% (`sal = sal * 1.1`) where `job = 'CLERK'`.\n2. Create a savepoint named `update_done`.\n3. Insert a new row into the `region` table with `id = 8` and `name = 'central'`.\n4. Undo the `region` insertion while keeping the salary update by rolling back to the `update_done` savepoint.\n5. Explicitly save the remaining transaction changes permanently to the database.",
    descriptionAr:
      "قم بإدارة معاملة (Transaction) مكونة من عدة خطوات باستخدام أوامر لغة التحكم بالمعاملات (TCL):\n1. حدّث جدول `emp` لزيادة الراتب بنسبة 10% (`sal = sal * 1.1`) للموظفين الذين وظيفتهم `job = 'CLERK'`.\n2. أنشئ نقطة حفظ (`SAVEPOINT`) باسم `update_done`.\n3. أدرج صفاً جديداً في جدول `region` بالقيم `(8, 'central')` للـ `id` والـ `name`.\n4. تراجع عن عملية الإدراج الأخيرة فقط مع الحفاظ على تعديل الرواتب، وذلك بالتراجع إلى نقطة الحفظ `update_done`.\n5. احفظ التغييرات المتبقية بشكل دائم في قاعدة البيانات باستخدام أمر الحفظ الصريح.",
    tables: [EMP_TABLE, REGION_TABLE],
    referenceAnswer: `UPDATE emp SET sal = sal * 1.1 WHERE job = 'CLERK';
SAVEPOINT update_done;
INSERT INTO region (id, name) VALUES (8, 'central');
ROLLBACK TO update_done;
COMMIT;`,
    starterCode: "-- 1. Update CLERK salaries by 10%\n-- 2. Create savepoint update_done\n-- 3. Insert (8, 'central') into region\n-- 4. Rollback to update_done\n-- 5. Commit the transaction\n",
    hints: [
      {
        en: "Start with the update: UPDATE emp SET sal = sal * 1.1 WHERE job = 'CLERK'; followed by SAVEPOINT update_done;",
        ar: "ابدأ بالتحديث: UPDATE emp SET sal = sal * 1.1 WHERE job = 'CLERK'; ثم أنشئ نقطة الحفظ: SAVEPOINT update_done;",
        penalty: 10,
      },
      {
        en: "Insert the row into region: INSERT INTO region (id, name) VALUES (8, 'central');",
        ar: "أدرج الصف في جدول region: INSERT INTO region (id, name) VALUES (8, 'central');",
        penalty: 20,
      },
      {
        en: 'Undo the insert with ROLLBACK TO update_done; and finalize with COMMIT;',
        ar: 'تراجع عن الإدراج باستخدام ROLLBACK TO update_done; ثم احفظ المعاملة بأمر COMMIT;',
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
  const placeholder = labs[3];
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

  console.log('✅ Lab 4 seeded.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());