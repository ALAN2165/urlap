import { Pool, types } from 'pg';

types.setTypeParser(types.builtins.DATE, (value: string) => value);
types.setTypeParser(types.builtins.NUMERIC, (value: string) => parseFloat(value));

// بناء رابط اتصال آمن ومباشر لمستخدم التصحيح
const connectionString = process.env.DATABASE_URL || '';

export const graderPool = new Pool({
  connectionString,
  user: 'urlap_grader',
  password: process.env.SQL_GRADER_PASSWORD,
  max: 5,
  connectionTimeoutMillis: 4000,
  statement_timeout: 9000,
  query_timeout: 10000,
});