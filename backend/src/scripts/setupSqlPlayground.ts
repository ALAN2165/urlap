import 'dotenv/config';
import { Pool } from 'pg';

const GRADER_PASSWORD = process.env.SQL_GRADER_PASSWORD || 'urlap_grader_pw_change_me';

async function main() {
  const admin = new Pool({ connectionString: process.env.DATABASE_URL });

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

  // The grader role can never touch the app's own tables (users, submissions, ...).
  await admin.query(`REVOKE ALL ON SCHEMA public FROM urlap_grader;`);
  await admin.query(`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM urlap_grader;`);
  await admin.query(`GRANT USAGE ON SCHEMA playground TO urlap_grader;`);
  await admin.query(`GRANT SELECT ON ALL TABLES IN SCHEMA playground TO urlap_grader;`);
  await admin.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA playground GRANT SELECT ON TABLES TO urlap_grader;`);
  await admin.query(`ALTER ROLE urlap_grader SET search_path = playground;`);
  await admin.query(`ALTER ROLE urlap_grader SET statement_timeout = '3000';`);

  console.log('🌱 Inserting dummy employee rows...');

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
      (125, 'Fenn',      'SA_REP',     9900, '2017-02-20', 0.05, 105, 30);
  `);

  console.log('✅ SQL playground ready: schema, table, role, grants, and 26 rows.');
  await admin.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});