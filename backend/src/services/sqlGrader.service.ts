import type { PoolClient, QueryResult } from 'pg';
import { graderPool } from '../config/sqlGraderPool';

const FETCH_LIMIT = 1000;
const DISPLAY_LIMIT = 100;
const STATEMENT_TIMEOUT_MS = 8000; // generous enough for loops/PL-pgSQL, still bounded

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
    passed: false, status, output: '', errorMessage, runtimeMs: Date.now() - start,
    resultColumns: [], resultRows: [], totalRows: 0, expectedRowCount: null, failureReason: null,
  };
}

/**
 * Splits a SQL script into top-level statements. Unlike a naive split on ';',
 * this correctly treats semicolons INSIDE single/double-quoted strings and
 * dollar-quoted blocks ($$ ... $$ or $tag$ ... $tag$ — how PL/pgSQL function,
 * procedure, and DO-block bodies are written) as part of the surrounding
 * statement, not as separators. Without this, a single `DO $$ BEGIN ... END $$;`
 * block — which legitimately contains many internal semicolons — was being
 * rejected as "multiple statements", which is why PL/pgSQL submissions failed.
 */
function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let i = 0;
  const n = sql.length;

  while (i < n) {
    const ch = sql[i];

    if (ch === '-' && sql[i + 1] === '-') {
      const nl = sql.indexOf('\n', i);
      const stop = nl === -1 ? n : nl;
      current += sql.slice(i, stop);
      i = stop;
      continue;
    }

    if (ch === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      current += sql.slice(i, stop);
      i = stop;
      continue;
    }

    if (ch === "'") {
      let j = i + 1;
      while (j < n) {
        if (sql[j] === "'" && sql[j + 1] === "'") { j += 2; continue; }
        if (sql[j] === "'") { j += 1; break; }
        j += 1;
      }
      current += sql.slice(i, j);
      i = j;
      continue;
    }

    if (ch === '"') {
      let j = i + 1;
      while (j < n) {
        if (sql[j] === '"' && sql[j + 1] === '"') { j += 2; continue; }
        if (sql[j] === '"') { j += 1; break; }
        j += 1;
      }
      current += sql.slice(i, j);
      i = j;
      continue;
    }

    if (ch === '$') {
      const tagMatch = /^\$([A-Za-z0-9_]*)\$/.exec(sql.slice(i));
      if (tagMatch) {
        const tag = tagMatch[0];
        const closeIdx = sql.indexOf(tag, i + tag.length);
        const stop = closeIdx === -1 ? n : closeIdx + tag.length;
        current += sql.slice(i, stop);
        i = stop;
        continue;
      }
    }

    if (ch === ';') {
      statements.push(current);
      current = '';
      i += 1;
      continue;
    }

    current += ch;
    i += 1;
  }

  if (current.trim().length > 0) statements.push(current);
  return statements.map((s) => s.trim()).filter(Boolean);
}

function stripLeadingCommentsAndWhitespace(sql: string): string {
  let s = sql;
  for (let guard = 0; guard < 50; guard++) {
    const trimmed = s.replace(/^\s+/, '');
    if (trimmed.startsWith('--')) {
      const nl = trimmed.indexOf('\n');
      s = nl === -1 ? '' : trimmed.slice(nl + 1);
      continue;
    }
    if (trimmed.startsWith('/*')) {
      const end = trimmed.indexOf('*/');
      s = end === -1 ? '' : trimmed.slice(end + 2);
      continue;
    }
    return trimmed;
  }
  return s;
}

function isRowReturning(sql: string): boolean {
  const word = stripLeadingCommentsAndWhitespace(sql).split(/\s+/)[0]?.toLowerCase() ?? '';
  return word === 'select' || word === 'with';
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

/** Runs the reference answer in its own throwaway READ ONLY transaction,
 *  always rolled back — kept completely separate from the submission's
 *  transaction so a submission's side effects (now possible, see below)
 *  can never contaminate what the reference query sees. */
async function runReference(client: PoolClient, referenceSql: string): Promise<QueryOutput> {
  await client.query('BEGIN READ ONLY');
  await client.query(`SET LOCAL statement_timeout = '${STATEMENT_TIMEOUT_MS}ms'`);
  try {
    const result = isRowReturning(referenceSql)
      ? await runCursor(client, referenceSql)
      : { columns: [], rows: [] };
    await client.query('ROLLBACK');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  }
}

/** Runs every top-level statement in the submission, in order, inside ONE
 *  transaction that is always rolled back — so CREATE FUNCTION, a DO block,
 *  or even an UPDATE can really execute (letting procedures/loops actually
 *  run), while guaranteeing nothing is ever persisted and nothing leaks
 *  into anyone else's attempt. This transaction is deliberately NOT read-only
 *  (unlike the reference phase) — that relaxation is what makes
 *  procedures/functions/loops work at all. Safety instead comes from:
 *  always-rollback, a grading role with zero access to the app's own tables,
 *  CREATE privilege scoped to the throwaway `playground` schema only, and
 *  the statement timeout below (which still applies inside loops/DO blocks). */
async function runSubmission(client: PoolClient, statements: string[]): Promise<{ result: QueryOutput | null }> {
  await client.query('BEGIN');
  await client.query(`SET LOCAL statement_timeout = '${STATEMENT_TIMEOUT_MS}ms'`);

  try {
    let result: QueryOutput | null = null;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const isLast = i === statements.length - 1;

      if (isLast && isRowReturning(stmt)) {
        result = await runCursor(client, stmt);
      } else {
        await client.query(stmt);
      }
    }

    await client.query('ROLLBACK');
    return { result };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  }
}

export async function runSqlGraded(referenceSql: string, submittedSql: string): Promise<GradeResult> {
  const start = Date.now();

  const statements = splitStatements(submittedSql);
  if (statements.length === 0) {
    return emptyResult(start, 'RUNTIME_ERROR', 'Write a query first.');
  }

  const acquired = await graderPool.connect().catch((e: Error) => e);
  if (acquired instanceof Error) {
    return emptyResult(start, 'RUNTIME_ERROR', `Could not connect to the SQL grading database: ${acquired.message}`);
  }
  const client = acquired;

  try {
    let ref: QueryOutput;
    try {
      ref = await runReference(client, referenceSql);
    } catch (refErr) {
      console.error('Reference SQL failed to run:', refErr);
      return emptyResult(start, 'RUNTIME_ERROR', 'The reference solution for this challenge failed to run. Please report it.');
    }

    let submitted: { result: QueryOutput | null };
    try {
      submitted = await runSubmission(client, statements);
    } catch (dbErr: any) {
      return dbErr.code === '57014'
        ? emptyResult(start, 'TIME_LIMIT_EXCEEDED', 'Your query took too long to execute.')
        : emptyResult(start, 'RUNTIME_ERROR', dbErr.message);
    }

    const referenceReturnsRows = isRowReturning(referenceSql);

    if (!submitted.result) {
      if (!referenceReturnsRows) {
        return {
          passed: true, status: 'ACCEPTED',
          output: 'Statement(s) executed successfully.',
          errorMessage: '', runtimeMs: Date.now() - start,
          resultColumns: [], resultRows: [], totalRows: 0, expectedRowCount: null, failureReason: null,
        };
      }
      return {
        passed: false, status: 'WRONG_ANSWER',
        output: "Your script executed, but its final statement didn't return any rows — this challenge expects the last statement to be a query (like SELECT) that returns data.",
        errorMessage: '', runtimeMs: Date.now() - start,
        resultColumns: [], resultRows: [], totalRows: 0, expectedRowCount: null, failureReason: 'NOT_ROW_RETURNING',
      };
    }

    const sameColumns = JSON.stringify(submitted.result.columns) === JSON.stringify(ref.columns);
    const subKeys = submitted.result.rows.map(rowKey);
    const refKeys = ref.rows.map(rowKey);
    const orderMatters = /\border\s+by\b/i.test(referenceSql);
    const sameRows = orderMatters
      ? JSON.stringify(subKeys) === JSON.stringify(refKeys)
      : JSON.stringify([...subKeys].sort()) === JSON.stringify([...refKeys].sort());

    let failureReason: GradeResult['failureReason'] = null;
    if (!sameColumns) failureReason = 'COLUMNS';
    else if (submitted.result.rows.length !== ref.rows.length) failureReason = 'ROW_COUNT';
    else if (!sameRows) failureReason = 'ROWS';

    const passed = failureReason === null;
    return {
      passed,
      status: passed ? 'ACCEPTED' : 'WRONG_ANSWER',
      output: passed ? `Correct: ${submitted.result.rows.length} row(s) match the expected result.` : `Wrong answer (${failureReason}).`,
      errorMessage: '',
      runtimeMs: Date.now() - start,
      resultColumns: submitted.result.columns,
      resultRows: submitted.result.rows.slice(0, DISPLAY_LIMIT),
      totalRows: submitted.result.rows.length,
      expectedRowCount: ref.rows.length,
      failureReason,
    };
  } catch (err: any) {
    return emptyResult(start, err.code === '57014' ? 'TIME_LIMIT_EXCEEDED' : 'RUNTIME_ERROR', err.message);
  } finally {
    client.release();
  }
}