import type { PoolClient } from 'pg';
import { graderPool } from '../config/sqlGraderPool';

const FETCH_LIMIT = 1000;   // hard cap on rows pulled into memory per query
const DISPLAY_LIMIT = 100;  // rows sent back to the browser

// The role permissions and the READ ONLY transaction are the real safety net;
// this list only produces a friendlier error message earlier.
const BLOCKED_KEYWORDS =
  /\b(insert|update|delete|drop|alter|truncate|grant|revoke|create|copy|vacuum|call|do|set_config|listen|notify|lock)\b/i;

const COMMENTS_OR_LITERALS = /('(?:[^']|'')*'|"(?:[^"]|"")*")|--[^\n]*|\/\*[\s\S]*?\*\//g;
const LITERALS = /'(?:[^']|'')*'|"(?:[^"]|"")*"/g;

export interface GradeResult {
  passed: boolean;
  status: 'ACCEPTED' | 'WRONG_ANSWER' | 'RUNTIME_ERROR' | 'TIME_LIMIT_EXCEEDED';
  output: string;
  errorMessage: string;
  runtimeMs: number;
  resultColumns: string[];
  resultRows: unknown[][];
  totalRows: number;
  expectedRowCount: number | null;
  failureReason: 'COLUMNS' | 'ROW_COUNT' | 'ROWS' | null;
}

interface QueryOutput {
  columns: string[];
  rows: unknown[][];
}

function emptyResult(start: number, status: GradeResult['status'], errorMessage: string): GradeResult {
  return {
    passed: false,
    status,
    output: '',
    errorMessage,
    runtimeMs: Date.now() - start,
    resultColumns: [],
    resultRows: [],
    totalRows: 0,
    expectedRowCount: null,
    failureReason: null,
  };
}

// Removes -- and /* */ comments (keeping string literals intact) plus a trailing semicolon.
function prepare(sql: string): string {
  return sql
    .replace(COMMENTS_OR_LITERALS, (_match, literal) => (literal !== undefined ? literal : ' '))
    .trim()
    .replace(/;+\s*$/, '')
    .trim();
}

function assertReadOnlySelect(prepared: string): void {
  if (!prepared) throw new Error('Write a query first.');
  const masked = prepared.replace(LITERALS, "''");
  if (masked.includes(';')) throw new Error('Only a single SQL statement is allowed.');
  const firstWord = masked.trim().split(/\s+/)[0]?.toLowerCase();
  if (firstWord !== 'select' && firstWord !== 'with') {
    throw new Error('Only SELECT queries (or WITH … SELECT) are allowed.');
  }
  if (BLOCKED_KEYWORDS.test(masked)) {
    throw new Error('This query uses a keyword that is not allowed. Only read-only SELECT queries can be run.');
  }
}

function normalizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number') return Math.round(value * 1e9) / 1e9;
  return value;
}
const rowKey = (row: unknown[]) => JSON.stringify(row.map(normalizeValue));

// A cursor lets us pull at most FETCH_LIMIT rows, so a runaway query
// (e.g. generate_series) can never flood the server's memory.
async function runCursor(client: PoolClient, sql: string): Promise<QueryOutput> {
  await client.query(`DECLARE grader_cur NO SCROLL CURSOR FOR\n${sql}\n`);
  const res = await client.query({ text: `FETCH ${FETCH_LIMIT} FROM grader_cur`, rowMode: 'array' });
  await client.query('CLOSE grader_cur');
  return { columns: res.fields.map((f) => f.name), rows: res.rows as unknown[][] };
}

export async function runSqlGraded(referenceSql: string, submittedSql: string): Promise<GradeResult> {
  const start = Date.now();

  let submitted: string;
  try {
    submitted = prepare(submittedSql);
    assertReadOnlySelect(submitted);
  } catch (validationErr: any) {
    return emptyResult(start, 'RUNTIME_ERROR', validationErr.message);
  }
  const reference = prepare(referenceSql);

  const acquired = await graderPool.connect().catch((e: Error) => e);
  if (acquired instanceof Error) {
    return emptyResult(start, 'RUNTIME_ERROR', `Could not connect to the SQL grading database: ${acquired.message}`);
  }
  const client = acquired;

  try {
    await client.query('BEGIN READ ONLY');
    await client.query("SET LOCAL statement_timeout = '3000ms'");

    let sub: QueryOutput;
    try {
      sub = await runCursor(client, submitted);
    } catch (dbErr: any) {
      await client.query('ROLLBACK').catch(() => undefined);
      return dbErr.code === '57014'
        ? emptyResult(start, 'TIME_LIMIT_EXCEEDED', 'Your query took too long to execute.')
        : emptyResult(start, 'RUNTIME_ERROR', dbErr.message);
    }

    let ref: QueryOutput;
    try {
      ref = await runCursor(client, reference);
    } catch (refErr) {
      await client.query('ROLLBACK').catch(() => undefined);
      console.error('Reference SQL failed to run:', refErr);
      return emptyResult(start, 'RUNTIME_ERROR', 'The reference solution for this challenge failed to run. Please report it.');
    }

    await client.query('ROLLBACK');

    const sameColumns = JSON.stringify(sub.columns) === JSON.stringify(ref.columns);
    const subKeys = sub.rows.map(rowKey);
    const refKeys = ref.rows.map(rowKey);
    const orderMatters = /\border\s+by\b/i.test(reference);
    const sameRows = orderMatters
      ? JSON.stringify(subKeys) === JSON.stringify(refKeys)
      : JSON.stringify([...subKeys].sort()) === JSON.stringify([...refKeys].sort());

    let failureReason: GradeResult['failureReason'] = null;
    if (!sameColumns) failureReason = 'COLUMNS';
    else if (sub.rows.length !== ref.rows.length) failureReason = 'ROW_COUNT';
    else if (!sameRows) failureReason = 'ROWS';

    const passed = failureReason === null;
    return {
      passed,
      status: passed ? 'ACCEPTED' : 'WRONG_ANSWER',
      output: passed ? `Correct: ${sub.rows.length} row(s) match the expected result.` : `Wrong answer (${failureReason}).`,
      errorMessage: '',
      runtimeMs: Date.now() - start,
      resultColumns: sub.columns,
      resultRows: sub.rows.slice(0, DISPLAY_LIMIT),
      totalRows: sub.rows.length,
      expectedRowCount: ref.rows.length,
      failureReason,
    };
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => undefined);
    return emptyResult(start, err.code === '57014' ? 'TIME_LIMIT_EXCEEDED' : 'RUNTIME_ERROR', err.message);
  } finally {
    client.release();
  }
}