import { Pool, types } from 'pg';

// DATE -> plain 'YYYY-MM-DD' text. By default node-postgres builds a JS Date in the
// server's local timezone, which shifts the calendar day once it is serialised to UTC.
types.setTypeParser(types.builtins.DATE, (value: string) => value);
// NUMERIC -> JS number (the default is a string), so results show 0.2 rather than "0.20".
types.setTypeParser(types.builtins.NUMERIC, (value: string) => parseFloat(value));

function extractHostPortDb(databaseUrl: string) {
  const url = new URL(databaseUrl);
  return {
    host: url.hostname,
    port: url.port ? parseInt(url.port, 10) : 5432,
    database: url.pathname.replace(/^\//, ''),
  };
}

const { host, port, database } = extractHostPortDb(process.env.DATABASE_URL || '');

export const graderPool = new Pool({
  host,
  port,
  database,
  user: 'urlap_grader',
  password: process.env.SQL_GRADER_PASSWORD,
  max: 5,
  // Without this, pool.connect() waits forever when Postgres is unreachable,
  // which is one way a submission can hang.
  connectionTimeoutMillis: 4000,
  statement_timeout: 5000,
  query_timeout: 8000,
});