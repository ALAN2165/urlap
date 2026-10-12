import type { PoolClient } from 'pg';
import { graderPool } from '../config/sqlGraderPool';
import { friendlyPgError } from '../utils/friendlyError';

const FETCH_LIMIT = 1000;
const DISPLAY_LIMIT = 100;
const STATEMENT_TIMEOUT_MS = 8000;
const SANDBOX_SCHEMA = 'playground';
const REFERENCE_FAILED = 'The reference solution for this challenge failed to run. Please report it.';

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

type FailureReason = GradeResult['failureReason'];
interface QueryOutput { columns: string[]; rows: unknown[][]; }
interface TableState { name: string; present: boolean; columns: string[]; rows: unknown[][]; }
interface SandboxRun { result: QueryOutput | null; before: TableState[] | null; after: TableState[] | null; }

const quoteIdent = (name: string) => `"${name.replace(/"/g, '""')}"`;

function emptyResult(start: number, status: GradeResult['status'], errorMessage: string): GradeResult {
  return { passed: false, status, output: '', errorMessage, runtimeMs: Date.now() - start, resultColumns: [], resultRows: [], totalRows: 0, expectedRowCount: null, failureReason: null };
}

function describeError(err: any): string {
  return err && err.blocked ? err.message : friendlyPgError(err);
}

function failureFromError(start: number, err: any): GradeResult {
  return err && err.code === '57014'
    ? emptyResult(start, 'TIME_LIMIT_EXCEEDED', 'Your query took too long to execute.')
    : emptyResult(start, 'RUNTIME_ERROR', describeError(err));
}

// ---------------------------------------------------------------------------
// Text handling
// ---------------------------------------------------------------------------

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

/** Oracle's bare SYSDATE keyword -> CURRENT_DATE (skips strings, comments and $-quoted bodies). */
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

/** Same-length copy of `sql` with comments, string literals, quoted identifiers and $-quoted
 *  bodies blanked out, so keyword/paren scans can't be fooled while indexes still line up. */
function maskSql(sql: string): string {
  const out = sql.split('');
  const n = sql.length;
  const blank = (from: number, to: number) => {
    for (let k = from; k < to; k++) if (out[k] !== '\n') out[k] = ' ';
  };
  let i = 0;
  while (i < n) {
    const ch = sql[i];
    if (ch === '-' && sql[i + 1] === '-') {
      const nl = sql.indexOf('\n', i);
      const stop = nl === -1 ? n : nl;
      blank(i, stop);
      i = stop;
      continue;
    }
    if (ch === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      blank(i, stop);
      i = stop;
      continue;
    }
    if (ch === "'" || ch === '"') {
      let j = i + 1;
      while (j < n) {
        if (sql[j] === ch && sql[j + 1] === ch) { j += 2; continue; }
        if (sql[j] === ch) { j += 1; break; }
        j += 1;
      }
      blank(i, j);
      i = j;
      continue;
    }
    if (ch === '$') {
      const tagMatch = /^\$([A-Za-z0-9_]*)\$/.exec(sql.slice(i));
      if (tagMatch) {
        const tag = tagMatch[0];
        const closeIdx = sql.indexOf(tag, i + tag.length);
        const stop = closeIdx === -1 ? n : closeIdx + tag.length;
        blank(i, stop);
        i = stop;
        continue;
      }
    }
    i += 1;
  }
  return out.join('');
}

function stripPlusMarkers(text: string, mask: string): string {
  const re = /\(\s*\+\s*\)/g;
  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(mask)) !== null) {
    out += text.slice(last, m.index);
    last = m.index + m[0].length;
  }
  return out + text.slice(last);
}

/**
 * PostgreSQL has no Oracle (+) outer-join operator. This turns the common shape
 *   SELECT ... FROM a x, b y WHERE x.k(+) = y.k [AND ...]
 * into
 *   SELECT ... FROM b y LEFT JOIN a x ON (x.k = y.k) [WHERE ...]
 * Anything it doesn't fully understand is returned untouched (Postgres then reports its own error).
 */
function rewriteOracleOuterJoins(sql: string): string {
  const masked = maskSql(sql);
  const PLUS = /\(\s*\+\s*\)/;
  if (!PLUS.test(masked)) return sql;
  if (!/^\s*(select|with)\b/i.test(masked)) return sql;

  const n = sql.length;
  const depth = new Int16Array(n + 1);
  let d = 0;
  for (let i = 0; i < n; i++) {
    depth[i] = d;
    if (masked[i] === '(') d++;
    else if (masked[i] === ')') d = Math.max(0, d - 1);
  }

  const marks: { kw: string; start: number; end: number }[] = [];
  const kwRe = /\b(FROM|WHERE|GROUP\s+BY|HAVING|ORDER\s+BY|LIMIT|OFFSET|FETCH|UNION|INTERSECT|EXCEPT|WINDOW)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = kwRe.exec(masked)) !== null) {
    if (depth[m.index] !== 0) continue;
    const kw = m[1].toUpperCase().replace(/\s+/g, ' ');
    if (kw === 'FROM' && /\bDISTINCT\s*$/i.test(masked.slice(0, m.index))) continue;
    marks.push({ kw, start: m.index, end: m.index + m[0].length });
  }

  if (marks.some((k) => k.kw === 'UNION' || k.kw === 'INTERSECT' || k.kw === 'EXCEPT')) return sql;
  const fromIdx = marks.findIndex((k) => k.kw === 'FROM');
  if (fromIdx === -1) return sql;
  const whereMark = marks[fromIdx + 1];
  if (!whereMark || whereMark.kw !== 'WHERE') return sql;
  const afterWhere = marks[fromIdx + 2];

  const fromStart = marks[fromIdx].end;
  const fromEnd = whereMark.start;
  const whereStart = whereMark.end;
  const whereEnd = afterWhere ? afterWhere.start : n;

  if (/\bJOIN\b/i.test(masked.slice(fromStart, fromEnd))) return sql; // mixed syntax: leave alone

  const topLevel = (re: RegExp, from: number, to: number) => {
    const found: { index: number; length: number }[] = [];
    const slice = masked.slice(from, to);
    const r = new RegExp(re.source, 'gi');
    let mm: RegExpExecArray | null;
    while ((mm = r.exec(slice)) !== null) {
      if (depth[from + mm.index] === 0) found.push({ index: from + mm.index, length: mm[0].length });
    }
    return found;
  };

  // FROM list, split on top-level commas
  const fromItems: string[] = [];
  let itemStart = fromStart;
  for (let i = fromStart; i < fromEnd; i++) {
    if (masked[i] === ',' && depth[i] === 0) {
      fromItems.push(sql.slice(itemStart, i));
      itemStart = i + 1;
    }
  }
  fromItems.push(sql.slice(itemStart, fromEnd));

  const parsed = fromItems.map((raw) => {
    const text = raw.trim();
    const mm = /^([A-Za-z_][\w$]*(?:\s*\.\s*[A-Za-z_][\w$]*)?)(?:\s+(?:AS\s+)?([A-Za-z_][\w$]*))?$/i.exec(text);
    if (!mm) return null;
    const table = mm[1].replace(/\s+/g, '');
    return { text, alias: (mm[2] || table.split('.').pop() || table).toLowerCase() };
  });
  if (parsed.some((p) => p === null)) return sql;
  const items = parsed as { text: string; alias: string }[];
  if (items.some((it, i) => items.findIndex((o) => o.alias === it.alias) !== i)) return sql; // duplicate alias

  // WHERE split on top-level AND (a BETWEEN's AND is split too, but re-joined with AND below)
  if (topLevel(/\bOR\b/, whereStart, whereEnd).length > 0) return sql;
  const ands = topLevel(/\bAND\b/, whereStart, whereEnd);
  const conjuncts: { text: string; mask: string }[] = [];
  let cs = whereStart;
  for (const a of ands) {
    conjuncts.push({ text: sql.slice(cs, a.index), mask: masked.slice(cs, a.index) });
    cs = a.index + a.length;
  }
  conjuncts.push({ text: sql.slice(cs, whereEnd), mask: masked.slice(cs, whereEnd) });

  const joinConds: { alias: string; cond: string }[] = [];
  const remaining: string[] = [];
  for (const c of conjuncts) {
    if (!PLUS.test(c.mask)) {
      if (c.text.trim()) remaining.push(c.text.trim());
      continue;
    }
    const aliasRe = /\b([A-Za-z_][\w$]*)\s*\.\s*[A-Za-z_][\w$]*\s*\(\s*\+\s*\)/g;
    const aliases: string[] = [];
    let am: RegExpExecArray | null;
    while ((am = aliasRe.exec(c.mask)) !== null) aliases.push(am[1].toLowerCase());
    const plusCount = (c.mask.match(/\(\s*\+\s*\)/g) || []).length;
    const distinct = aliases.filter((a, i) => aliases.indexOf(a) === i);
    if (distinct.length !== 1 || aliases.length !== plusCount) return sql;
    joinConds.push({ alias: distinct[0], cond: stripPlusMarkers(c.text, c.mask).trim() });
  }
  if (joinConds.length === 0) return sql;

  const optionalAliases = joinConds.map((j) => j.alias);
  if (optionalAliases.some((a) => !items.some((it) => it.alias === a))) return sql;
  const base = items.filter((it) => optionalAliases.indexOf(it.alias) === -1);
  const optional = items.filter((it) => optionalAliases.indexOf(it.alias) !== -1);
  if (base.length === 0) return sql;

  let newFrom = base.map((it) => it.text).join(' CROSS JOIN ');
  for (const o of optional) {
    const conds = joinConds.filter((j) => j.alias === o.alias).map((j) => `(${j.cond})`).join(' AND ');
    newFrom += ` LEFT JOIN ${o.text} ON ${conds}`;
  }
  const where = remaining.length ? ` WHERE ${remaining.join(' AND ')}` : '';
  return `${sql.slice(0, fromStart)} ${newFrom}${where} ${sql.slice(whereEnd)}`.trim();
}

function normalizeSql(sql: string): string[] {
  return splitStatements(applyCompatibilityRewrites(sql)).map(rewriteOracleOuterJoins);
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

function firstWord(stmt: string): string {
  const m = /^[a-zA-Z]+/.exec(stripLeadingCommentsAndWhitespace(stmt));
  return m ? m[0].toLowerCase() : '';
}

function isRowReturning(stmt: string): boolean {
  const w = firstWord(stmt);
  return w === 'select' || w === 'with';
}

// Transaction / session control would let a script escape the sandbox (e.g. COMMIT, or ROLLBACK
// followed by autocommitted writes), or lift limits (SET statement_timeout).
const BLOCKED_FIRST_WORDS = [
  'begin', 'start', 'commit', 'end', 'rollback', 'abort', 'savepoint', 'release',
  'set', 'reset', 'prepare', 'deallocate', 'declare', 'fetch', 'close', 'move',
  'listen', 'unlisten', 'notify', 'load', 'copy', 'lock', 'discard', 'checkpoint',
  'vacuum', 'reindex', 'cluster',
];

function assertStatementsAllowed(statements: string[]): void {
  for (const stmt of statements) {
    const word = firstWord(stmt);
    if (BLOCKED_FIRST_WORDS.indexOf(word) !== -1) {
      const err: any = new Error(
        `"${word.toUpperCase()}" statements aren't allowed here. Every query already runs in its own sandbox and is undone automatically, so you don't need transaction or session commands.`
      );
      err.blocked = true;
      throw err;
    }
  }
}

// ---------------------------------------------------------------------------
// Value comparison
// ---------------------------------------------------------------------------

function normalizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number') return Math.round(value * 1e9) / 1e9;
  return value;
}
const rowKey = (row: unknown[]) => JSON.stringify(row.map(normalizeValue));

/** Output comparison: column NAMES are never compared, only how many columns there are and
 *  what values they hold, positionally. */
function compareOutputs(submitted: QueryOutput, expected: QueryOutput, orderMatters: boolean): FailureReason {
  if (submitted.columns.length !== expected.columns.length) return 'COLUMNS';
  if (submitted.rows.length !== expected.rows.length) return 'ROW_COUNT';
  const subKeys = submitted.rows.map(rowKey);
  const expKeys = expected.rows.map(rowKey);
  const same = orderMatters
    ? JSON.stringify(subKeys) === JSON.stringify(expKeys)
    : JSON.stringify(subKeys.slice().sort()) === JSON.stringify(expKeys.slice().sort());
  return same ? null : 'ROWS';
}

function compareStates(submitted: TableState[], expected: TableState[]): FailureReason {
  for (const exp of expected) {
    const sub = submitted.find((t) => t.name === exp.name);
    if (!sub || sub.present !== exp.present) return 'ROWS';
    if (!exp.present) continue;
    if (sub.columns.length !== exp.columns.length) return 'COLUMNS';
    if (sub.rows.length !== exp.rows.length) return 'ROW_COUNT';
    if (JSON.stringify(sub.rows.map(rowKey).sort()) !== JSON.stringify(exp.rows.map(rowKey).sort())) return 'ROWS';
  }
  return null;
}

const fingerprint = (t: TableState) => JSON.stringify([t.present, t.columns.length, t.rows.map(rowKey).sort()]);

function firstChangedTable(before: TableState[], after: TableState[]): string | null {
  for (const b of before) {
    const a = after.find((t) => t.name === b.name);
    if (!a || fingerprint(a) !== fingerprint(b)) return b.name;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Sandbox execution
// ---------------------------------------------------------------------------

async function runCursor(client: PoolClient, sql: string): Promise<QueryOutput> {
  await client.query(`DECLARE grader_cur NO SCROLL CURSOR FOR\n${sql}\n`);
  const res = await client.query({ text: `FETCH ${FETCH_LIMIT} FROM grader_cur`, rowMode: 'array' });
  await client.query('CLOSE grader_cur');
  return { columns: res.fields.map((f) => f.name), rows: res.rows as unknown[][] };
}

/** Copies every playground table into a private TEMP table of the same name (dropped when the
 *  transaction ends). Temp tables are searched before the playground schema, so the student's
 *  unqualified `employees` is the copy. INSERT/UPDATE/DELETE hit the copy and the grader role has
 *  no write access to the real tables at all. */
async function prepareSandbox(client: PoolClient): Promise<string[]> {
  const res = await client.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = '${SANDBOX_SCHEMA}' ORDER BY tablename`
  );
  const names = res.rows.map((r) => r.tablename);
  for (const name of names) {
    const q = quoteIdent(name);
    await client.query(`CREATE TEMP TABLE ${q} (LIKE ${SANDBOX_SCHEMA}.${q} INCLUDING ALL) ON COMMIT DROP`);
    await client.query(`INSERT INTO pg_temp.${q} SELECT * FROM ${SANDBOX_SCHEMA}.${q}`);
  }
  return names;
}

async function snapshotState(client: PoolClient, tables: string[]): Promise<TableState[]> {
  const state: TableState[] = [];
  for (const name of tables) {
    const q = quoteIdent(name);
    const exists = await client.query(`SELECT to_regclass($1::text) IS NOT NULL AS present`, [`pg_temp.${q}`]);
    if (!exists.rows[0].present) {
      state.push({ name, present: false, columns: [], rows: [] });
      continue;
    }
    const res = await client.query({ text: `SELECT * FROM pg_temp.${q} LIMIT ${FETCH_LIMIT}`, rowMode: 'array' });
    state.push({ name, present: true, columns: res.fields.map((f) => f.name), rows: res.rows as unknown[][] });
  }
  return state;
}

/** Runs the statements inside a sandboxed transaction that ALWAYS ends in ROLLBACK. */
async function runSandboxed(client: PoolClient, statements: string[], captureState: boolean): Promise<SandboxRun> {
  assertStatementsAllowed(statements);

  await client.query('BEGIN');
  try {
    await client.query(`SET LOCAL statement_timeout = '${STATEMENT_TIMEOUT_MS}ms'`);
    const tables = await prepareSandbox(client);
    const before = captureState ? await snapshotState(client, tables) : null;

    let result: QueryOutput | null = null;
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (i === statements.length - 1 && isRowReturning(stmt)) result = await runCursor(client, stmt);
      else await client.query(stmt);
    }

    const after = captureState ? await snapshotState(client, tables) : null;
    await client.query('ROLLBACK');
    return { result, before, after };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Grading
// ---------------------------------------------------------------------------

async function gradeByOutput(client: PoolClient, refStatements: string[], submittedStatements: string[], start: number): Promise<GradeResult> {
  let ref: QueryOutput;
  try {
    ref = (await runSandboxed(client, refStatements, false)).result || { columns: [], rows: [] };
  } catch (refErr) {
    console.error('Reference SQL failed to run:', refErr);
    return emptyResult(start, 'RUNTIME_ERROR', REFERENCE_FAILED);
  }

  let submitted: QueryOutput | null;
  try {
    submitted = (await runSandboxed(client, submittedStatements, false)).result;
  } catch (dbErr) {
    return failureFromError(start, dbErr);
  }

  if (!submitted) {
    return {
      passed: false, status: 'WRONG_ANSWER',
      output: "Your script executed, but its final statement didn't return any rows — this challenge expects the last statement to be a query (like SELECT) that returns data.",
      errorMessage: '', runtimeMs: Date.now() - start,
      resultColumns: [], resultRows: [], totalRows: 0, expectedRowCount: null, failureReason: 'NOT_ROW_RETURNING',
    };
  }

  const orderMatters = /\border\s+by\b/i.test(refStatements[refStatements.length - 1]);
  const failureReason = compareOutputs(submitted, ref, orderMatters);
  const passed = failureReason === null;

  return {
    passed,
    status: passed ? 'ACCEPTED' : 'WRONG_ANSWER',
    output: passed ? `Correct: ${submitted.rows.length} row(s) match the expected result.` : `Wrong answer (${failureReason}).`,
    errorMessage: '', runtimeMs: Date.now() - start,
    resultColumns: submitted.columns, resultRows: submitted.rows.slice(0, DISPLAY_LIMIT),
    totalRows: submitted.rows.length, expectedRowCount: ref.rows.length, failureReason,
  };
}

/** For INSERT / UPDATE / DELETE references: the student's statements and the reference run in
 *  separate sandboxes that both start from identical, untouched data; the resulting table data
 *  is what gets compared. */
async function gradeByState(client: PoolClient, refStatements: string[], submittedStatements: string[], start: number): Promise<GradeResult> {
  let refRun: SandboxRun;
  try {
    refRun = await runSandboxed(client, refStatements, true);
  } catch (refErr) {
    console.error('Reference SQL failed to run:', refErr);
    return emptyResult(start, 'RUNTIME_ERROR', REFERENCE_FAILED);
  }

  let subRun: SandboxRun;
  try {
    subRun = await runSandboxed(client, submittedStatements, true);
  } catch (dbErr) {
    return failureFromError(start, dbErr);
  }

  const submittedAfter = subRun.after || [];
  const expectedAfter = refRun.after || [];
  const failureReason = compareStates(submittedAfter, expectedAfter);
  const passed = failureReason === null;

  // Show the student the table their statement actually changed.
  const changedName = firstChangedTable(subRun.before || [], submittedAfter);
  const changed = changedName ? submittedAfter.find((t) => t.name === changedName) : undefined;
  const expectedChanged = changedName ? expectedAfter.find((t) => t.name === changedName) : undefined;

  return {
    passed,
    status: passed ? 'ACCEPTED' : 'WRONG_ANSWER',
    output: passed ? 'Correct: the data in the tables matches the expected result.' : `Wrong answer (${failureReason}) — the data after your statement doesn't match what's expected.`,
    errorMessage: '', runtimeMs: Date.now() - start,
    resultColumns: changed ? changed.columns : [],
    resultRows: changed ? changed.rows.slice(0, DISPLAY_LIMIT) : [],
    totalRows: changed ? changed.rows.length : 0,
    expectedRowCount: expectedChanged ? expectedChanged.rows.length : null,
    failureReason,
  };
}

/** Single entry point. A reference answer that ends in a SELECT is graded by its output;
 *  anything else (INSERT, UPDATE, DELETE, ...) is graded by the resulting table data. */
export async function gradeSqlSubmission(challenge: { referenceAnswer: string | null }, submittedSql: string): Promise<GradeResult> {
  const start = Date.now();

  const submittedStatements = normalizeSql(submittedSql);
  if (submittedStatements.length === 0) return emptyResult(start, 'RUNTIME_ERROR', 'Write a query first.');

  const refStatements = normalizeSql(challenge.referenceAnswer || '');
  if (refStatements.length === 0) return emptyResult(start, 'RUNTIME_ERROR', 'This challenge has no reference answer yet. Please report it.');

  const acquired = await graderPool.connect().catch((e: Error) => e);
  if (acquired instanceof Error) {
    return emptyResult(start, 'RUNTIME_ERROR', `Could not connect to the SQL grading database: ${acquired.message}`);
  }
  const client = acquired;

  try {
    const lastRef = refStatements[refStatements.length - 1];
    return isRowReturning(lastRef)
      ? await gradeByOutput(client, refStatements, submittedStatements, start)
      : await gradeByState(client, refStatements, submittedStatements, start);
  } catch (err) {
    return failureFromError(start, err);
  } finally {
    client.release();
  }
}

/** Kept for older callers. */
export async function runSqlGraded(referenceSql: string, submittedSql: string): Promise<GradeResult> {
  return gradeSqlSubmission({ referenceAnswer: referenceSql }, submittedSql);
}

/** Used by the Admin "Test Query" button, the public Playground and the sample-data preview.
 *  Same sandbox as grading, so nothing is ever saved. */
export async function testSqlQuery(sql: string): Promise<{ ok: boolean; columns: string[]; rows: unknown[][]; message: string; runtimeMs: number }> {
  const start = Date.now();
  const statements = normalizeSql(sql);
  if (statements.length === 0) return { ok: false, columns: [], rows: [], message: 'Write a query first.', runtimeMs: Date.now() - start };

  const acquired = await graderPool.connect().catch((e: Error) => e);
  if (acquired instanceof Error) return { ok: false, columns: [], rows: [], message: `Could not connect: ${acquired.message}`, runtimeMs: Date.now() - start };
  const client = acquired;

  try {
    const dataChanging = !isRowReturning(statements[statements.length - 1]);
    const run = await runSandboxed(client, statements, dataChanging);

    if (run.result) {
      return { ok: true, columns: run.result.columns, rows: run.result.rows.slice(0, DISPLAY_LIMIT), message: `${run.result.rows.length} row(s) returned.`, runtimeMs: Date.now() - start };
    }

    const changedName = run.before && run.after ? firstChangedTable(run.before, run.after) : null;
    if (changedName && run.after && run.before) {
      const afterTable = run.after.find((t) => t.name === changedName);
      const beforeTable = run.before.find((t) => t.name === changedName);
      if (afterTable && afterTable.present) {
        return {
          ok: true, columns: afterTable.columns, rows: afterTable.rows.slice(0, DISPLAY_LIMIT),
          message: `Statement(s) executed. Table "${changedName}" now has ${afterTable.rows.length} row(s) (was ${beforeTable ? beforeTable.rows.length : 0}). Nothing is saved — the sandbox resets after every run.`,
          runtimeMs: Date.now() - start,
        };
      }
    }
    return { ok: true, columns: [], rows: [], message: 'Statement(s) executed successfully (no rows returned).', runtimeMs: Date.now() - start };
  } catch (err: any) {
    return {
      ok: false, columns: [], rows: [],
      message: err && err.code === '57014' ? 'Query took too long to execute.' : describeError(err),
      runtimeMs: Date.now() - start,
    };
  } finally {
    client.release();
  }
}