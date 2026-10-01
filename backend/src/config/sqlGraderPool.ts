import { Pool, types } from 'pg';

types.setTypeParser(types.builtins.DATE, (value: string) => value);
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
  connectionTimeoutMillis: 4000, // fail fast on bad creds/unreachable host, instead of hanging
  statement_timeout: 9000,
  query_timeout: 10000,
});