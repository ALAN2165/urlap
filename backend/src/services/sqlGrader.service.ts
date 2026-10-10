import type { PoolClient, QueryResult } from 'pg';
import { graderPool } from '../config/sqlGraderPool';
import { friendlyPgError } from '../utils/friendlyError';

const FETCH_LIMIT = 1000;
const DISPLAY_LIMIT = 100;
const STATEMENT_TIMEOUT_MS = 8000;

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

interface QueryOutput { columns: string[]; rows: unknown[][]; }

function emptyResult(start: number, status: GradeResult['status'], errorMessage: string): GradeResult {
  return { passed: false, status, output: '', errorMessage, runtimeMs: Date.now() - start, resultColumns: [], resultRows: [], totalRows: 0, expectedRowCount: null, failureReason: null };
}

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
    if (ch === ';') { statements.push(current); current = ''; i += 1; continue; }
    current += ch;
    i += 1;
  }
  if (current.trim().length > 0) statements.push(current);
  return statements.map((s) => s.trim()).filter(Boolean);
}

function applyCompatibilityRewrites(sql: string): string {
  let out = '';
  let i = 0;
  const n = sql.length;

  while (i < n) {
    const ch = sql[i];
    if (ch === '-' && sql[i + 1] === '-') {
      const nl = sql.indexOf('\n', i);
      const stop = nl === -1 ? n : nl;
      out += sql.slice(i, stop);
      i = stop;
      continue;
    }
    if (ch === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      out += sql.slice(i, stop);
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
      out += sql.slice(i, j);
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
      out += sql.slice(i, j);
      i = j;
      continue;
    }
    if (ch === '$') {
      const tagMatch = /^\$([A-Za-z0-9_]*)\$/.exec(sql.slice(i));
      if (tagMatch) {
        const tag = tagMatch[0];
        const closeIdx = sql.indexOf(tag, i + tag.length);
        const stop = closeIdx === -1 ? n : closeIdx + tag.length;
        out += sql.slice(i, stop);
        i = stop;
        continue;
      }
    }
    const rest = sql.slice(i);
    const match = /^SYSDATE\b/i.exec(rest);
    if (match) {
      const after = sql[i + match[0].length];
      if (after !== '(') { out += 'CURRENT_DATE'; i += match[0].length; continue; }
    }
    out += ch;
    i += 1;
  }
  return out;
}

function stripLeadingCommentsAndWhitespace(sql: string): string {
  let s = sql;
  for (let guard = 0; guard < 50; guard++) {
    const trimmed = s.replace(/^\s+/, '');
    if (trimmed.startsWith('--')) { const nl = trimmed.indexOf('\n'); s = nl === -1 ? '' : trimmed.slice(nl + 1); continue; }
    if (trimmed.startsWith('/*')) { const end = trimmed.indexOf('*/'); s = end === -1 ? '' : trimmed.slice(end + 2); continue; }
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

function compareOutputs(submitted: QueryOutput, expected: QueryOutput, orderMatters: boolean): GradeResult['failureReason'] {
  if (submitted.columns.length !== expected.columns.length) return 'COLUMNS';
  if (submitted.rows.length !== expected.rows.length) return 'ROW_COUNT';
  const subKeys = submitted.rows.map(rowKey);
  const expKeys = expected.rows.map(rowKey);
  const sameRows = orderMatters ? JSON.stringify(subKeys) === JSON.stringify(expKeys) : JSON.stringify([...subKeys].sort()) === JSON.stringify([...expKeys].sort());
  return sameRows ? null : 'ROWS';
}

async function runCursor(client: PoolClient, sql: string): Promise<QueryOutput> {
  await client.query(`DECLARE grader_cur NO SCROLL CURSOR FOR\n${sql}\n`);
  const res = await client.query({ text: `FETCH ${FETCH_LIMIT} FROM grader_cur`, rowMode: 'array' });
  await client.query('CLOSE grader_cur');
  return { columns: res.fields.map((f) => f.name), rows: res.rows as unknown[][] };
}

// ---------------------------------------------------------------------------
// SELECT-output grading (existing path — column NAMES are never compared,
// only count + positional values, per the earlier fix)
// ---------------------------------------------------------------------------

async function runReference(client: PoolClient, referenceSql: string): Promise<QueryOutput> {
  await client.query('BEGIN READ ONLY');
  await client.query(`SET LOCAL statement_timeout = '${STATEMENT_TIMEOUT_MS}ms'`);
  try {
    const result = isRowReturning(referenceSql) ? await runCursor(client, referenceSql) : { columns: [], rows: [] };
    await client.query('ROLLBACK');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  }
}

async function runSubmission(client: PoolClient, statements: string[]): Promise<{ result: QueryOutput | null }> {
  await client.query('BEGIN');
  await client.query(`SET LOCAL statement_timeout = '${STATEMENT_TIMEOUT_MS}ms'`);
  try {
    let result: QueryOutput | null = null;
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const isLast = i === statements.length - 1;
      if (isLast && isRowReturning(stmt)) result = await runCursor(client, stmt);
      else await client.query(stmt);
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
  const rewrittenSubmitted = applyCompatibilityRewrites(submittedSql);
  const rewrittenReference = applyCompatibilityRewrites(referenceSql);

  const statements = splitStatements(rewrittenSubmitted);
  if (statements.length === 0) return emptyResult(start, 'RUNTIME_ERROR', 'Write a query first.');

  const acquired = await graderPool.connect().catch((e: Error) => e);
  if (acquired instanceof Error) return emptyResult(start, 'RUNTIME_ERROR', `Could not connect to the SQL grading database: ${acquired.message}`);
  const client = acquired;

  try {
    let ref: QueryOutput;
    try {
      ref = await runReference(client, rewrittenReference);
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
        : emptyResult(start, 'RUNTIME_ERROR', friendlyPgError(dbErr));
    }

    const referenceReturnsRows = isRowReturning(rewrittenReference);

    if (!submitted.result) {
      if (!referenceReturnsRows) {
        return { passed: true, status: 'ACCEPTED', output: 'Statement(s) executed successfully.', errorMessage: '', runtimeMs: Date.now() - start, resultColumns: [], resultRows: [], totalRows: 0, expectedRowCount: null, failureReason: null };
      }
      return { passed: false, status: 'WRONG_ANSWER', output: "Your script executed, but its final statement didn't return any rows — this challenge expects the last statement to be a query (like SELECT) that returns data.", errorMessage: '', runtimeMs: Date.now() - start, resultColumns: [], resultRows: [], totalRows: 0, expectedRowCount: null, failureReason: 'NOT_ROW_RETURNING' };
    }

    const orderMatters = /\border\s+by\b/i.test(rewrittenReference);
    const failureReason = compareOutputs(submitted.result, ref, orderMatters);
    const passed = failureReason === null;

    return {
      passed,
      status: passed ? 'ACCEPTED' : 'WRONG_ANSWER',
      output: passed ? `Correct: ${submitted.result.rows.length} row(s) match the expected result.` : `Wrong answer (${failureReason}).`,
      errorMessage: '', runtimeMs: Date.now() - start,
      resultColumns: submitted.result.columns, resultRows: submitted.result.rows.slice(0, DISPLAY_LIMIT),
      totalRows: submitted.result.rows.length, expectedRowCount: ref.rows.length, failureReason,
    };
  } catch (err: any) {
    return emptyResult(start, err.code === '57014' ? 'TIME_LIMIT_EXCEEDED' : 'RUNTIME_ERROR', friendlyPgError(err));
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// DML state-verification grading (new)
// ---------------------------------------------------------------------------

/** Runs a sequence of statements (the student's or the reference's DML) in
 *  a WRITABLE transaction, then runs verificationSql in that SAME
 *  transaction to capture the resulting state — then ALWAYS rolls back,
 *  regardless of outcome. Nothing a student (or an admin's reference
 *  answer) does here can ever persist to the real table. */
async function runDmlAndVerify(client: PoolClient, dmlStatements: string[], verificationSql: string): Promise<QueryOutput> {
  await client.query('BEGIN'); // intentionally NOT read-only — DML needs write access
  await client.query(`SET LOCAL statement_timeout = '${STATEMENT_TIMEOUT_MS}ms'`);
  try {
    for (const stmt of dmlStatements) {
      await client.query(stmt);
    }
    const verification = await runCursor(client, verificationSql);
    await client.query('ROLLBACK'); // CRITICAL: guarantees a pristine DB for the next user
    return verification;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  }
}

export async function runDmlGraded(referenceDml: string, verificationQuery: string, submittedSql: string): Promise<GradeResult> {
  const start = Date.now();
  const rewrittenSubmitted = applyCompatibilityRewrites(submittedSql);
  const rewrittenReference = applyCompatibilityRewrites(referenceDml);
  const rewrittenVerification = applyCompatibilityRewrites(verificationQuery);

  const submittedStatements = splitStatements(rewrittenSubmitted);
  if (submittedStatements.length === 0) return emptyResult(start, 'RUNTIME_ERROR', 'Write a query first.');

  // Deliberately TWO SEPARATE connections/transactions, not one: the
  // student's DML and the reference DML must each start from the same
  // pristine baseline. Running both in one transaction would let the
  // reference see the student's (uncommitted) changes, corrupting the
  // comparison. Since neither transaction ever commits, both genuinely
  // start from identical, untouched data.
  const acquired1 = await graderPool.connect().catch((e: Error) => e);
  if (acquired1 instanceof Error) return emptyResult(start, 'RUNTIME_ERROR', `Could not connect to the SQL grading database: ${acquired1.message}`);
  const client1 = acquired1;

  let submittedState: QueryOutput;
  try {
    submittedState = await runDmlAndVerify(client1, submittedStatements, rewrittenVerification);
  } catch (dbErr: any) {
    client1.release();
    return dbErr.code === '57014'
      ? emptyResult(start, 'TIME_LIMIT_EXCEEDED', 'Your query took too long to execute.')
      : emptyResult(start, 'RUNTIME_ERROR', friendlyPgError(dbErr));
  }
  client1.release();

  const acquired2 = await graderPool.connect().catch((e: Error) => e);
  if (acquired2 instanceof Error) return emptyResult(start, 'RUNTIME_ERROR', `Could not connect to the SQL grading database: ${acquired2.message}`);
  const client2 = acquired2;

  let referenceState: QueryOutput;
  try {
    const referenceStatements = splitStatements(rewrittenReference);
    referenceState = await runDmlAndVerify(client2, referenceStatements, rewrittenVerification);
  } catch (refErr) {
    client2.release();
    console.error('Reference DML failed to run:', refErr);
    return emptyResult(start, 'RUNTIME_ERROR', 'The reference solution for this challenge failed to run. Please report it.');
  }
  client2.release();

  const orderMatters = /\border\s+by\b/i.test(rewrittenVerification);
  const failureReason = compareOutputs(submittedState, referenceState, orderMatters);
  const passed = failureReason === null;

  return {
    passed,
    status: passed ? 'ACCEPTED' : 'WRONG_ANSWER',
    output: passed
      ? `Correct: the database state after your statement(s) matches the expected result (${submittedState.rows.length} row(s) in the verification check).`
      : `Wrong answer (${failureReason}) — the database state after your statement(s) doesn't match what's expected.`,
    errorMessage: '', runtimeMs: Date.now() - start,
    resultColumns: submittedState.columns, resultRows: submittedState.rows.slice(0, DISPLAY_LIMIT),
    totalRows: submittedState.rows.length, expectedRowCount: referenceState.rows.length, failureReason,
  };
}

/** Single entry point the worker calls — routes to SELECT-output grading or
 *  DML state-verification grading based on whether the challenge has a
 *  verificationQuery configured. */
export async function gradeSqlSubmission(
  challenge: { referenceAnswer: string | null; verificationQuery: string | null },
  submittedSql: string
): Promise<GradeResult> {
  if (challenge.verificationQuery) {
    return runDmlGraded(challenge.referenceAnswer ?? '', challenge.verificationQuery, submittedSql);
  }
  return runSqlGraded(challenge.referenceAnswer ?? '', submittedSql);
}

export async function testSqlQuery(sql: string): Promise<{ ok: boolean; columns: string[]; rows: unknown[][]; message: string; runtimeMs: number }> {
  const start = Date.now();
  const rewritten = applyCompatibilityRewrites(sql);
  const statements = splitStatements(rewritten);
  if (statements.length === 0) return { ok: false, columns: [], rows: [], message: 'Write a query first.', runtimeMs: Date.now() - start };

  const acquired = await graderPool.connect().catch((e: Error) => e);
  if (acquired instanceof Error) return { ok: false, columns: [], rows: [], message: `Could not connect: ${acquired.message}`, runtimeMs: Date.now() - start };
  const client = acquired;

  try {
    const { result } = await runSubmission(client, statements);
    if (result) return { ok: true, columns: result.columns, rows: result.rows.slice(0, DISPLAY_LIMIT), message: `${result.rows.length} row(s) returned.`, runtimeMs: Date.now() - start };
    return { ok: true, columns: [], rows: [], message: 'Statement(s) executed successfully (no rows returned).', runtimeMs: Date.now() - start };
  } catch (err: any) {
    return { ok: false, columns: [], rows: [], message: err.code === '57014' ? 'Query took too long to execute.' : friendlyPgError(err), runtimeMs: Date.now() - start };
  } finally {
    client.release();
  }
}