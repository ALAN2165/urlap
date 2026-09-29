import type { PoolClient, QueryResult } from 'pg';
import { graderPool } from '../config/sqlGraderPool';

const FETCH_LIMIT = 1000;
const DISPLAY_LIMIT = 100;

const COMMENTS_OR_LITERALS = /('(?:[^']|'')*'|"(?:[^"]|"")*")|--[^\n]*|\/\*[\s\S]*?\*\//g;
const LITERALS = /'(?:[^']|'')*'|"(?:[^"]|"")*"/g;

// Statements that produce a result set we can DECLARE a cursor over. Everything
// else (DO blocks, CREATE FUNCTION, UPDATE, INSERT, DELETE, ALTER, ...) is now
// accepted and executed directly — Postgres itself decides what's actually
// allowed, via the READ ONLY transaction below and the locked-down
// urlap_grader role's privileges. There is no keyword blocklist anymore.
const ROW_RETURNING_LEADING_WORD = new Set(['select', 'with']);

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
  failureReason: 'COLUMNS' | 'ROW_COUNT' | 'ROWS' | 'NOT_ROW_RETURNING' | null;
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

function prepare(sql: string): string {
  return sql
    .replace(COMMENTS_OR_LITERALS, (_match, literal) => (literal !== undefined ? literal : ' '))
    .trim()
    .replace(/;+\s*$/, '')
    .trim();
}

function assertSingleStatement(prepared: string): void {
  if (!prepared) throw new Error('Write a query first.');
  const masked = prepared.replace(LITERALS, "''");
  if (masked.includes(';')) {
    throw new Error('Only a single SQL statement is allowed — remove any extra semicolons.');
  }
}

function leadingWord(sql: string): string {
  return sql.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
}
function isRowReturning(sql: string): boolean {
  return ROW_RETURNING_LEADING_WORD.has(leadingWord(sql));
}

function normalizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number') return Math.round(value * 1e9) / 1e9;
  return value;
}
const rowKey = (row: unknown[]) => JSON.stringify(row.map(normalizeValue));

async function runCursor(client: PoolClient, sql: string): Promise<QueryOutput> {
  await client.query(`DECLARE grader_cur NO SCROLL CURSOR FOR\n${sql}\n`);
  const res = await client.query({ text: `FETCH ${FETCH_LIMIT} FROM grader_cur`, rowMode: 'array' });
  await client.query('CLOSE grader_cur');
  return { columns: res.fields.map((f) => f.name), rows: res.rows as unknown[][] };
}

// For anything that isn't SELECT/WITH: run it directly and report what Postgres
// actually did. There's no row-by-row comparison for these yet — grading real
// DML/DDL challenges needs a separate mechanism (a writable per-attempt schema
// inspected before rollback), which doesn't exist yet since Labs 2+ have no
// content. For now, current Lab 1 challenges (all SELECT-based) will correctly
// mark a non-row-returning submission as wrong, with a clear reason why.
async function runDirect(client: PoolClient, sql: string): Promise<QueryResult> {
  return client.query(sql);
}

export async function runSqlGraded(referenceSql: string, submittedSql: string): Promise<GradeResult> {
  const start = Date.now();

  let submitted: string;
  try {
    submitted = prepare(submittedSql);
    assertSingleStatement(submitted);
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

    const submittedReturnsRows = isRowReturning(submitted);
    const referenceReturnsRows = isRowReturning(reference);

    let sub: QueryOutput | null = null;
    let directResult: QueryResult | null = null;

    try {
      if (submittedReturnsRows) {
        sub = await runCursor(client, submitted);
      } else {
        directResult = await runDirect(client, submitted);
      }
    } catch (dbErr: any) {
      await client.query('ROLLBACK').catch(() => undefined);
      return dbErr.code === '57014'
        ? emptyResult(start, 'TIME_LIMIT_EXCEEDED', 'Your query took too long to execute.')
        : emptyResult(start, 'RUNTIME_ERROR', dbErr.message);
    }

    if (!submittedReturnsRows) {
      await client.query('ROLLBACK');
      const tag = directResult?.command ?? 'STATEMENT';
      if (!referenceReturnsRows) {
        return {
          passed: true,
          status: 'ACCEPTED',
          output: `${tag} executed successfully (${directResult?.rowCount ?? 0} row(s) affected).`,
          errorMessage: '',
          runtimeMs: Date.now() - start,
          resultColumns: [],
          resultRows: [],
          totalRows: directResult?.rowCount ?? 0,
          expectedRowCount: null,
          failureReason: null,
        };
      }
      return {
        passed: false,
        status: 'WRONG_ANSWER',
        output: `${tag} executed, but this challenge expects a query that returns rows (like a SELECT).`,
        errorMessage: '',
        runtimeMs: Date.now() - start,
        resultColumns: [],
        resultRows: [],
        totalRows: 0,
        expectedRowCount: null,
        failureReason: 'NOT_ROW_RETURNING',
      };
    }

    let ref: QueryOutput;
    try {
      ref = referenceReturnsRows ? await runCursor(client, reference) : { columns: [], rows: [] };
    } catch (refErr) {
      await client.query('ROLLBACK').catch(() => undefined);
      console.error('Reference SQL failed to run:', refErr);
      return emptyResult(start, 'RUNTIME_ERROR', 'The reference solution for this challenge failed to run. Please report it.');
    }

    await client.query('ROLLBACK');

    const submittedRows = sub!;
    const sameColumns = JSON.stringify(submittedRows.columns) === JSON.stringify(ref.columns);
    const subKeys = submittedRows.rows.map(rowKey);
    const refKeys = ref.rows.map(rowKey);
    const orderMatters = /\border\s+by\b/i.test(reference);
    const sameRows = orderMatters
      ? JSON.stringify(subKeys) === JSON.stringify(refKeys)
      : JSON.stringify([...subKeys].sort()) === JSON.stringify([...refKeys].sort());

    let failureReason: GradeResult['failureReason'] = null;
    if (!sameColumns) failureReason = 'COLUMNS';
    else if (submittedRows.rows.length !== ref.rows.length) failureReason = 'ROW_COUNT';
    else if (!sameRows) failureReason = 'ROWS';

    const passed = failureReason === null;
    return {
      passed,
      status: passed ? 'ACCEPTED' : 'WRONG_ANSWER',
      output: passed ? `Correct: ${submittedRows.rows.length} row(s) match the expected result.` : `Wrong answer (${failureReason}).`,
      errorMessage: '',
      runtimeMs: Date.now() - start,
      resultColumns: submittedRows.columns,
      resultRows: submittedRows.rows.slice(0, DISPLAY_LIMIT),
      totalRows: submittedRows.rows.length,
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