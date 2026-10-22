import 'dotenv/config';
import { PrismaClient, Difficulty, Language } from '@prisma/client';

const prisma = new PrismaClient();

const LAB_SLUG = 'lab-4-ddl-constraints-sequences-tcl';
const LAB_EN = 'Lab 4: DDL, Constraints, Sequences & TCL';
const LAB_AR = 'المعمل 4: لغة تعريف البيانات (DDL)، القيود، المتسلسلات، والتحكم بالمعاملات';

type H = [string, string]; // [English, Arabic]
interface C {
  slug: string; d: Difficulty; pts: number; master: boolean;
  tEn: string; tAr: string; dEn: string; dAr: string;
  tables: object[]; setup: string; ref: string; start: string; hints: [H, H, H];
}

const col = (name: string, type: string, key?: 'PK' | 'FK') => (key ? { name, type, key } : { name, type });

const DEPT = { name: 'dept', columns: [col('deptno', 'NUMBER(2)'), col('dname', 'VARCHAR2(14)'), col('loc', 'VARCHAR2(13)')] };
const DEPT_PK = { name: 'dept', columns: [col('deptno', 'NUMBER(2)', 'PK'), col('dname', 'VARCHAR2(14)'), col('loc', 'VARCHAR2(13)')] };
const DEPT80_C1 = { name: 'dept80', columns: [col('department_id', 'NUMBER(4)'), col('department_name', 'VARCHAR2(30)')] };
const DEPT80_C2 = { name: 'dept80', columns: [col('employee_id', 'NUMBER(6)'), col('last_name', 'VARCHAR2(25)'), col('hire_date', 'DATE')] };
const EMPLOYEES_C3 = { name: 'employees', columns: [col('employee_id', 'NUMBER(6)'), col('department_id', 'NUMBER(4)'), col('manager_id', 'NUMBER(6)')] };
const DEPARTMENTS = { name: 'departments', columns: [col('department_id', 'NUMBER(4)', 'PK'), col('department_name', 'VARCHAR2(30)')] };
const EMPLOYEES_C5 = {
  name: 'employees',
  columns: [col('employee_id', 'NUMBER(6)', 'PK'), col('last_name', 'VARCHAR2(25)'), col('email', 'VARCHAR2(25)'), col('salary', 'NUMBER(8,2)'), col('hire_date', 'DATE'), col('department_id', 'NUMBER(4)', 'FK')],
};
const EMP = { name: 'emp', columns: [col('empno', 'NUMBER(4)', 'PK'), col('sal', 'NUMBER(7,2)'), col('job', 'VARCHAR2(9)'), col('deptno', 'NUMBER(2)')] };
const REGION = { name: 'region', columns: [col('id', 'NUMBER', 'PK'), col('name', 'VARCHAR2(25)')] };

const CHALLENGES: C[] = [
  // ------------------------------------------------------------------ 1
  {
    slug: 'lab4-create-table', d: 'EASY', pts: 100, master: false,
    tEn: 'Initialize Department Structure', tAr: 'تهيئة هيكل الأقسام',
    dEn: `Build the new dept table using the exact column specifications shown in the schema, and permanently remove the obsolete dept80 table and its structure from the database.`,
    dAr: `ابنِ جدول الأقسام الجديد (dept) بالمواصفات الموضحة في المخطط (Schema)، وأزل جدول (dept80) القديم مع هيكله وبياناته نهائياً من قاعدة البيانات.`,
    tables: [DEPT, DEPT80_C1],
    setup: `DROP TABLE IF EXISTS dept CASCADE;
CREATE TABLE dept80 (department_id NUMBER(4), department_name VARCHAR2(30));
INSERT INTO dept80 VALUES (10, 'Administration'), (20, 'Finance');`,
    ref: `CREATE TABLE dept (
    deptno NUMBER(2),
    dname VARCHAR2(14),
    loc VARCHAR2(13)
);

DROP TABLE dept80;`,
    start: '-- 1) Create the dept table   2) Remove the obsolete dept80 table\n',
    hints: [
      ['You need two things: create the new dept table, and drop the old dept80 table. Each is its own statement, separated by a semicolon.', 'تحتاج إلى أمرين: إنشاء جدول dept الجديد، وحذف جدول dept80 القديم. كل منهما جملة مستقلة مفصولة بفاصلة منقوطة.'],
      ['CREATE TABLE dept ( ... ) lists each column as: name datatype, with VARCHAR2(size) for text and NUMBER(precision) for numbers. DROP TABLE removes a table together with its structure and data.', 'تذكر CREATE TABLE dept ( ... ) كل عمود بالشكل: الاسم ثم نوع البيانات، مع VARCHAR2(size) للنصوص و NUMBER(precision) للأرقام. أما DROP TABLE فتزيل الجدول مع هيكله وبياناته.'],
      ['The columns are: deptno NUMBER(2), dname VARCHAR2(14), loc VARCHAR2(13). Then finish with DROP TABLE dept80;', 'الأعمدة هي: deptno NUMBER(2) و dname VARCHAR2(14) و loc VARCHAR2(13). ثم اختم بـ DROP TABLE dept80;'],
    ],
  },

  // ------------------------------------------------------------------ 2
  {
    slug: 'lab4-alter-table', d: 'EASY', pts: 100, master: false,
    tEn: 'Adjust dept80 Table Columns', tAr: 'تعديل أعمدة جدول dept80',
    dEn: `Update the structure of the dept80 table: append a new variable-length text column named job_id of size 9, expand the width of the last_name column to 30 characters, and remove the hire_date column.`,
    dAr: `عدّل هيكل جدول (dept80): أضف عموداً نصياً متغير الطول باسم (job_id) بحجم 9 أحرف، ووسّع عرض العمود (last_name) ليصبح 30 حرفاً، ثم أزل العمود (hire_date) من الجدول.`,
    tables: [DEPT80_C2],
    setup: `CREATE TABLE dept80 (employee_id NUMBER(6), last_name VARCHAR2(25), hire_date DATE);
INSERT INTO dept80 VALUES (101, 'Harrington', '2016-03-22'), (102, 'Castellano', '2017-05-14');`,
    ref: `ALTER TABLE dept80
ADD (job_id VARCHAR2(9));

ALTER TABLE dept80
MODIFY (last_name VARCHAR2(30));

ALTER TABLE dept80
DROP COLUMN hire_date;`,
    start: '-- Table dept80 already exists. Add job_id, widen last_name, drop hire_date\n',
    hints: [
      ['Every change is a separate ALTER TABLE dept80 statement: one to add a column, one to change a column, one to drop a column.', 'كل تغيير هو جملة ALTER TABLE dept80 مستقلة: واحدة لإضافة عمود، وواحدة لتعديل عمود، وواحدة لحذف عمود.'],
      ['Use ADD (...) for the new column, MODIFY (...) to widen an existing one, and DROP COLUMN name to remove one.', 'استخدم ADD (...) للعمود الجديد، و MODIFY (...) لتوسيع عمود موجود، و DROP COLUMN name لحذف عمود.'],
      ['In order: ADD (job_id VARCHAR2(9)), then MODIFY (last_name VARCHAR2(30)), then DROP COLUMN hire_date.', 'بالترتيب: ADD (job_id VARCHAR2(9)) ثم MODIFY (last_name VARCHAR2(30)) ثم DROP COLUMN hire_date.'],
    ],
  },

  // ------------------------------------------------------------------ 3
  {
    slug: 'lab4-constraints-alter', d: 'MEDIUM', pts: 150, master: false,
    tEn: 'Reconfigure Table Keys and Dependencies', tAr: 'إعادة ضبط مفاتيح الجداول والارتباطات',
    dEn: `On the employees table, assign employee_id as the primary key (named emp_id_pk), link department_id as a foreign key to the departments table, and remove the existing emp_manager_fk constraint. Finally, remove the primary key of departments along with all dependent foreign key constraints.`,
    dAr: `على جدول (employees)، عيّن العمود (employee_id) كمفتاح أساسي باسم (emp_id_pk)، واربط العمود (department_id) كمفتاح أجنبي بجدول (departments)، وأزل القيد الحالي (emp_manager_fk). وفي النهاية، أزل المفتاح الأساسي لجدول (departments) مع كافة قيود المفاتيح الأجنبية المرتبطة به.`,
    tables: [EMPLOYEES_C3, DEPARTMENTS],
    setup: `DROP TABLE employees CASCADE;
DROP TABLE departments CASCADE;
CREATE TABLE departments (department_id NUMBER(4) PRIMARY KEY, department_name VARCHAR2(30));
INSERT INTO departments VALUES (10, 'Administration'), (20, 'Finance'), (30, 'Purchasing'), (40, 'Shipping');
CREATE TABLE employees (employee_id NUMBER(6) UNIQUE, department_id NUMBER(4), manager_id NUMBER(6));
INSERT INTO employees VALUES (100, 10, NULL), (101, 20, 100), (102, 20, 100), (103, 30, 101), (104, 40, 102);
ALTER TABLE employees ADD CONSTRAINT emp_manager_fk FOREIGN KEY (manager_id) REFERENCES employees (employee_id);`,
    ref: `ALTER TABLE employees
ADD CONSTRAINT emp_id_pk PRIMARY KEY (employee_id);

ALTER TABLE employees
ADD FOREIGN KEY (department_id)
REFERENCES departments (department_id);

ALTER TABLE employees
DROP CONSTRAINT emp_manager_fk;

ALTER TABLE departments
DROP PRIMARY KEY CASCADE;`,
    start: '-- 1) emp_id_pk primary key   2) foreign key to departments   3) drop emp_manager_fk   4) drop the primary key of departments (CASCADE)\n',
    hints: [
      ['Four statements, in order: add a primary key, add a foreign key, drop a named constraint, drop a primary key. Constraints are changed with ALTER TABLE.', 'أربع جمل بالترتيب: إضافة مفتاح أساسي، إضافة مفتاح أجنبي، حذف قيد مسمى، حذف مفتاح أساسي. تُعدَّل القيود بالأمر ALTER TABLE.'],
      ['ADD CONSTRAINT name PRIMARY KEY (column) creates a named key; ADD FOREIGN KEY (column) REFERENCES parent (column) links two tables; DROP CONSTRAINT name removes a named constraint.', 'ينشئ ADD CONSTRAINT name PRIMARY KEY (column) مفتاحاً مسمى، ويربط ADD FOREIGN KEY (column) REFERENCES parent (column) بين جدولين، ويزيل DROP CONSTRAINT name قيداً مسمى.'],
      ['To drop a primary key and every foreign key that depends on it: ALTER TABLE departments DROP PRIMARY KEY CASCADE;', 'لحذف المفتاح الأساسي وكل مفتاح أجنبي يعتمد عليه: ALTER TABLE departments DROP PRIMARY KEY CASCADE;'],
    ],
  },

  // ------------------------------------------------------------------ 4
  {
    slug: 'lab4-sequences', d: 'MEDIUM', pts: 150, master: false,
    tEn: 'Automated Department Numbering', tAr: 'الترقيم التلقائي للأقسام',
    dEn: `Create a unique number generator named id_seq starting at 10, increasing by 10, with a maximum value of 2000. Use it to insert two new rows into the dept table: ('finance', 'cairo') and ('sales', 'alex'), then delete the generator.`,
    dAr: `أنشئ مولد أرقام فريدة باسم (id_seq) يبدأ من 10 ويزيد بمقدار 10 بحد أقصى 2000. استخدمه لإدراج صفين جديدين في جدول (dept) بالبيانات: ('finance', 'cairo') و ('sales', 'alex')، ثم احذف المولد.`,
    tables: [DEPT_PK],
    setup: `DROP SEQUENCE IF EXISTS id_seq;
DROP TABLE IF EXISTS dept CASCADE;
CREATE TABLE dept (deptno NUMBER(2) PRIMARY KEY, dname VARCHAR2(14), loc VARCHAR2(13));`,
    ref: `CREATE SEQUENCE id_seq
START WITH 10
INCREMENT BY 10
MAXVALUE 2000;

INSERT INTO dept VALUES (id_seq.nextval, 'finance', 'cairo');
INSERT INTO dept VALUES (id_seq.nextval, 'sales', 'alex');

DROP SEQUENCE id_seq;`,
    start: '-- 1) Create id_seq   2) Insert the two departments using id_seq.nextval   3) Drop id_seq\n',
    hints: [
      ['A sequence is created with CREATE SEQUENCE name START WITH n INCREMENT BY n MAXVALUE n. Create it first.', 'تُنشأ المتسلسلة بالأمر CREATE SEQUENCE name START WITH n INCREMENT BY n MAXVALUE n. أنشئها أولاً.'],
      ['sequence_name.NEXTVAL gives the next number each time it is used, so two INSERT statements get two different numbers (10, then 20).', 'يعطيك sequence_name.NEXTVAL الرقم التالي في كل مرة يُستخدم فيها، فتحصل جملتا INSERT على رقمين مختلفين (10 ثم 20).'],
      ["Insert with VALUES (id_seq.nextval, 'finance', 'cairo') and the same pattern for 'sales', 'alex'. Finish with DROP SEQUENCE id_seq;", "أدرج بالصيغة VALUES (id_seq.nextval, 'finance', 'cairo') ونفس النمط لـ 'sales', 'alex'. ثم اختم بـ DROP SEQUENCE id_seq;"],
    ],
  },

  // ------------------------------------------------------------------ 5
  {
    slug: 'lab4-constraints-create', d: 'HARD', pts: 200, master: false,
    tEn: 'Enforce Employee Data Integrity Rules', tAr: 'تطبيق قواعد تكامل بيانات الموظفين',
    dEn: `Build the employees table matching the schema with these column-level rules: last_name must be both mandatory and unique, salary must be strictly greater than zero, hire_date is mandatory (named emp_hire_date_nn), and department_id references departments (automatically deleting dependent employee rows if a parent department is deleted). At the table level, enforce a unique constraint on email (named emp_email_uk) and set employee_id as the primary key (named emp_id_pk).`,
    dAr: `ابنِ جدول (employees) وفق المخطط المرفق مع تطبيق القواعد التالية على مستوى العمود: الاسم الأخير (last_name) إجباري وفريد معاً، والراتب (salary) أكبر من الصفر، وتاريخ التعيين (hire_date) إجباري بقيد مسمى (emp_hire_date_nn)، ورقم القسم (department_id) يشير لجدول الأقسام (مع الحذف التلقائي لصفوف الموظفين التابعين عند حذف القسم الأب). وعلى مستوى الجدول، افرض قيد التفرد على البريد الإلكتروني باسم (emp_email_uk) وعيّن رقم الموظف كمفتاح أساسي باسم (emp_id_pk).`,
    tables: [EMPLOYEES_C5, DEPARTMENTS],
    setup: `DROP TABLE employees CASCADE;
ALTER TABLE departments ALTER COLUMN department_id TYPE NUMERIC(4);`,
    ref: `CREATE TABLE employees (
    employee_id NUMBER(6),
    last_name VARCHAR2(25) NOT NULL UNIQUE,
    email VARCHAR2(25),
    salary NUMBER(8,2) CHECK (salary > 0),
    hire_date DATE CONSTRAINT emp_hire_date_nn NOT NULL,
    department_id NUMBER(4) REFERENCES departments(department_id) ON DELETE CASCADE,
    CONSTRAINT emp_email_uk UNIQUE(email),
    CONSTRAINT emp_id_pk PRIMARY KEY (employee_id)
);`,
    start: '-- Create the employees table with the column-level and table-level rules from the description\n',
    hints: [
      ["Column-level rules go right after a column's data type; table-level rules are listed at the end of the column list. Name a rule with CONSTRAINT name ...", 'تُكتب قواعد مستوى العمود مباشرة بعد نوع بيانات العمود، بينما تُدرج قواعد مستوى الجدول في نهاية قائمة الأعمدة. سمِّ القاعدة باستخدام CONSTRAINT name ...'],
      ['NOT NULL UNIQUE makes last_name mandatory and unique, CHECK (salary > 0) validates the salary, and REFERENCES departments(department_id) ON DELETE CASCADE creates a foreign key that deletes the dependent rows.', 'يجعل NOT NULL UNIQUE العمود last_name إجبارياً وفريداً، ويتحقق CHECK (salary > 0) من الراتب، وينشئ REFERENCES departments(department_id) ON DELETE CASCADE مفتاحاً أجنبياً يحذف الصفوف التابعة.'],
      ['hire_date uses CONSTRAINT emp_hire_date_nn NOT NULL. Finish with two table-level lines: CONSTRAINT emp_email_uk UNIQUE(email), CONSTRAINT emp_id_pk PRIMARY KEY (employee_id).', 'يستخدم hire_date القيد CONSTRAINT emp_hire_date_nn NOT NULL. واختم بسطرين على مستوى الجدول: CONSTRAINT emp_email_uk UNIQUE(email) و CONSTRAINT emp_id_pk PRIMARY KEY (employee_id).'],
    ],
  },

  // ------------------------------------------------------------------ 6 (Master Challenge)
  {
    slug: 'lab4-transaction-control', d: 'EXPERT', pts: 250, master: true,
    tEn: 'Manage Multi-Step Database Transactions', tAr: 'إدارة معاملات قاعدة البيانات متعددة الخطوات',
    dEn: `In the emp table, change the department of employee 7902 to 40, and raise the salary of all 'CLERK' employees by 10% (sal * 1.1). Mark a transaction checkpoint named update_done, then insert a new region (8, 'central') into the region table. Discard only the region insertion by returning to your checkpoint, and permanently save the salary and department updates.`,
    dAr: `في جدول (emp)، غيّر قسم الموظف رقم 7902 إلى 40، وارفع راتب جميع موظفي وظيفة ('CLERK') بنسبة 10% (sal * 1.1). أنشئ نقطة حفظ للمعاملة باسم (update_done)، ثم أدرج منطقة جديدة بالبيانات (8, 'central') في جدول (region). ألغِ عملية إدراج المنطقة فقط بالعودة إلى نقطة الحفظ، ثم ثبّت تعديلات القسم والرواتب بشكل دائم.`,
    tables: [EMP, REGION],
    setup: `CREATE TABLE emp (empno NUMBER(4) PRIMARY KEY, sal NUMBER(7,2), job VARCHAR2(9), deptno NUMBER(2));
INSERT INTO emp VALUES (7369, 800, 'CLERK', 20), (7499, 1600, 'SALESMAN', 30), (7521, 1250, 'SALESMAN', 30),
  (7566, 2975, 'MANAGER', 20), (7698, 2850, 'MANAGER', 30), (7782, 2450, 'MANAGER', 10),
  (7788, 3000, 'ANALYST', 20), (7839, 5000, 'PRESIDENT', 10), (7876, 1100, 'CLERK', 20),
  (7900, 950, 'CLERK', 30), (7902, 3000, 'ANALYST', 20), (7934, 1300, 'CLERK', 10);
CREATE TABLE region (id NUMBER PRIMARY KEY, name VARCHAR2(25));
INSERT INTO region VALUES (1, 'north'), (2, 'south'), (3, 'east'), (4, 'west'), (5, 'northeast'), (6, 'southwest'), (7, 'coastal');`,
    ref: `UPDATE emp
SET deptno = 40
WHERE empno = 7902;

UPDATE emp
SET sal = sal * 1.1
WHERE job = 'CLERK';

SAVEPOINT update_done;

INSERT INTO region (id, name)
VALUES (8, 'central');

ROLLBACK TO update_done;

COMMIT;`,
    start: '-- Tables emp and region already exist. Use UPDATE, SAVEPOINT, INSERT, ROLLBACK TO and COMMIT\n',
    hints: [
      ['A transaction groups statements together. SAVEPOINT name marks a point you can return to; COMMIT makes everything still pending permanent.', 'تجمع المعاملة عدة جمل معاً. تحدد SAVEPOINT name نقطة يمكنك العودة إليها، ويجعل COMMIT كل ما بقي معلّقاً دائماً.'],
      ['ROLLBACK TO savepoint_name undoes only what happened after that savepoint, so both UPDATE statements survive.', 'يتراجع ROLLBACK TO savepoint_name عمّا حدث بعد نقطة الحفظ فقط، لذا تبقى جملتا UPDATE سليمتين.'],
      ['The order is: UPDATE deptno → UPDATE sal → SAVEPOINT update_done → INSERT → ROLLBACK TO update_done → COMMIT.', 'الترتيب هو: UPDATE للقسم ثم UPDATE للراتب ثم SAVEPOINT update_done ثم INSERT ثم ROLLBACK TO update_done ثم COMMIT.'],
    ],
  },
];

async function main() {
  const existing = await prisma.lab.findUnique({ where: { slug: LAB_SLUG } });
  let lab;
  if (existing) {
    lab = await prisma.lab.update({ where: { id: existing.id }, data: { titleEn: LAB_EN, titleAr: LAB_AR } });
  } else {
    const max = await prisma.lab.aggregate({ _max: { orderIndex: true } });
    lab = await prisma.lab.create({ data: { slug: LAB_SLUG, titleEn: LAB_EN, titleAr: LAB_AR, orderIndex: (max._max.orderIndex ?? -1) + 1 } });
  }
  console.log(`📚 ${lab.titleEn}`);

  for (let i = 0; i < CHALLENGES.length; i++) {
    const c = CHALLENGES[i];
    const data = {
      titleEn: c.tEn, titleAr: c.tAr, descriptionEn: c.dEn, descriptionAr: c.dAr,
      difficulty: c.d, points: c.pts, orderIndex: i, labId: lab.id, isMaster: c.master,
      schemaJson: JSON.stringify({ tables: c.tables }),
      referenceAnswer: c.ref, setupSql: c.setup,
    };
    const challenge = await prisma.challenge.upsert({ where: { slug: c.slug }, update: data, create: { slug: c.slug, ...data } });

    await prisma.starterCode.upsert({
      where: { challengeId_language: { challengeId: challenge.id, language: Language.SQL } },
      update: { code: c.start },
      create: { challengeId: challenge.id, language: Language.SQL, code: c.start },
    });
    for (let h = 0; h < c.hints.length; h++) {
      const hint = { contentEn: c.hints[h][0], contentAr: c.hints[h][1], pointPenalty: (h + 1) * 10 };
      await prisma.hint.upsert({
        where: { challengeId_order: { challengeId: challenge.id, order: h + 1 } },
        update: hint,
        create: { challengeId: challenge.id, order: h + 1, ...hint },
      });
    }
    console.log(`   ${i + 1}. ${c.tEn} (${c.d}, ${c.pts} pts)${c.master ? '  ← hidden Master Challenge' : ''}`);
  }
  console.log('✅ Lab 4 updated.');
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());