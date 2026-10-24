
import crypto from 'crypto';
import type { PoolClient } from 'pg';
import { graderPool } from '../config/sqlGraderPool';
import { friendlyPgError } from '../utils/friendlyError';
import { normalizeSql, parseRollbackTo, parseSavepoint, PLSQL_VARS_TABLE, TXN_BASE } from './sqlText';
import type { Stmt } from './sqlText';

const FETCH_LIMIT = 1000;
const DISPLAY_LIMIT = 100;
const PANEL_ROWS = 50;
const STATEMENT_TIMEOUT_MS = 20000;
const BASE_SCHEMA = 'playground';
const REFERENCE_FAILED = 'The reference solution for this challenge failed to run. Please report it.';

type FailureReason = 'COLUMNS' | 'ROW_COUNT' | 'ROWS' | 'NOT_ROW_RETURNING' | 'STRUCTURE' | 'COMMIT' | null;

export interface PanelSide { columns: string[]; rows: unknown[][]; total: number }
export interface ComparisonPanel { title: string; expected: PanelSide; actual: PanelSide }

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
  failureReason: FailureReason;
  panels: ComparisonPanel[];
}

interface QueryOutput { columns: string[]; rows: unknown[][] }
interface ColumnState { name: string; type: string; notNull: boolean; def: string }
interface RelationState {
  name: string;
  kind: 'table' | 'sequence';
  columns: ColumnState[];
  constraints: { name: string; type: string; def: string }[];
  rows: unknown[][];
  seq: string[][] | null;
}
type Snapshot = RelationState[];
interface Run { result: QueryOutput | null; before?: Snapshot; after?: Snapshot; committed?: Snapshot }

const quoteIdent = (name: string) => `"${name.replace(/"/g, '""')}"`;

function emptyResult(start: number, status: GradeResult['status'], errorMessage: string): GradeResult {
  return { passed: false, status, output: '', errorMessage, runtimeMs: Date.now() - start, resultColumns: [], resultRows: [], totalRows: 0, expectedRowCount: null, failureReason: null, panels: [] };
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

function blockedError(word: string): Error {
  const e: any = new Error(
    `"${word.toUpperCase()}" isn't supported here. Every run happens in its own sandbox that is undone automatically. For transaction control use SAVEPOINT name, ROLLBACK [TO name] and COMMIT.`
  );
  e.blocked = true;
  return e;
}

function describeError(err: any): string {
  if (err && err.blocked) return err.message;
  const quoted = /"([^"]+)"/.exec((err && err.message) || '');
  const name = quoted ? quoted[1] : null;
  switch (err && err.code) {
    case '42P07': return `A table or sequence named${name ? ` "${name}"` : ' that'} already exists.`;
    case '42710': return `That object already exists${name ? `: "${name}"` : ''}. Constraint and sequence names must be unique.`;
    case '42701': return `The column${name ? ` "${name}"` : ''} already exists in this table.`;
    case '3B001': return `There is no savepoint with that name${name ? ` ("${name}")` : ''}. Create it with SAVEPOINT name before rolling back to it.`;
    case '2BP01': return 'Other objects (such as foreign keys) depend on this one. Use CASCADE to drop them too.';
    case '23503': return 'That change breaks a FOREIGN KEY: the value must already exist in the referenced (parent) table.';
    case '23514': return 'A CHECK constraint rejected that value.';
    case '42P16': return "That table definition isn't valid. Check the column list and the constraints.";
    case '22001': return "A value is too long for its column's size.";
    case '22003': return "A number is too large for its column's precision.";
    default: return friendlyPgError(err);
  }
}

function failureFromError(start: number, err: any): GradeResult {
  return err && err.code === '57014'
    ? emptyResult(start, 'TIME_LIMIT_EXCEEDED', 'Your query took too long to execute.')
    : emptyResult(start, 'RUNTIME_ERROR', describeError(err));
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
const sortedKeys = (rows: unknown[][]) => rows.map(rowKey).sort();

/** Output comparison: column NAMES are never compared, only how many columns and what values, positionally. */
function compareOutputs(actual: QueryOutput, expected: QueryOutput, orderMatters: boolean): FailureReason {
  if (actual.columns.length !== expected.columns.length) return 'COLUMNS';
  if (actual.rows.length !== expected.rows.length) return 'ROW_COUNT';
  const a = actual.rows.map(rowKey);
  const e = expected.rows.map(rowKey);
  const same = orderMatters ? JSON.stringify(a) === JSON.stringify(e) : JSON.stringify(a.slice().sort()) === JSON.stringify(e.slice().sort());
  return same ? null : 'ROWS';
}

const side = (out: QueryOutput): PanelSide => ({ columns: out.columns, rows: out.rows.slice(0, PANEL_ROWS), total: out.rows.length });
const panel = (title: string, columns: string[], expectedRows: unknown[][], actualRows: unknown[][]): ComparisonPanel => ({
  title,
  expected: { columns, rows: expectedRows.slice(0, PANEL_ROWS), total: expectedRows.length },
  actual: { columns, rows: actualRows.slice(0, PANEL_ROWS), total: actualRows.length },
});

// ---------------------------------------------------------------------------
// Database object snapshots
// ---------------------------------------------------------------------------

async function snapshot(client: PoolClient, schema: string): Promise<Snapshot> {
  const rels = await client.query(
    `SELECT c.oid::text AS oid, c.relname, c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = $1 AND c.relkind IN ('r','S') ORDER BY c.relname`,
    [schema]
  );
  const clean = (s: string | null) => (s || '').replace(new RegExp(`${schema}\\.`, 'g'), '');
  const out: Snapshot = [];

  for (const r of rels.rows) {
    if (r.relkind === 'S') {
      const s = await client.query(
        `SELECT data_type::text AS "data type", start_value::text AS "start", min_value::text AS "min", max_value::text AS "max",
                increment_by::text AS "increment", cycle::text AS "cycle", cache_size::text AS "cache",
                COALESCE(last_value::text, '(not used yet)') AS "last value"
         FROM pg_sequences WHERE schemaname = $1 AND sequencename = $2`,
        [schema, r.relname]
      );
      const row = s.rows[0] || {};
      out.push({ name: r.relname, kind: 'sequence', columns: [], constraints: [], rows: [], seq: Object.keys(row).map((k) => [k, String(row[k])]) });
      continue;
    }
    const cols = await client.query(
      `SELECT a.attname AS name, format_type(a.atttypid, a.atttypmod) AS type, a.attnotnull AS notnull, pg_get_expr(d.adbin, d.adrelid) AS def
       FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
       WHERE a.attrelid = $1::oid AND a.attnum > 0 AND NOT a.attisdropped ORDER BY a.attnum`,
      [r.oid]
    );
    const cons = await client.query(
      `SELECT conname AS name, contype::text AS type, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid = $1::oid ORDER BY conname`,
      [r.oid]
    );
    const data = await client.query({ text: `SELECT * FROM ${quoteIdent(schema)}.${quoteIdent(r.relname)} LIMIT ${FETCH_LIMIT}`, rowMode: 'array' });
    out.push({
      name: r.relname,
      kind: 'table',
      columns: cols.rows.map((c: any) => ({ name: c.name, type: c.type, notNull: c.notnull, def: clean(c.def) })),
      constraints: cons.rows.map((c: any) => ({ name: c.name, type: c.type, def: clean(c.def) })),
      rows: data.rows as unknown[][],
      seq: null,
    });
  }
  return out;
}

const COL_HEADER = ['column', 'type', 'nullable', 'default'];
const CON_HEADER = ['constraint', 'kind', 'definition'];
const CON_KIND: Record<string, string> = { p: 'PRIMARY KEY', f: 'FOREIGN KEY', u: 'UNIQUE', c: 'CHECK', n: 'NOT NULL', x: 'EXCLUDE' };
const colRows = (r?: RelationState): unknown[][] => (r ? r.columns.map((c) => [c.name, c.type, c.notNull ? 'NOT NULL' : 'NULL', c.def || '—']) : []);
const conRows = (r?: RelationState): unknown[][] => (r ? r.constraints.map((c) => [c.name, CON_KIND[c.type] || c.type, c.def]) : []);

const SEVERITY: FailureReason[] = [null, 'ROWS', 'ROW_COUNT', 'STRUCTURE'];
const keyOf = (r: RelationState) => `${r.kind}:${r.name}`;

/** Compares two snapshots (student vs expected): tables, columns, types, constraints, sequences, data. */
function diffState(sub: Snapshot, exp: Snapshot): { reason: FailureReason; panels: ComparisonPanel[] } {
  const panels: ComparisonPanel[] = [];
  let worst = 0;
  const bump = (r: FailureReason) => { worst = Math.max(worst, SEVERITY.indexOf(r)); };
  const keys = Array.from(new Set(sub.concat(exp).map(keyOf))).sort();

  for (const key of keys) {
    const s = sub.find((r) => keyOf(r) === key);
    const e = exp.find((r) => keyOf(r) === key);
    const ref = (e || s) as RelationState;
    const label = `${ref.kind === 'table' ? 'Table' : 'Sequence'} "${ref.name}"`;

    if (!s || !e) {
      bump('STRUCTURE');
      panels.push(ref.kind === 'sequence'
        ? panel(`${label} — settings`, ['property', 'value'], e ? e.seq || [] : [], s ? s.seq || [] : [])
        : panel(`${label} — columns`, COL_HEADER, colRows(e), colRows(s)));
      continue;
    }
    if (e.kind === 'sequence') {
      if (JSON.stringify(s.seq) !== JSON.stringify(e.seq)) { bump('STRUCTURE'); panels.push(panel(`${label} — settings`, ['property', 'value'], e.seq || [], s.seq || [])); }
      continue;
    }

    const colsDiffer = JSON.stringify(s.columns) !== JSON.stringify(e.columns);
    const consDiffer = JSON.stringify(s.constraints) !== JSON.stringify(e.constraints);
    if (colsDiffer) panels.push(panel(`${label} — columns`, COL_HEADER, colRows(e), colRows(s)));
    if (consDiffer) panels.push(panel(`${label} — constraints`, CON_HEADER, conRows(e), conRows(s)));
    if (colsDiffer || consDiffer) { bump('STRUCTURE'); continue; }

    const names = e.columns.map((c) => c.name);
    if (s.rows.length !== e.rows.length) { bump('ROW_COUNT'); panels.push(panel(`${label} — data`, names, e.rows, s.rows)); }
    else if (JSON.stringify(sortedKeys(s.rows)) !== JSON.stringify(sortedKeys(e.rows))) { bump('ROWS'); panels.push(panel(`${label} — data`, names, e.rows, s.rows)); }
  }
  return { reason: SEVERITY[worst], panels: panels.slice(0, 4) };
}

const relSig = (r: RelationState) => JSON.stringify([r.columns, r.constraints, r.rows, r.seq]);

function changedRelation(before: Snapshot, after: Snapshot): RelationState | null {
  const old = new Map(before.map((r) => [keyOf(r), relSig(r)] as [string, string]));
  return after.find((r) => old.get(keyOf(r)) !== relSig(r)) || null;
}

function describe(rel: RelationState): QueryOutput {
  if (rel.kind === 'sequence') return { columns: ['property', 'value'], rows: rel.seq || [] };
  if (rel.rows.length) return { columns: rel.columns.map((c) => c.name), rows: rel.rows };
  return { columns: COL_HEADER, rows: colRows(rel) };
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

function savepointName(s: Stmt): string {
  const name = s.kind === 'savepoint' ? parseSavepoint(s.sql) : parseRollbackTo(s.sql);
  if (!name || /^urlap_/i.test(name)) throw blockedError(s.word);
  return name;
}

function validate(stmts: Stmt[]): void {
  for (const s of stmts) {
    if (s.kind === 'blocked') throw blockedError(s.word);
    if (s.kind === 'savepoint' || s.kind === 'rollbackTo') savepointName(s);
  }
}

/** Emulates COMMIT: the real transaction is never committed; this only moves the "last commit" marker. */
async function commitPoint(client: PoolClient): Promise<void> {
  await client.query(`RELEASE SAVEPOINT ${TXN_BASE}`);
  await client.query(`SAVEPOINT ${TXN_BASE}`);
}

/**
 * Runs a script inside a private, throw-away schema holding copies of the playground tables.
 * The whole thing always ends in ROLLBACK. COMMIT is emulated (never sent to the database), DDL commits
 * implicitly like Oracle, and SAVEPOINT / ROLLBACK TO use real PostgreSQL savepoints.
 */
async function runSandboxed(client: PoolClient, stmts: Stmt[], fixture: Stmt[], opts: { capture: boolean; committed: boolean }): Promise<Run> {
  validate(stmts);
  const schema = `urlap_run_${crypto.randomBytes(6).toString('hex')}`;

  await client.query('BEGIN');
  try {
    await client.query(`SET LOCAL statement_timeout = '${STATEMENT_TIMEOUT_MS}ms'`);
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET LOCAL search_path = ${schema}, ${BASE_SCHEMA}`);

    // Diagnostic table a transpiled PL/SQL block writes its declared variables' final values into
    // (as jsonb), so challenges graded purely on local variable state — never touching a real table —
    // still produce something the snapshot/diff below can compare. Harmless no-op for every other lab.
    await client.query(`CREATE TABLE ${schema}.${quoteIdent(PLSQL_VARS_TABLE)} (k text PRIMARY KEY, v jsonb)`);

    const tables = await client.query(`SELECT tablename FROM pg_tables WHERE schemaname = '${BASE_SCHEMA}' ORDER BY tablename`);
    for (const t of tables.rows) {
      const q = quoteIdent(t.tablename);
      await client.query(`CREATE TABLE ${schema}.${q} (LIKE ${BASE_SCHEMA}.${q} INCLUDING ALL)`);
      await client.query(`INSERT INTO ${schema}.${q} SELECT * FROM ${BASE_SCHEMA}.${q}`);
    }
    for (const f of fixture) await client.query(f.sql);

    await client.query(`SAVEPOINT ${TXN_BASE}`);
    const before = opts.capture ? await snapshot(client, schema) : undefined;

    let result: QueryOutput | null = null;
    for (let i = 0; i < stmts.length; i++) {
      const s = stmts[i];
      switch (s.kind) {
        case 'query':
          if (i === stmts.length - 1) result = await runCursor(client, s.sql);
          else await client.query(s.sql);
          break;
        case 'commit': await commitPoint(client); break;
        case 'rollback': await client.query(`ROLLBACK TO SAVEPOINT ${TXN_BASE}`); break;
        case 'rollbackTo': await client.query(`ROLLBACK TO SAVEPOINT ${savepointName(s)}`); break;
        case 'savepoint': await client.query(`SAVEPOINT ${savepointName(s)}`); break;
        case 'ddl': await client.query(s.sql); await commitPoint(client); break; // Oracle DDL commits implicitly
        default: await client.query(s.sql);
      }
    }

    const after = opts.capture ? await snapshot(client, schema) : undefined;
    let committed: Snapshot | undefined;
    if (opts.committed) {
      await client.query(`ROLLBACK TO SAVEPOINT ${TXN_BASE}`); // what would survive if the session ended now
      committed = await snapshot(client, schema);
    }
    await client.query('ROLLBACK');
    return { result, before, after, committed };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Grading
// ---------------------------------------------------------------------------

async function gradeByOutput(client: PoolClient, fixture: Stmt[], ref: Stmt[], sub: Stmt[], start: number): Promise<GradeResult> {
  let expected: QueryOutput;
  try {
    expected = (await runSandboxed(client, ref, fixture, { capture: false, committed: false })).result || { columns: [], rows: [] };
  } catch (e) {
    console.error('Reference SQL failed to run:', e);
    return emptyResult(start, 'RUNTIME_ERROR', REFERENCE_FAILED);
  }

  let actual: QueryOutput | null;
  try {
    actual = (await runSandboxed(client, sub, fixture, { capture: false, committed: false })).result;
  } catch (e) {
    return failureFromError(start, e);
  }

  if (!actual) {
    return {
      passed: false, status: 'WRONG_ANSWER',
      output: "Your script executed, but its final statement didn't return any rows. This challenge expects the last statement to be a query (like SELECT).",
      errorMessage: '', runtimeMs: Date.now() - start, resultColumns: [], resultRows: [], totalRows: 0,
      expectedRowCount: expected.rows.length, failureReason: 'NOT_ROW_RETURNING',
      panels: [{ title: 'Result', expected: side(expected), actual: { columns: [], rows: [], total: 0 } }],
    };
  }

  const orderMatters = /\border\s+by\b/i.test(ref[ref.length - 1].sql);
  const reason = compareOutputs(actual, expected, orderMatters);
  const passed = reason === null;
  return {
    passed, status: passed ? 'ACCEPTED' : 'WRONG_ANSWER',
    output: passed ? `Correct: ${actual.rows.length} row(s) match the expected result.` : `Wrong answer (${reason}).`,
    errorMessage: '', runtimeMs: Date.now() - start,
    resultColumns: actual.columns, resultRows: actual.rows.slice(0, DISPLAY_LIMIT), totalRows: actual.rows.length,
    expectedRowCount: expected.rows.length, failureReason: reason,
    panels: passed ? [] : [{ title: 'Result', expected: side(expected), actual: side(actual) }],
  };
}

async function gradeByState(client: PoolClient, fixture: Stmt[], ref: Stmt[], sub: Stmt[], start: number): Promise<GradeResult> {
  // If the reference itself uses COMMIT/ROLLBACK, what actually got committed must match as well.
  const strict = ref.some((s) => s.kind === 'commit' || s.kind === 'rollback');
  const opts = { capture: true, committed: strict };

  let refRun: Run;
  try {
    refRun = await runSandboxed(client, ref, fixture, opts);
  } catch (e) {
    console.error('Reference SQL failed to run:', e);
    return emptyResult(start, 'RUNTIME_ERROR', REFERENCE_FAILED);
  }
  let subRun: Run;
  try {
    subRun = await runSandboxed(client, sub, fixture, opts);
  } catch (e) {
    return failureFromError(start, e);
  }

  let { reason, panels } = diffState(subRun.after || [], refRun.after || []);
  if (!reason && strict) {
    const saved = diffState(subRun.committed || [], refRun.committed || []);
    if (saved.reason) {
      reason = 'COMMIT';
      panels = saved.panels.map((p) => ({ ...p, title: `Saved (committed) state — ${p.title}` }));
    }
  }

  const changed = changedRelation(subRun.before || [], subRun.after || []);
  const shown = changed ? describe(changed) : { columns: [], rows: [] };
  const passed = reason === null;
  return {
    passed, status: passed ? 'ACCEPTED' : 'WRONG_ANSWER',
    output: passed ? 'Correct: the database objects and data match the expected result.' : `Wrong answer (${reason}).`,
    errorMessage: '', runtimeMs: Date.now() - start,
    resultColumns: shown.columns, resultRows: shown.rows.slice(0, DISPLAY_LIMIT), totalRows: shown.rows.length,
    expectedRowCount: null, failureReason: reason, panels: passed ? [] : panels,
  };
}

/** Single entry point. A reference ending in a SELECT is graded by its output; anything else
 *  (DDL, INSERT/UPDATE/DELETE, transactions) is graded by the objects and data it leaves behind. */
export async function gradeSqlSubmission(challenge: { referenceAnswer: string | null; setupSql?: string | null }, submittedSql: string): Promise<GradeResult> {
  const start = Date.now();
  const sub = normalizeSql(submittedSql);
  if (sub.length === 0) return emptyResult(start, 'RUNTIME_ERROR', 'Write a query first.');
  const ref = normalizeSql(challenge.referenceAnswer || '');
  if (ref.length === 0) return emptyResult(start, 'RUNTIME_ERROR', 'This challenge has no reference answer yet. Please report it.');
  const fixture = normalizeSql(challenge.setupSql || '');

  const acquired = await graderPool.connect().catch((e: Error) => e);
  if (acquired instanceof Error) return emptyResult(start, 'RUNTIME_ERROR', `Could not connect to the SQL grading database: ${acquired.message}`);
  const client = acquired;
  try {
    return ref[ref.length - 1].kind === 'query'
      ? await gradeByOutput(client, fixture, ref, sub, start)
      : await gradeByState(client, fixture, ref, sub, start);
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

/** Used by the Admin tester, the public Playground and the sample-data preview. Same sandbox as grading. */
export async function testSqlQuery(sql: string, setupSql?: string | null): Promise<{ ok: boolean; columns: string[]; rows: unknown[][]; message: string; runtimeMs: number }> {
  const start = Date.now();
  const stmts = normalizeSql(sql);
  if (stmts.length === 0) return { ok: false, columns: [], rows: [], message: 'Write a query first.', runtimeMs: Date.now() - start };
  const fixture = normalizeSql(setupSql || '');

  const acquired = await graderPool.connect().catch((e: Error) => e);
  if (acquired instanceof Error) return { ok: false, columns: [], rows: [], message: `Could not connect: ${acquired.message}`, runtimeMs: Date.now() - start };
  const client = acquired;
  try {
    const dataChanging = stmts[stmts.length - 1].kind !== 'query';
    const run = await runSandboxed(client, stmts, fixture, { capture: dataChanging, committed: false });
    if (run.result) {
      return { ok: true, columns: run.result.columns, rows: run.result.rows.slice(0, DISPLAY_LIMIT), message: `${run.result.rows.length} row(s) returned.`, runtimeMs: Date.now() - start };
    }
    const changed = run.before && run.after ? changedRelation(run.before, run.after) : null;
    if (changed) {
      const d = describe(changed);
      return {
        ok: true, columns: d.columns, rows: d.rows.slice(0, DISPLAY_LIMIT),
        message: `Statement(s) executed. Showing "${changed.name}" as it is now. Nothing is saved — every run happens in a throw-away sandbox.`,
        runtimeMs: Date.now() - start,
      };
    }
    return { ok: true, columns: [], rows: [], message: 'Statement(s) executed successfully (no rows returned).', runtimeMs: Date.now() - start };
  } catch (err: any) {
    return { ok: false, columns: [], rows: [], message: err && err.code === '57014' ? 'Query took too long to execute.' : describeError(err), runtimeMs: Date.now() - start };
  } finally {
    client.release();
  }
}