import 'dotenv/config';
import { Pool } from 'pg';

const GRADER_PASSWORD = process.env.SQL_GRADER_PASSWORD || 'urlap_grader_pw_change_me';

async function main() {
  const admin = new Pool({ connectionString: process.env.DATABASE_URL });
  const dbName = new URL(process.env.DATABASE_URL || '').pathname.replace('/', '');

  console.log('🔧 Setting up SQL playground schema, role, and grants...');

  await admin.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'urlap_grader') THEN
        CREATE ROLE urlap_grader LOGIN PASSWORD '${GRADER_PASSWORD}';
      ELSE
        ALTER ROLE urlap_grader WITH LOGIN PASSWORD '${GRADER_PASSWORD}';
      END IF;
    END
    $$;
  `);

  await admin.query(`CREATE SCHEMA IF NOT EXISTS playground;`);
  await admin.query(`DROP TABLE IF EXISTS playground.employees;`);
  await admin.query(`DROP TABLE IF EXISTS playground.departments;`);

  await admin.query(`
    CREATE TABLE playground.employees (
      employee_id     INTEGER PRIMARY KEY,
      last_name       VARCHAR(50) NOT NULL,
      job_id          VARCHAR(20) NOT NULL,
      salary          INTEGER NOT NULL,
      hire_date       DATE NOT NULL,
      commission_pct  NUMERIC(3,2),
      manager_id      INTEGER,
      department_id   INTEGER
    );
  `);

  await admin.query(`
    CREATE TABLE playground.departments (
      department_id    INTEGER PRIMARY KEY,
      department_name VARCHAR(30) NOT NULL,
      manager_id       INTEGER,
      location_id      INTEGER
    );
  `);

  await admin.query(`REVOKE ALL ON SCHEMA public FROM urlap_grader;`);
  await admin.query(`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM urlap_grader;`);
  await admin.query(`GRANT USAGE ON SCHEMA playground TO urlap_grader;`);

  // READ-ONLY on the real tables, on purpose. Every grading run copies these tables into
  // private TEMP tables and executes the student's SQL against the copies, so INSERT / UPDATE /
  // DELETE can never touch the real data, even if a transaction were somehow committed.
  await admin.query(`GRANT SELECT ON ALL TABLES IN SCHEMA playground TO urlap_grader;`);
  await admin.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA playground GRANT SELECT ON TABLES TO urlap_grader;`);

  await admin.query(`ALTER ROLE urlap_grader SET search_path = playground;`);
  await admin.query(`ALTER ROLE urlap_grader SET statement_timeout = '8000';`);
  await admin.query(`REVOKE CREATE ON SCHEMA public FROM PUBLIC;`);
  await admin.query(`GRANT TEMP ON DATABASE "${dbName}" TO urlap_grader;`);
  await admin.query(`GRANT CREATE ON SCHEMA playground TO urlap_grader;`);
  try {
    await admin.query(`GRANT USAGE ON LANGUAGE plpgsql TO urlap_grader;`);
  } catch (err) {
    console.warn('  (non-fatal) could not grant plpgsql usage:', (err as Error).message);
  }
  try {
    await admin.query(`ALTER ROLE urlap_grader SET temp_file_limit = '64MB';`);
  } catch (err) {
    console.warn('  (non-fatal) could not set temp_file_limit (needs superuser):', (err as Error).message);
  }

  console.log('🧩 Installing SQL compatibility helper functions (NVL, NVL2, DECODE, date/string helpers)...');

  await admin.query(`DROP FUNCTION IF EXISTS playground.nvl(anyelement, anyelement);`);
  await admin.query(`DROP FUNCTION IF EXISTS playground.nvl2(anyelement, anyelement, anyelement);`);

  await admin.query(`CREATE OR REPLACE FUNCTION playground.nvl(text, text) RETURNS text AS $$ SELECT COALESCE($1, $2); $$ LANGUAGE sql IMMUTABLE;`);
  await admin.query(`CREATE OR REPLACE FUNCTION playground.nvl(integer, integer) RETURNS integer AS $$ SELECT COALESCE($1, $2); $$ LANGUAGE sql IMMUTABLE;`);
  await admin.query(`CREATE OR REPLACE FUNCTION playground.nvl(bigint, bigint) RETURNS bigint AS $$ SELECT COALESCE($1, $2); $$ LANGUAGE sql IMMUTABLE;`);
  await admin.query(`CREATE OR REPLACE FUNCTION playground.nvl(numeric, numeric) RETURNS numeric AS $$ SELECT COALESCE($1, $2); $$ LANGUAGE sql IMMUTABLE;`);
  await admin.query(`CREATE OR REPLACE FUNCTION playground.nvl(date, date) RETURNS date AS $$ SELECT COALESCE($1, $2); $$ LANGUAGE sql IMMUTABLE;`);
  await admin.query(`CREATE OR REPLACE FUNCTION playground.nvl(timestamp, timestamp) RETURNS timestamp AS $$ SELECT COALESCE($1, $2); $$ LANGUAGE sql IMMUTABLE;`);
  await admin.query(`CREATE OR REPLACE FUNCTION playground.nvl(boolean, boolean) RETURNS boolean AS $$ SELECT COALESCE($1, $2); $$ LANGUAGE sql IMMUTABLE;`);

  await admin.query(`CREATE OR REPLACE FUNCTION playground.nvl2(anyelement, text, text) RETURNS text AS $$ SELECT CASE WHEN $1 IS NOT NULL THEN $2 ELSE $3 END; $$ LANGUAGE sql IMMUTABLE;`);
  await admin.query(`CREATE OR REPLACE FUNCTION playground.nvl2(anyelement, integer, integer) RETURNS integer AS $$ SELECT CASE WHEN $1 IS NOT NULL THEN $2 ELSE $3 END; $$ LANGUAGE sql IMMUTABLE;`);
  await admin.query(`CREATE OR REPLACE FUNCTION playground.nvl2(anyelement, numeric, numeric) RETURNS numeric AS $$ SELECT CASE WHEN $1 IS NOT NULL THEN $2 ELSE $3 END; $$ LANGUAGE sql IMMUTABLE;`);

  await admin.query(`
    CREATE OR REPLACE FUNCTION playground.decode(VARIADIC args anyarray)
    RETURNS anyelement AS $$
    DECLARE
      i integer := 2;
      n integer := array_length(args, 1);
    BEGIN
      WHILE i < n LOOP
        IF args[1] IS NOT DISTINCT FROM args[i] THEN
          RETURN args[i + 1];
        END IF;
        i := i + 2;
      END LOOP;
      IF i = n THEN
        RETURN args[n];
      END IF;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql IMMUTABLE;
  `);

  await admin.query(`CREATE OR REPLACE FUNCTION playground.add_months(date, integer) RETURNS date AS $$ SELECT ($1 + ($2 || ' months')::interval)::date; $$ LANGUAGE sql IMMUTABLE;`);
  await admin.query(`CREATE OR REPLACE FUNCTION playground.months_between(date, date) RETURNS numeric AS $$ SELECT (EXTRACT(YEAR FROM age($1, $2)) * 12 + EXTRACT(MONTH FROM age($1, $2)))::numeric; $$ LANGUAGE sql IMMUTABLE;`);
  await admin.query(`CREATE OR REPLACE FUNCTION playground.trunc(timestamp) RETURNS date AS $$ SELECT $1::date; $$ LANGUAGE sql IMMUTABLE;`);
  await admin.query(`CREATE OR REPLACE FUNCTION playground.instr(text, text) RETURNS integer AS $$ SELECT POSITION($2 IN $1); $$ LANGUAGE sql IMMUTABLE;`);
  await admin.query(`CREATE OR REPLACE FUNCTION playground.instr(text, text, integer) RETURNS integer AS $$ SELECT CASE WHEN POSITION($2 IN SUBSTRING($1 FROM $3)) = 0 THEN 0 ELSE POSITION($2 IN SUBSTRING($1 FROM $3)) + $3 - 1 END; $$ LANGUAGE sql IMMUTABLE;`);

  await admin.query(`GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA playground TO urlap_grader;`);
  await admin.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA playground GRANT EXECUTE ON FUNCTIONS TO urlap_grader;`);

  console.log('🌱 Inserting dummy rows...');

  await admin.query(`
    INSERT INTO playground.employees
      (employee_id, last_name, job_id, salary, hire_date, commission_pct, manager_id, department_id)
    VALUES
      (100, 'Whitmore',  'PRESIDENT', 30000, '2015-01-10', NULL, NULL, 10),
      (101, 'Harrington','FI_MGR',    17000, '2016-03-22', NULL, 100, 20),
      (102, 'Castellano','FI_MGR',    16500, '2017-05-14', NULL, 100, 20),
      (103, 'Beckman',   'HR_REP',     8500, '2018-02-01', NULL, 100, 10),
      (104, 'Patterson', 'HR_REP',     9000, '2019-06-01', NULL, 100, 10),
      (105, 'Delgado',   'SA_MAN',    17000, '2016-09-09', NULL, 100, 30),
      (106, 'Nakamura',  'SA_MAN',    16800, '2017-11-30', NULL, 100, 30),
      (107, 'Vargas',    'SA_REP',     8000, '2021-03-10', 0.10, 105, 30),
      (108, 'Alvarado',  'SA_REP',     7000, '2020-11-05', 0.15, 105, 30),
      (109, 'Ellison',   'SA_REP',     7500, '2021-08-19', 0.10, 105, 30),
      (110, 'Dominguez', 'SA_REP',     7200, '2022-02-14', 0.20, 105, 30),
      (111, 'Whitfield', 'SA_REP',     6900, '2020-05-25', 0.20, 105, 30),
      (112, 'Ramirez',   'ST_CLERK',   6000, '2022-07-19', NULL, 106, 40),
      (113, 'Casillas',  'ST_CLERK',   5500, '2023-01-15', NULL, 106, 40),
      (114, 'Fitch',     'ST_CLERK',   4500, '2019-04-08', NULL, 106, 40),
      (115, 'Okafor',    'ST_CLERK',   5800, '2021-12-01', NULL, 106, 40),
      (116, 'Grayson',   'ST_CLERK',   6200, '2020-10-10', NULL, 106, 40),
      (117, 'Chen',      'IT_PROG',    6500, '2018-07-23', NULL, 100, 50),
      (118, 'Petrova',   'IT_PROG',    9500, '2019-09-09', NULL, 100, 50),
      (119, 'Ibarra',    'PU_CLERK',   5200, '2021-06-17', NULL, 103, 60),
      (120, 'Nolen',     'PU_CLERK',   4800, '2020-03-03', NULL, 103, 60),
      (121, 'Alaoui',    'ST_CLERK',   5900, '2019-11-11', NULL, 106, 40),
      (122, 'Kowalski',  'SA_REP',     8200, '2022-09-01', 0.20, 105, 30),
      (123, 'Sandoval',  'SA_REP',     6800, '2018-08-08', NULL, 105, 30),
      (124, 'Bautista',  'HR_REP',     7800, '2022-04-04', NULL, 100, 10),
      (125, 'Fenn',      'SA_REP',     9900, '2017-02-20', 0.05, 105, 30),
      (126, 'Higgins',   'FI_MGR',    15000, '2015-06-15', NULL, 100, 20),
      (141, 'Rajs',      'ST_CLERK',   3500, '2018-04-17', NULL, 106, 40),
      (143, 'Matos',     'ST_CLERK',   2600, '2021-03-15', NULL, 106, 40);
  `);

  // Department 30 is intentionally absent: Lab 3 Challenge 1 inserts it.
  // Departments 70 and 80 intentionally have no employees: Lab 3 Challenge 6 (outer join) needs them.
  await admin.query(`
    INSERT INTO playground.departments (department_id, department_name, manager_id, location_id)
    VALUES
      (10, 'Administration',  100, 1700),
      (20, 'Finance',         101, 1700),
      (40, 'Shipping',        106, 1500),
      (50, 'IT',              118, 1400),
      (60, 'Supply Chain',    119, 1700),
      (70, 'Public Relations', NULL, 2700),
      (80, 'Marketing',        NULL, 1800);
  `);

  console.log('✅ SQL playground ready: 29 employees, 7 departments, read-only grants, compatibility functions.');
  await admin.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});