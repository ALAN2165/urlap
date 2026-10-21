import 'dotenv/config';
import { PrismaClient, Difficulty, Language } from '@prisma/client';

const prisma = new PrismaClient();

type H = [string, string]; // [English, Arabic]
interface C {
  slug: string; d: Difficulty; pts: number;
  tEn: string; tAr: string; dEn: string; dAr: string;
  tables: object[]; ref: string; start: string; hints: [H, H, H]; setup?: string;
}
interface L { slug: string; en: string; ar: string; challenges: C[] }

const col = (name: string, type: string, key?: 'PK' | 'FK') => (key ? { name, type, key } : { name, type });

const EMPLOYEES = { name: 'employees', columns: [col('employee_id', 'int', 'PK'), col('last_name', 'varchar'), col('job_id', 'varchar'), col('salary', 'int'), col('hire_date', 'date'), col('commission_pct', 'numeric'), col('manager_id', 'int', 'FK'), col('department_id', 'int', 'FK')] };
const DEPARTMENTS = { name: 'departments', columns: [col('department_id', 'int', 'PK'), col('department_name', 'varchar'), col('manager_id', 'int'), col('location_id', 'int')] };
const DEPT = { name: 'dept', columns: [col('deptno', 'NUMBER(2)'), col('dname', 'VARCHAR2(14)'), col('loc', 'VARCHAR2(13)')] };
const DEPT80 = { name: 'dept80', columns: [col('employee_id', 'NUMBER(6)'), col('last_name', 'VARCHAR2(25)'), col('annsal', 'NUMBER(10,2)'), col('hire_date', 'DATE')] };
const EMP = { name: 'emp', columns: [col('empno', 'NUMBER(4)'), col('ename', 'VARCHAR2(10)'), col('job', 'VARCHAR2(9)'), col('sal', 'NUMBER(7,2)')] };
const REGION = { name: 'region', columns: [col('id', 'NUMBER(4)'), col('name', 'VARCHAR2(25)')] };

const LABS: L[] = [
  // ------------------------------------------------------------------ LAB 1
  {
    slug: 'lab-1-select-where',
    en: 'SQL Fundamentals - Lab 1: SELECT & WHERE',
    ar: 'أساسيات SQL - المعمل 1: SELECT و WHERE',
    challenges: [
      {
        slug: 'lab1-salary-filter', d: 'EASY', pts: 100,
        tEn: 'Filtering by Salary', tAr: 'التصفية حسب الراتب',
        dEn: 'Write a query that displays the last_name and salary of every employee who earns more than 12000.',
        dAr: 'اكتب استعلاماً يعرض الاسم الأخير last_name والراتب salary لكل موظف يتقاضى أكثر من 12000.',
        tables: [EMPLOYEES],
        ref: 'SELECT last_name, salary FROM employees WHERE salary > 12000;',
        start: '-- Show last_name and salary for employees earning more than 12000\n',
        hints: [
          ['You only need two columns, so list them after SELECT instead of using *.', 'تحتاج إلى عمودين فقط، لذا اذكرهما بعد SELECT بدلاً من استخدام *.'],
          ['Rows are filtered with a WHERE clause placed after the FROM clause.', 'تتم تصفية الصفوف باستخدام جملة WHERE التي تأتي بعد جملة FROM.'],
          ['The comparison you need is: WHERE salary > 12000.', 'المقارنة المطلوبة هي: WHERE salary > 12000.'],
        ],
      },
      {
        slug: 'lab1-calculated-column', d: 'EASY', pts: 100,
        tEn: 'Calculated Column with an Alias', tAr: 'عمود محسوب باستخدام اسم مستعار',
        dEn: 'For employees in department 30, display the last_name and their annual salary (monthly salary multiplied by 12). Give the calculated column the alias annual_salary.',
        dAr: 'اعرض الاسم الأخير last_name والراتب السنوي (الراتب الشهري مضروباً في 12) للموظفين العاملين في القسم 30. أعطِ العمود المحسوب الاسم المستعار annual_salary.',
        tables: [EMPLOYEES],
        ref: 'SELECT last_name, salary * 12 AS annual_salary FROM employees WHERE department_id = 30;',
        start: '-- last_name and annual salary (salary * 12) for department 30\n',
        hints: [
          ['SQL can do arithmetic directly inside the SELECT list, e.g. salary * 12.', 'يمكن لـ SQL إجراء العمليات الحسابية مباشرة داخل قائمة SELECT، مثل salary * 12.'],
          ['Add AS annual_salary right after the expression to name the new column.', 'أضف AS annual_salary مباشرة بعد التعبير لتسمية العمود الجديد.'],
          ["Don't forget the filter: WHERE department_id = 30.", 'لا تنسَ شرط التصفية: WHERE department_id = 30.'],
        ],
      },
      {
        slug: 'lab1-in-like-order', d: 'MEDIUM', pts: 150,
        tEn: 'IN, LIKE and ORDER BY', tAr: 'IN و LIKE و ORDER BY',
        dEn: "Display the last_name, job_id and hire_date of employees whose job_id is either 'SA_REP' or 'ST_CLERK' and whose last name contains the lowercase letter 'a'. Sort the result by hire_date, newest first.",
        dAr: "اعرض الاسم الأخير last_name والوظيفة job_id وتاريخ التعيين hire_date للموظفين الذين وظيفتهم 'SA_REP' أو 'ST_CLERK' ويحتوي اسمهم الأخير على الحرف الصغير 'a'. رتّب النتيجة حسب hire_date من الأحدث إلى الأقدم.",
        tables: [EMPLOYEES],
        ref: "SELECT last_name, job_id, hire_date FROM employees WHERE job_id IN ('SA_REP', 'ST_CLERK') AND last_name LIKE '%a%' ORDER BY hire_date DESC;",
        start: '-- SA_REP / ST_CLERK employees whose last name contains "a", newest hire first\n',
        hints: [
          ['IN lets you test a column against a list of values without writing several OR conditions.', 'يتيح لك IN مقارنة العمود بقائمة قيم دون كتابة عدة شروط OR.'],
          ["LIKE '%a%' matches any text that contains the letter a anywhere inside it.", "يطابق LIKE '%a%' أي نص يحتوي على الحرف a في أي موضع."],
          ['Finish with ORDER BY hire_date DESC — DESC puts the newest date first.', 'اختم بـ ORDER BY hire_date DESC — الكلمة DESC تضع أحدث تاريخ أولاً.'],
        ],
      },
      {
        slug: 'lab1-null-or', d: 'MEDIUM', pts: 150,
        tEn: 'NULL Values and OR', tAr: 'القيم الفارغة NULL والمعامل OR',
        dEn: 'Display the last_name, manager_id and commission_pct of employees who either have no manager or earn a commission_pct of exactly 0.20.',
        dAr: 'اعرض الاسم الأخير last_name ومعرف المدير manager_id ونسبة العمولة commission_pct للموظفين الذين ليس لديهم مدير، أو الذين نسبة عمولتهم تساوي 0.20 تماماً.',
        tables: [EMPLOYEES],
        ref: 'SELECT last_name, manager_id, commission_pct FROM employees WHERE manager_id IS NULL OR commission_pct = 0.20;',
        start: '-- Employees with no manager, or with a commission of exactly 0.20\n',
        hints: [
          ["A missing value is NULL, and you can't test it with = — you need a special operator.", 'القيمة المفقودة هي NULL ولا يمكن اختبارها بالمعامل = ، بل تحتاج إلى معامل خاص.'],
          ['Use IS NULL to find employees without a manager: manager_id IS NULL.', 'استخدم IS NULL للعثور على الموظفين بلا مدير: manager_id IS NULL.'],
          ['Combine both conditions with OR: WHERE manager_id IS NULL OR commission_pct = 0.20.', 'اجمع الشرطين بالمعامل OR: WHERE manager_id IS NULL OR commission_pct = 0.20.'],
        ],
      },
      {
        slug: 'lab1-distinct-between', d: 'HARD', pts: 200,
        tEn: 'DISTINCT, BETWEEN and NOT IN', tAr: 'DISTINCT و BETWEEN و NOT IN',
        dEn: "Display each different job_id (no duplicates) held by employees whose salary is between 5000 and 9000, inclusive. Exclude the jobs 'ST_CLERK' and 'SA_REP' from the result.",
        dAr: "اعرض كل وظيفة job_id مختلفة (دون تكرار) يشغلها موظفون يتراوح راتبهم بين 5000 و9000 شاملةً الحدّين. استبعد الوظيفتين 'ST_CLERK' و 'SA_REP' من النتيجة.",
        tables: [EMPLOYEES],
        ref: "SELECT DISTINCT job_id FROM employees WHERE salary BETWEEN 5000 AND 9000 AND job_id NOT IN ('ST_CLERK', 'SA_REP');",
        start: '-- Distinct job_id values for salaries from 5000 to 9000, excluding ST_CLERK and SA_REP\n',
        hints: [
          ['DISTINCT right after SELECT removes duplicate rows from the output.', 'تؤدي DISTINCT الموضوعة بعد SELECT مباشرة إلى حذف الصفوف المكررة من المخرجات.'],
          ['BETWEEN 5000 AND 9000 includes both 5000 and 9000 themselves.', 'يشمل BETWEEN 5000 AND 9000 الرقمين 5000 و9000 نفسيهما.'],
          ["Exclude values with NOT IN ('ST_CLERK', 'SA_REP') and join all the conditions with AND.", "استبعد القيم باستخدام NOT IN ('ST_CLERK', 'SA_REP') واربط جميع الشروط بالمعامل AND."],
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ LAB 2
  {
    slug: 'lab-2-functions-grouping',
    en: 'SQL Fundamentals - Lab 2: Functions & Grouping',
    ar: 'أساسيات SQL - المعمل 2: الدوال والتجميع',
    challenges: [
      {
        slug: 'lab2-lower-coalesce', d: 'EASY', pts: 100,
        tEn: 'Single-Row Functions: LOWER and NULL Handling', tAr: 'الدوال أحادية الصف: LOWER ومعالجة القيم الفارغة',
        dEn: 'For employees in department 10, display the last_name in lowercase together with their manager_id. If an employee has no manager, show 0 instead of NULL. (In Oracle you would use NVL; PostgreSQL\'s COALESCE does the same job, and NVL also works here.)',
        dAr: 'للموظفين العاملين في القسم 10، اعرض الاسم الأخير last_name بأحرف صغيرة مع معرف المدير manager_id. إذا لم يكن للموظف مدير فاعرض 0 بدلاً من NULL. (في Oracle تستخدم NVL، وتؤدي COALESCE في PostgreSQL المهمة نفسها، كما تعمل NVL هنا أيضاً.)',
        tables: [EMPLOYEES],
        ref: 'SELECT LOWER(last_name), COALESCE(manager_id, 0) FROM employees WHERE department_id = 10;',
        start: '-- Lowercase last_name and manager_id (0 when there is no manager), department 10\n',
        hints: [
          ['LOWER(column) converts text to lowercase: LOWER(last_name).', 'تحوّل LOWER(column) النص إلى أحرف صغيرة: LOWER(last_name).'],
          ['To replace NULL with another value, use COALESCE(column, replacement) — or NVL(column, replacement).', 'لاستبدال NULL بقيمة أخرى استخدم COALESCE(column, replacement) أو NVL(column, replacement).'],
          ['Put both in the SELECT list, then filter with WHERE department_id = 10.', 'ضع الاثنين في قائمة SELECT ثم صفِّ النتيجة بـ WHERE department_id = 10.'],
        ],
      },
      {
        slug: 'lab2-min-max-avg', d: 'EASY', pts: 100,
        tEn: 'Aggregate Functions: MIN, MAX and AVG', tAr: 'دوال التجميع: MIN و MAX و AVG',
        dEn: 'Display the lowest salary, the highest salary and the average salary of all employees. Round the average to 2 decimal places.',
        dAr: 'اعرض أقل راتب وأعلى راتب ومتوسط الرواتب لجميع الموظفين. قرّب المتوسط إلى منزلتين عشريتين.',
        tables: [EMPLOYEES],
        ref: 'SELECT MIN(salary), MAX(salary), ROUND(AVG(salary), 2) FROM employees;',
        start: '-- Lowest, highest and average salary (average rounded to 2 decimals)\n',
        hints: [
          ['MIN(column) and MAX(column) return the smallest and largest value.', 'تعيد MIN(column) و MAX(column) أصغر قيمة وأكبر قيمة.'],
          ['AVG(column) returns the average. These functions collapse all rows into one result row.', 'تعيد AVG(column) المتوسط. وتختصر هذه الدوال جميع الصفوف في صف نتيجة واحد.'],
          ['Wrap the average in ROUND(..., 2): ROUND(AVG(salary), 2).', 'ضع المتوسط داخل ROUND(..., 2): ROUND(AVG(salary), 2).'],
        ],
      },
      {
        slug: 'lab2-group-by', d: 'MEDIUM', pts: 150,
        tEn: 'Grouping Rows with GROUP BY', tAr: 'تجميع الصفوف باستخدام GROUP BY',
        dEn: 'For each department_id, display the number of employees and the total salary paid to them.',
        dAr: 'اعرض لكل قسم department_id عدد الموظفين فيه وإجمالي الرواتب المدفوعة لهم.',
        tables: [EMPLOYEES],
        ref: 'SELECT department_id, COUNT(*), SUM(salary) FROM employees GROUP BY department_id;',
        start: '-- Per department: number of employees and total salary\n',
        hints: [
          ['You want one result row per department, which is what GROUP BY does.', 'تريد صف نتيجة واحداً لكل قسم، وهذا ما تفعله GROUP BY.'],
          ['COUNT(*) counts the rows in each group and SUM(salary) adds up their salaries.', 'تعدّ COUNT(*) الصفوف في كل مجموعة وتجمع SUM(salary) رواتبها.'],
          ['Every non-aggregated column in SELECT must appear in GROUP BY: GROUP BY department_id.', 'يجب أن يظهر كل عمود غير مجمَّع في SELECT ضمن GROUP BY: GROUP BY department_id.'],
        ],
      },
      {
        slug: 'lab2-date-arithmetic', d: 'HARD', pts: 200,
        tEn: 'Date Arithmetic', tAr: 'العمليات الحسابية على التواريخ',
        dEn: "Display the last_name of the employee 'Higgins' together with the number of days between today's date and their hire_date. (Use CURRENT_DATE for today's date; Oracle's SYSDATE also works.)",
        dAr: "اعرض الاسم الأخير للموظف 'Higgins' مع عدد الأيام بين تاريخ اليوم وتاريخ تعيينه hire_date. (استخدم CURRENT_DATE للحصول على تاريخ اليوم، كما تعمل SYSDATE الخاصة بـ Oracle أيضاً.)",
        tables: [EMPLOYEES],
        ref: "SELECT last_name, CURRENT_DATE - hire_date FROM employees WHERE last_name = 'Higgins';",
        start: "-- Days since Higgins was hired\n",
        hints: [
          ['CURRENT_DATE gives today\'s date.', 'تعيد CURRENT_DATE تاريخ اليوم.'],
          ['Subtracting one date from another returns the number of days between them.', 'طرح تاريخ من آخر يعيد عدد الأيام بينهما.'],
          ["Try CURRENT_DATE - hire_date, and filter with WHERE last_name = 'Higgins'.", "جرّب CURRENT_DATE - hire_date وصفِّ النتيجة بـ WHERE last_name = 'Higgins'."],
        ],
      },
      {
        slug: 'lab2-having', d: 'HARD', pts: 250,
        tEn: 'Filtering Groups with HAVING', tAr: 'تصفية المجموعات باستخدام HAVING',
        dEn: 'Display the department_id and the average salary (rounded to 2 decimal places) of each department whose average salary is greater than 8000.',
        dAr: 'اعرض رقم القسم department_id ومتوسط الرواتب (مقرّباً إلى منزلتين عشريتين) لكل قسم يزيد متوسط رواتبه عن 8000.',
        tables: [EMPLOYEES],
        ref: 'SELECT department_id, ROUND(AVG(salary), 2) FROM employees GROUP BY department_id HAVING AVG(salary) > 8000;',
        start: '-- Departments whose average salary is above 8000\n',
        hints: [
          ['Start with a normal grouped query: GROUP BY department_id.', 'ابدأ باستعلام تجميع عادي: GROUP BY department_id.'],
          ["WHERE can't filter on aggregate results like AVG — filtering groups is HAVING's job.", 'لا تستطيع WHERE التصفية على نتائج دوال التجميع مثل AVG، فتصفية المجموعات هي مهمة HAVING.'],
          ['Add HAVING AVG(salary) > 8000 after the GROUP BY clause.', 'أضف HAVING AVG(salary) > 8000 بعد جملة GROUP BY.'],
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ LAB 3
  {
    slug: 'lab-3-subqueries-joins-dml',
    en: 'SQL Fundamentals - Lab 3: Subqueries, Joins & DML',
    ar: 'أساسيات SQL - المعمل 3: الاستعلامات الفرعية والدمج وعمليات DML',
    challenges: [
      {
        slug: 'lab3-explicit-insert', d: 'EASY', pts: 100,
        tEn: 'Explicit Data Insertion', tAr: 'إدخال البيانات الصريح',
        dEn: "Add a new row to the departments table containing the 'Purchasing' department with ID 30. Use the explicit method where column names are clearly specified, skipping other columns.",
        dAr: "قم بإضافة صف جديد إلى جدول الأقسام departments يحتوي على القسم 'Purchasing' بالرقم 30. استخدم الطريقة التي يتم فيها تحديد أسماء الأعمدة بوضوح (Explicit method) وتخطي الأعمدة الأخرى.",
        tables: [DEPARTMENTS],
        ref: "INSERT INTO departments (department_id, department_name) VALUES (30, 'Purchasing');",
        start: "-- Insert the 'Purchasing' department (ID 30) into the departments table\n",
        hints: [
          ["Think about which two columns you actually have values for: the department's ID and its name.", 'فكّر في العمودين اللذين لديك قيم لهما فعلاً: رقم القسم واسمه.'],
          ['The explicit method lists the column names in parentheses right after the table name: INSERT INTO table (col1, col2).', 'الطريقة الصريحة تذكر أسماء الأعمدة بين قوسين مباشرة بعد اسم الجدول: INSERT INTO table (col1, col2).'],
          ["Then give the values in the same order: VALUES (30, 'Purchasing'). Text values need single quotes.", "ثم اكتب القيم بنفس الترتيب: VALUES (30, 'Purchasing'). القيم النصية تحتاج إلى علامات اقتباس مفردة."],
        ],
      },
      {
        slug: 'lab3-single-row-subquery', d: 'EASY', pts: 100,
        tEn: 'Single-Row Subquery', tAr: 'استعلام فرعي بصف واحد',
        dEn: 'Write a query to find which employees earn a higher salary than employee number 141. The query should display only the last_name of these employees using a subquery.',
        dAr: 'اكتب استعلاماً لمعرفة من من الموظفين يتقاضى راتباً أعلى من راتب الموظف رقم 141. يجب أن يعرض الاستعلام الاسم الأخير last_name فقط لهؤلاء الموظفين باستخدام استعلام فرعي.',
        tables: [EMPLOYEES],
        ref: 'SELECT last_name FROM employees WHERE salary > (SELECT salary FROM employees WHERE employee_id = 141);',
        start: '-- Show the last_name of every employee who earns more than employee 141\n',
        hints: [
          ["First work out how to get employee 141's salary on its own with a simple SELECT.", 'ابدأ بمعرفة راتب الموظف 141 وحده باستخدام SELECT بسيط.'],
          ['Put that query inside parentheses and use it on the right side of a comparison in the WHERE clause.', 'ضع هذا الاستعلام بين قوسين واستخدمه في الطرف الأيمن من المقارنة داخل جملة WHERE.'],
          ['The comparison you need is greater-than: WHERE salary > ( ...your subquery... ).', 'المقارنة المطلوبة هي "أكبر من": WHERE salary > ( ...الاستعلام الفرعي... ).'],
        ],
      },
      {
        slug: 'lab3-fix-multi-row-subquery', d: 'MEDIUM', pts: 150,
        tEn: 'Fixing Multiple-Row Subquery', tAr: 'تصحيح استعلام فرعي متعدد الصفوف',
        dEn: 'The following query has an error because it uses a single-row operator = with a subquery that returns multiple values (minimum salaries grouped by department). Fix the query using the correct operator to avoid the ORA-01427 error: SELECT employee_id, last_name FROM employees WHERE salary = (SELECT MIN(salary) FROM employees GROUP BY department_id);',
        dAr: 'الاستعلام التالي يحتوي على خطأ لأنه يستخدم معامل صف واحد = مع استعلام فرعي يرجع قيماً متعددة (الحد الأدنى للرواتب مجمعة حسب القسم). قم بتصحيح الاستعلام باستخدام المعامل الصحيح لتجنب الخطأ ORA-01427: SELECT employee_id, last_name FROM employees WHERE salary = (SELECT MIN(salary) FROM employees GROUP BY department_id);',
        tables: [EMPLOYEES],
        ref: 'SELECT employee_id, last_name FROM employees WHERE salary IN (SELECT MIN(salary) FROM employees GROUP BY department_id);',
        start: 'SELECT employee_id, last_name\nFROM employees\nWHERE salary = (SELECT MIN(salary) FROM employees GROUP BY department_id);\n',
        hints: [
          ['The subquery returns one minimum salary per department, so it returns many rows, not one.', 'الاستعلام الفرعي يرجع حدًّا أدنى للراتب لكل قسم، أي صفوفًا متعددة وليس صفًّا واحدًا.'],
          ['The = operator can only compare against a single value. Which operator compares against a list of values?', 'المعامل = يقارن بقيمة واحدة فقط. ما المعامل الذي يقارن بقائمة من القيم؟'],
          ['Use IN: WHERE salary IN (SELECT MIN(salary) ...).', 'استخدم IN: WHERE salary IN (SELECT MIN(salary) ...).'],
        ],
      },
      {
        slug: 'lab3-update-two-columns', d: 'MEDIUM', pts: 150,
        tEn: 'Updating Two Columns', tAr: 'تحديث عمودين',
        dEn: "Use the UPDATE statement to modify the data for employee number 114. Change their job_id to 'sales_man' and their salary to 2000 in the same statement.",
        dAr: "استخدم جملة التحديث UPDATE لتعديل بيانات الموظف رقم 114. قم بتغيير وظيفته job_id لتصبح 'sales_man' وراتبه salary ليصبح 2000 في نفس الجملة.",
        tables: [EMPLOYEES],
        ref: "UPDATE employees SET job_id = 'sales_man', salary = 2000 WHERE employee_id = 114;",
        start: '-- Update employee 114: new job_id and new salary, in one statement\n',
        hints: [
          ['UPDATE changes existing rows. Start with: UPDATE employees SET ...', 'جملة UPDATE تعدّل صفوفًا موجودة. ابدأ بـ UPDATE employees SET ...'],
          ['To change two columns in one statement, separate the assignments with a comma.', 'لتعديل عمودين في جملة واحدة افصل بين التعيينات بفاصلة.'],
          ["Don't forget the WHERE clause, otherwise every employee would be updated: WHERE employee_id = 114.", 'لا تنسَ جملة WHERE وإلا سيتم تحديث جميع الموظفين: WHERE employee_id = 114.'],
        ],
      },
      {
        slug: 'lab3-equijoin-aliases', d: 'HARD', pts: 200,
        tEn: 'Equijoin with Aliases & Conditions', tAr: 'الدمج المتساوي مع الأسماء المستعارة والشروط',
        dEn: "Join the employees and departments tables to display the following columns: employee_id, last_name, department_id (from both tables), and location_id. Use Table Aliases to simplify the code. Finally, add an AND condition to display only the data for the employee with the last name 'Matos'.",
        dAr: "قم بدمج (Join) جدولي الموظفين employees والأقسام departments لعرض الأعمدة التالية: employee_id، و last_name، و department_id (من الجدولين)، و location_id. استخدم الأسماء المستعارة للجداول (Table Aliases) لتبسيط الكود وتقليل استهلاك الذاكرة. وأخيراً، أضف شرطاً إضافياً AND لعرض بيانات الموظف الذي يحمل الاسم الأخير 'Matos' فقط.",
        tables: [EMPLOYEES, DEPARTMENTS],
        ref: "SELECT e.employee_id, e.last_name, e.department_id, d.department_id, d.location_id FROM employees e, departments d WHERE e.department_id = d.department_id AND e.last_name = 'Matos';",
        start: "-- Join employees (e) and departments (d), then keep only the employee 'Matos'\n",
        hints: [
          ["Both tables share the department_id column — that's what links an employee to their department.", 'الجدولان يشتركان في العمود department_id وهو ما يربط الموظف بقسمه.'],
          ['Give each table a short alias (e.g. employees e, departments d) and prefix every column with it, e.g. e.department_id.', 'أعطِ كل جدول اسمًا مستعارًا قصيرًا (مثل employees e, departments d) وابدأ كل عمود به، مثل e.department_id.'],
          ["Join with WHERE e.department_id = d.department_id, then add AND e.last_name = 'Matos'.", "اربط بـ WHERE e.department_id = d.department_id ثم أضف AND e.last_name = 'Matos'."],
        ],
      },
      {
        slug: 'lab3-oracle-outer-join', d: 'EXPERT', pts: 300,
        tEn: 'Oracle Outer Joins', tAr: 'الدمج الخارجي في Oracle',
        dEn: "A standard join does not show departments that have no employees. Use the Oracle outer join operator (+) to display the employee's last_name, department_id, and department_name for all departments, even those without a direct match in the employees table.",
        dAr: 'الدمج العادي لا يظهر الأقسام التي لا تحتوي على موظفين. استخدم معامل الدمج الخارجي الخاص بـ Oracle وهو (+) لعرض الاسم الأخير للموظف last_name، ومعرف القسم department_id، واسم القسم department_name لجميع الأقسام، حتى تلك التي ليس لها تطابق مباشر مع جدول الموظفين.',
        tables: [EMPLOYEES, DEPARTMENTS],
        ref: 'SELECT e.last_name, e.department_id, d.department_name FROM employees e, departments d WHERE e.department_id(+) = d.department_id;',
        start: '-- Show every department, even those with no employees, using the Oracle (+) operator\n',
        hints: [
          ['A regular join drops departments that have no matching employee rows.', 'الدمج العادي يُسقط الأقسام التي ليس لها موظفون مطابقون.'],
          ['In the older Oracle join syntax you put (+) on the side of the join that may have missing rows.', 'في صيغة الدمج القديمة في Oracle تضع (+) على الطرف الذي قد تنقصه صفوف.'],
          ['Departments must always appear, so the employees side gets the marker: WHERE e.department_id(+) = d.department_id.', 'يجب أن تظهر الأقسام دائمًا، لذا يوضع الرمز على جانب الموظفين: WHERE e.department_id(+) = d.department_id.'],
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ LAB 4
  {
    slug: 'lab-4-ddl-constraints-sequences-tcl',
    en: 'Lab 4: DDL, Constraints, Sequences & TCL',
    ar: 'المعمل 4: لغة تعريف البيانات (DDL)، القيود، المتسلسلات، والتحكم بالمعاملات',
    challenges: [
      {
        slug: 'lab4-create-table', d: 'EASY', pts: 100,
        tEn: 'Creating Tables from Scratch', tAr: 'إنشاء الجداول من الصفر',
        dEn: 'Create a table named dept with three columns: deptno of type NUMBER(2), dname of type VARCHAR2(14), and loc of type VARCHAR2(13).',
        dAr: 'باستخدام أوامر لغة تعريف البيانات (DDL)، قم بإنشاء جدول باسم dept يحتوي على ثلاثة أعمدة: العمود deptno من نوع NUMBER(2)، والعمود dname من نوع VARCHAR2(14)، والعمود loc من نوع VARCHAR2(13).',
        tables: [],
        ref: 'CREATE TABLE dept (deptno NUMBER(2), dname VARCHAR2(14), loc VARCHAR2(13));',
        start: '-- Create the dept table: deptno NUMBER(2), dname VARCHAR2(14), loc VARCHAR2(13)\n',
        hints: [
          ['A table is created with CREATE TABLE table_name ( ... ) and the columns go inside the parentheses, separated by commas.', 'يُنشأ الجدول بالأمر CREATE TABLE table_name ( ... ) وتوضع الأعمدة بين القوسين مفصولة بفواصل.'],
          ['Each column is written as: column_name datatype. Oracle text columns use VARCHAR2(size) and numeric columns use NUMBER(precision).', 'يُكتب كل عمود بالشكل: اسم_العمود نوع_البيانات. تستخدم الأعمدة النصية في Oracle النوع VARCHAR2(size) والأعمدة الرقمية النوع NUMBER(precision).'],
          ['Follow this pattern for all three columns: deptno NUMBER(2), dname VARCHAR2(14), loc VARCHAR2(13). Check each size carefully.', 'اتبع هذا النمط للأعمدة الثلاثة: deptno NUMBER(2) و dname VARCHAR2(14) و loc VARCHAR2(13). تأكد من كل حجم بعناية.'],
        ],
      },
      {
        slug: 'lab4-alter-table', d: 'EASY', pts: 100,
        tEn: 'Altering Table Structure: Add, Modify & Drop', tAr: 'تعديل هيكل الجدول: إضافة، تعديل، وحذف الأعمدة',
        dEn: 'Practice using the ALTER TABLE statement on table dept80:\n1. Add a new column job_id of type VARCHAR2(9).\n2. Modify the existing column last_name to become VARCHAR2(30).\n3. Drop the column job_id from the table.',
        dAr: 'طبق أوامر تعديل الجداول ALTER TABLE على جدول dept80 بالترتيب التالي:\n1. أضف عموداً جديداً باسم job_id من نوع VARCHAR2(9).\n2. عدّل حجم العمود last_name ليصبح VARCHAR2(30).\n3. احذف العمود job_id نهائياً من الجدول.',
        tables: [DEPT80],
        setup: `CREATE TABLE dept80 (employee_id NUMBER(6), last_name VARCHAR2(25), annsal NUMBER(10,2), hire_date DATE);
INSERT INTO dept80 SELECT employee_id, last_name, salary * 12, hire_date FROM employees WHERE department_id = 30;`,
        ref: `ALTER TABLE dept80 ADD (job_id VARCHAR2(9));
ALTER TABLE dept80 MODIFY (last_name VARCHAR2(30));
ALTER TABLE dept80 DROP COLUMN job_id;`,
        start: '-- Table dept80 already exists. Add job_id, widen last_name, then drop job_id\n',
        hints: [
          ['ALTER TABLE changes an existing table. Each of the three steps is its own ALTER TABLE statement, separated by semicolons.', 'تغيّر ALTER TABLE جدولاً موجوداً. كل خطوة من الخطوات الثلاث هي جملة ALTER TABLE مستقلة، مفصولة بفواصل منقوطة.'],
          ["Use ADD (...) for a new column, MODIFY (...) to change an existing column's type or size, and DROP COLUMN to remove one.", 'استخدم ADD (...) لإضافة عمود جديد، و MODIFY (...) لتغيير نوع عمود موجود أو حجمه، و DROP COLUMN لحذف عمود.'],
          ['In order, after ALTER TABLE dept80: ADD (job_id VARCHAR2(9)), then MODIFY (last_name VARCHAR2(30)), then DROP COLUMN job_id.', 'بالترتيب، بعد ALTER TABLE dept80: ADD (job_id VARCHAR2(9)) ثم MODIFY (last_name VARCHAR2(30)) ثم DROP COLUMN job_id.'],
        ],
      },
      {
        slug: 'lab4-sequences', d: 'MEDIUM', pts: 150,
        tEn: 'Generating Primary Keys with Sequences', tAr: 'توليد المفاتيح الأساسية باستخدام المتسلسلات (Sequences)',
        dEn: "Create a sequence named id_seq that starts with 1, increments by 1, and has a maximum value of 2000. Then, use nextval to insert a new row into the dept table with the next sequence value, department name 'finance', and location 'cairo'.",
        dAr: "قم بإنشاء متسلسلة (Sequence) باسم id_seq تبدأ من الرقم 1 (START WITH 1)، وتزيد بمقدار 1 (INCREMENT BY 1)، وتصل لقيمة قصوى 2000 (MAXVALUE 2000). بعد ذلك، استخدم الكلمة المفتاحية nextval لإدراج صف جديد في جدول dept يحمل الرقم التلقائي الجديد، واسم القسم 'finance'، والموقع 'cairo'.",
        tables: [DEPT],
        setup: 'CREATE TABLE dept (deptno NUMBER(2), dname VARCHAR2(14), loc VARCHAR2(13));',
        ref: `CREATE SEQUENCE id_seq START WITH 1 INCREMENT BY 1 MAXVALUE 2000;
INSERT INTO dept VALUES (id_seq.nextval, 'finance', 'cairo');`,
        start: '-- 1) Create the id_seq sequence   2) Insert a row into dept using id_seq.nextval\n',
        hints: [
          ['A sequence is a database object that generates numbers automatically: CREATE SEQUENCE name START WITH n INCREMENT BY n MAXVALUE n.', 'المتسلسلة كائن في قاعدة البيانات يولّد أرقاماً تلقائياً: CREATE SEQUENCE name START WITH n INCREMENT BY n MAXVALUE n.'],
          ['You get the next number with sequence_name.NEXTVAL — you can use it directly inside VALUES.', 'تحصل على الرقم التالي بالصيغة sequence_name.NEXTVAL ويمكنك استخدامه مباشرة داخل VALUES.'],
          ["Create the sequence first, in the same script, then: INSERT INTO dept VALUES (id_seq.nextval, 'finance', 'cairo');", "أنشئ المتسلسلة أولاً في السكربت نفسه، ثم: INSERT INTO dept VALUES (id_seq.nextval, 'finance', 'cairo');"],
        ],
      },
      {
        slug: 'lab4-constraints-alter', d: 'MEDIUM', pts: 150,
        tEn: 'Managing Constraints with ALTER TABLE', tAr: 'إدارة القيود (Constraints) عبر تعديل الجدول',
        dEn: 'Modify the existing tables using ALTER TABLE to manage their constraints:\n1. Add a FOREIGN KEY constraint on the department_id column in the employees table that references departments(department_id).\n2. Drop the constraint named emp_manager_fk from the employees table.\n3. Drop the PRIMARY KEY on the departments table along with any associated foreign key constraints using CASCADE.',
        dAr: 'استخدم جملة ALTER TABLE لإدارة القيود على الجداول كالتالي:\n1. أضف قيد مفتاح أجنبي (FOREIGN KEY) على عمود department_id في جدول employees يشير إلى departments(department_id).\n2. احذف القيد المسمى emp_manager_fk من جدول employees.\n3. احذف قيد المفتاح الأساسي (PRIMARY KEY) من جدول departments مع حذف جميع المفاتيح الأجنبية المرتبطة به تلقائياً باستخدام CASCADE.',
        tables: [EMPLOYEES, DEPARTMENTS],
        setup: `INSERT INTO departments (department_id, department_name, manager_id, location_id) VALUES (30, 'Purchasing', NULL, 1700);
ALTER TABLE employees ADD CONSTRAINT emp_manager_fk FOREIGN KEY (manager_id) REFERENCES employees (employee_id);`,
        ref: `ALTER TABLE employees ADD FOREIGN KEY(department_id) REFERENCES departments(department_id);
ALTER TABLE employees DROP CONSTRAINT emp_manager_fk;
ALTER TABLE departments DROP PRIMARY KEY CASCADE;`,
        start: '-- 1) Add the foreign key   2) Drop emp_manager_fk   3) Drop the primary key of departments (CASCADE)\n',
        hints: [
          ['Each of the three steps is its own ALTER TABLE statement. Constraints are added with ADD and removed with DROP.', 'كل خطوة من الخطوات الثلاث هي جملة ALTER TABLE مستقلة. تُضاف القيود بـ ADD وتُحذف بـ DROP.'],
          ['A foreign key is added with ADD FOREIGN KEY (column) REFERENCES parent_table(parent_column); a named constraint is removed with DROP CONSTRAINT name.', 'يُضاف المفتاح الأجنبي بـ ADD FOREIGN KEY (column) REFERENCES parent_table(parent_column)، ويُحذف القيد المسمى بـ DROP CONSTRAINT name.'],
          ['To drop a primary key and everything that depends on it: ALTER TABLE departments DROP PRIMARY KEY CASCADE;', 'لحذف المفتاح الأساسي وكل ما يعتمد عليه: ALTER TABLE departments DROP PRIMARY KEY CASCADE;'],
        ],
      },
      {
        slug: 'lab4-constraints-create', d: 'HARD', pts: 200,
        tEn: 'Column & Table Level Constraints Mastery', tAr: 'إتقان قيود الجداول والأعمدة الشاملة',
        dEn: 'Create the employees table defining both column-level and table-level constraints: employee_id: NUMBER(6), last_name: VARCHAR2(25) with NOT NULL and UNIQUE, email: VARCHAR2(25), salary: NUMBER(8,2) with CHECK (salary > 0), hire_date: DATE with named constraint emp_hire_date_nn set to NOT NULL, department_id: NUMBER(4) referencing departments(department_id). Add two table-level constraints at the end: emp_email_uk as UNIQUE(email) and emp_id_pk as PRIMARY KEY(employee_id).',
        dAr: 'قم بإنشاء جدول employees مع تطبيق القيود على مستوى العمود وعلى مستوى الجدول معاً كالتالي: employee_id من نوع NUMBER(6)، و last_name من نوع VARCHAR2(25) يحمل قيدين NOT NULL و UNIQUE، و email من نوع VARCHAR2(25)، و salary من نوع NUMBER(8,2) مع قيد CHECK (salary > 0)، و hire_date من نوع DATE مع قيد مُسمى CONSTRAINT emp_hire_date_nn NOT NULL، و department_id من نوع NUMBER(4) يشير إلى REFERENCES departments(department_id). وفي نهاية الجدول أضف القيدين: emp_email_uk كـ UNIQUE(email)، و emp_id_pk كـ PRIMARY KEY (employee_id).',
        tables: [DEPARTMENTS],
        setup: `DROP TABLE employees CASCADE;
ALTER TABLE departments ALTER COLUMN department_id TYPE NUMERIC(4);`,
        ref: `CREATE TABLE employees (
    employee_id NUMBER(6),
    last_name VARCHAR2(25) NOT NULL UNIQUE,
    email VARCHAR2(25),
    salary NUMBER(8,2) CHECK (salary > 0),
    hire_date DATE CONSTRAINT emp_hire_date_nn NOT NULL,
    department_id NUMBER(4) REFERENCES departments(department_id),
    CONSTRAINT emp_email_uk UNIQUE(email),
    CONSTRAINT emp_id_pk PRIMARY KEY (employee_id)
);`,
        start: '-- Create the employees table with column-level and table-level constraints\n',
        hints: [
          ["Column-level constraints are written right after the column's data type; table-level constraints are listed at the end of the column list.", 'تُكتب قيود مستوى العمود مباشرة بعد نوع بيانات العمود، بينما تُدرج قيود مستوى الجدول في نهاية قائمة الأعمدة.'],
          ['Name a constraint with CONSTRAINT name ... . NOT NULL, UNIQUE and CHECK(...) can all go on the column itself; REFERENCES table(column) creates a foreign key.', 'سمِّ القيد باستخدام CONSTRAINT name ... . يمكن وضع NOT NULL و UNIQUE و CHECK(...) على العمود نفسه، وينشئ REFERENCES table(column) مفتاحاً أجنبياً.'],
          ['Finish with two table-level lines: CONSTRAINT emp_email_uk UNIQUE(email), CONSTRAINT emp_id_pk PRIMARY KEY (employee_id).', 'اختم بسطرين على مستوى الجدول: CONSTRAINT emp_email_uk UNIQUE(email) و CONSTRAINT emp_id_pk PRIMARY KEY (employee_id).'],
        ],
      },
      {
        slug: 'lab4-transaction-control', d: 'EXPERT', pts: 300,
        tEn: 'Transaction Control: SAVEPOINT, ROLLBACK & COMMIT', tAr: 'التحكم بالمعاملات: نقاط الحفظ والتراجع والتأكيد',
        dEn: "Manage a multi-step database transaction using TCL commands:\n1. Update the emp table to increase sal by 10% (sal = sal * 1.1) where job = 'CLERK'.\n2. Create a savepoint named update_done.\n3. Insert a new row into the region table with id = 8 and name = 'central'.\n4. Undo the region insertion while keeping the salary update by rolling back to the update_done savepoint.\n5. Explicitly save the remaining transaction changes permanently to the database.",
        dAr: "قم بإدارة معاملة (Transaction) مكونة من عدة خطوات باستخدام أوامر (TCL):\n1. حدّث جدول emp لزيادة الراتب بنسبة 10% (sal = sal * 1.1) للموظفين الذين وظيفتهم job = 'CLERK'.\n2. أنشئ نقطة حفظ (SAVEPOINT) باسم update_done.\n3. أدرج صفاً جديداً في جدول region بالقيم (8, 'central') للـ id والـ name.\n4. تراجع عن عملية الإدراج الأخيرة فقط مع الحفاظ على تعديل الرواتب بالتراجع إلى نقطة الحفظ update_done.\n5. احفظ التغييرات المتبقية بشكل دائم باستخدام أمر الحفظ الصريح.",
        tables: [EMP, REGION],
        setup: `CREATE TABLE emp (empno NUMBER(4), ename VARCHAR2(10), job VARCHAR2(9), sal NUMBER(7,2));
INSERT INTO emp VALUES (7369, 'SMITH', 'CLERK', 800), (7499, 'ALLEN', 'SALESMAN', 1600), (7521, 'WARD', 'SALESMAN', 1250),
  (7566, 'JONES', 'MANAGER', 2975), (7698, 'BLAKE', 'MANAGER', 2850), (7782, 'CLARK', 'MANAGER', 2450),
  (7788, 'SCOTT', 'ANALYST', 3000), (7839, 'KING', 'PRESIDENT', 5000), (7876, 'ADAMS', 'CLERK', 1100),
  (7900, 'JAMES', 'CLERK', 950), (7934, 'MILLER', 'CLERK', 1300);
CREATE TABLE region (id NUMBER(4), name VARCHAR2(25));
INSERT INTO region VALUES (1, 'north'), (2, 'south'), (3, 'east'), (4, 'west'), (5, 'northeast'), (6, 'southwest'), (7, 'coastal');`,
        ref: `UPDATE emp SET sal = sal * 1.1 WHERE job = 'CLERK';
SAVEPOINT update_done;
INSERT INTO region (id, name) VALUES (8, 'central');
ROLLBACK TO update_done;
COMMIT;`,
        start: '-- Tables emp and region already exist. Use UPDATE, SAVEPOINT, INSERT, ROLLBACK TO and COMMIT\n',
        hints: [
          ['A transaction groups statements together. SAVEPOINT name marks a point you can return to without undoing everything.', 'تجمع المعاملة عدة جمل معاً. تحدد SAVEPOINT name نقطة يمكنك العودة إليها دون التراجع عن كل شيء.'],
          ['ROLLBACK TO savepoint_name undoes only the changes made after that savepoint; COMMIT makes all remaining changes permanent.', 'يتراجع ROLLBACK TO savepoint_name عن التغييرات التي تمت بعد نقطة الحفظ فقط، بينما يجعل COMMIT كل التغييرات المتبقية دائمة.'],
          ['The order is: UPDATE → SAVEPOINT update_done → INSERT → ROLLBACK TO update_done → COMMIT.', 'الترتيب هو: UPDATE ثم SAVEPOINT update_done ثم INSERT ثم ROLLBACK TO update_done ثم COMMIT.'],
        ],
      },
    ],
  },
];

const ANNOUNCEMENT = {
  titleEn: 'Platform reset: please create a new account',
  titleAr: 'إعادة ضبط المنصة: يرجى إنشاء حساب جديد',
  contentEn:
    "We're sorry to tell you that a severe technical failure caused a complete reset of our database. As a result, all accounts, points and challenge progress were lost, and we were not able to recover them.\n\n" +
    "We sincerely apologize for this, and for the effort you put in that was lost with it.\n\n" +
    "To get back in, please create a new account — your old login will no longer work. Labs 1, 2, 3 and 4 are fully available again, and we'd love for you to re-solve the challenges.\n\n" +
    'Thank you for your patience and for being part of urlap.\n— The urlap Team',
  contentAr:
    'نأسف لإبلاغكم بأن عطلاً تقنياً جسيماً تسبّب في إعادة ضبط كاملة لقاعدة بيانات المنصة. ونتيجة لذلك فُقدت جميع الحسابات والنقاط وتقدّمكم في التحديات، ولم نتمكن من استعادتها.\n\n' +
    'نعتذر لكم بصدق عن ذلك، وعن الجهد الذي بذلتموه وضاع بسببه.\n\n' +
    'لمتابعة التعلّم، يرجى إنشاء حساب جديد، إذ لن يعمل تسجيل الدخول القديم. المعامل 1 و2 و3 و4 متاحة الآن بالكامل، ويسعدنا أن تعيدوا حلّ التحديات من جديد.\n\n' +
    'شكراً لصبركم ولكونكم جزءاً من urlap.\n— فريق urlap',
};

async function main() {
  for (let li = 0; li < LABS.length; li++) {
    const l = LABS[li];
    const lab = await prisma.lab.upsert({
      where: { slug: l.slug },
      update: { titleEn: l.en, titleAr: l.ar, orderIndex: li },
      create: { slug: l.slug, titleEn: l.en, titleAr: l.ar, orderIndex: li },
    });
    console.log(`📚 ${lab.titleEn}`);

    for (let ci = 0; ci < l.challenges.length; ci++) {
      const c = l.challenges[ci];
      const data = {
        titleEn: c.tEn, titleAr: c.tAr, descriptionEn: c.dEn, descriptionAr: c.dAr,
        difficulty: c.d, points: c.pts, orderIndex: ci, labId: lab.id,
        schemaJson: c.tables.length ? JSON.stringify({ tables: c.tables }) : null,
        referenceAnswer: c.ref, setupSql: c.setup ?? null,
      };
      const challenge = await prisma.challenge.upsert({ where: { slug: c.slug }, update: data, create: { slug: c.slug, ...data } });

      await prisma.starterCode.upsert({
        where: { challengeId_language: { challengeId: challenge.id, language: Language.SQL } },
        update: { code: c.start },
        create: { challengeId: challenge.id, language: Language.SQL, code: c.start },
      });
      for (let hi = 0; hi < c.hints.length; hi++) {
        const hint = { contentEn: c.hints[hi][0], contentAr: c.hints[hi][1], pointPenalty: (hi + 1) * 10 };
        await prisma.hint.upsert({
          where: { challengeId_order: { challengeId: challenge.id, order: hi + 1 } },
          update: hint,
          create: { challengeId: challenge.id, order: hi + 1, ...hint },
        });
      }
      console.log(`   ${ci + 1}. ${c.tEn} (${c.d})${ci === 5 ? '  ← hidden Master Challenge' : ''}`);
    }
  }

  const existing = await prisma.announcement.findFirst({ where: { titleEn: ANNOUNCEMENT.titleEn } });
  if (existing) await prisma.announcement.update({ where: { id: existing.id }, data: { ...ANNOUNCEMENT, type: 'INFO' } });
  else await prisma.announcement.create({ data: { ...ANNOUNCEMENT, type: 'INFO' } });
  console.log('📣 Announcement published.');
  console.log('✅ Seed complete: Labs 1-4.');
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());