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
  expectedColumns?: string[];
  expectedRows?: unknown[][];
  totalRows: number;
  expectedRowCount: number | null;
  failureReason:
    | 'COLUMNS'
    | 'ROW_COUNT'
    | 'ROWS'
    | 'SCHEMA'
    | 'CONSTRAINTS'
    | 'SEQUENCE'
    | 'STEPS'
    | 'NOT_ROW_RETURNING'
    | null;
}

type FailureReason = GradeResult['failureReason'];
interface QueryOutput {
  columns: string[];
  rows: unknown[][];
}

interface ColumnMeta {
  name: string;
  type: string;
  notNull: boolean;
}

interface SequenceState {
  name: string;
  start: string;
  increment: string;
  max: string;
}

interface TableState {
  name: string;
  present: boolean;
  columns: string[];
  columnMeta: ColumnMeta[];
  constraints: string[];
  rows: unknown[][];
}

interface SandboxSnapshot {
  tables: TableState[];
  sequences: SequenceState[];
}

interface SandboxRun {
  result: QueryOutput | null;
  before: SandboxSnapshot | null;
  after: SandboxSnapshot | null;
  stepFingerprints: string[];
  tclEvents: string[];
}

const quoteIdent = (name: string) => `"${name.replace(/"/g, '""')}"`;

function emptyResult(start: number, status: GradeResult['status'], errorMessage: string): GradeResult {
  return {
    passed: false,
    status,
    output: '',
    errorMessage,
    runtimeMs: Date.now() - start,
    resultColumns: [],
    resultRows: [],
    expectedColumns: [],
    expectedRows: [],
    totalRows: 0,
    expectedRowCount: null,
    failureReason: null,
  };
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
// Text handling & Oracle -> PostgreSQL Compatibility
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
        if (sql[j] === "'" && sql[j + 1] === "'") {
          j += 2;
          continue;
        }
        if (sql[j] === "'") {
          j += 1;
          break;
        }
        j += 1;
      }
      current += sql.slice(i, j);
      i = j;
      continue;
    }
    if (ch === '"') {
      let j = i + 1;
      while (j < n) {
        if (sql[j] === '"' && sql[j + 1] === '"') {
          j += 2;
          continue;
        }
        if (sql[j] === '"') {
          j += 1;
          break;
        }
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

/** Rewrites tokens outside string literals, comments, and quoted identifiers. */
function transformOutsideLiterals(sql: string, fn: (chunk: string) => string): string {
  let out = '';
  let buf = '';
  let i = 0;
  const n = sql.length;

  const flush = () => {
    if (buf) {
      out += fn(buf);
      buf = '';
    }
  };

  while (i < n) {
    const ch = sql[i];
    if (ch === '-' && sql[i + 1] === '-') {
      flush();
      const nl = sql.indexOf('\n', i);
      const stop = nl === -1 ? n : nl;
      out += sql.slice(i, stop);
      i = stop;
      continue;
    }
    if (ch === '/' && sql[i + 1] === '*') {
      flush();
      const end = sql.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      out += sql.slice(i, stop);
      i = stop;
      continue;
    }
    if (ch === "'" || ch === '"') {
      flush();
      let j = i + 1;
      while (j < n) {
        if (sql[j] === ch && sql[j + 1] === ch) {
          j += 2;
          continue;
        }
        if (sql[j] === ch) {
          j += 1;
          break;
        }
        j += 1;
      }
      out += sql.slice(i, j);
      i = j;
      continue;
    }
    if (ch === '$') {
      const tagMatch = /^\$([A-Za-z0-9_]*)\$/.exec(sql.slice(i));
      if (tagMatch) {
        flush();
        const tag = tagMatch[0];
        const closeIdx = sql.indexOf(tag, i + tag.length);
        const stop = closeIdx === -1 ? n : closeIdx + tag.length;
        out += sql.slice(i, stop);
        i = stop;
        continue;
      }
    }
    buf += ch;
    i += 1;
  }
  flush();
  return out;
}

/** Oracle compatibility rewrites: SYSDATE, VARCHAR2, NUMBER, seq.NEXTVAL/CURRVAL, and Oracle DDL syntax. */
function applyCompatibilityRewrites(sql: string): string {
  const tokenRewritten = transformOutsideLiterals(sql, (chunk) => {
    return chunk
      // SYSDATE -> CURRENT_DATE
      .replace(/\bSYSDATE\b(?!\s*\()/gi, 'CURRENT_DATE')
      // NVARCHAR2(n) / VARCHAR2(n [BYTE|CHAR]) -> VARCHAR(n)
      .replace(/\bN?VARCHAR2\s*\(\s*(\d+)(?:\s+(?:BYTE\vert{}CHAR))?\s*\)/gi, 'VARCHAR($1)')
      // NUMBER(p, s) -> NUMERIC(p, s)
      .replace(/\bNUMBER\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/gi, 'NUMERIC($1, $2)')
      // NUMBER(p) -> NUMERIC(p)
      .replace(/\bNUMBER\s*\(\s*(\d+)\s*\)/gi, 'NUMERIC($1)')
      // Bare NUMBER -> NUMERIC
      .replace(/\bNUMBER\b/gi, 'NUMERIC')
      // seq.NEXTVAL / seq.CURRVAL -> nextval('seq') / currval('seq')
      .replace(/\b([A-Za-z_][\w$]*)\s*\.\s*NEXTVAL\b/gi, (_, seq) => `nextval('${seq.toLowerCase()}')`)
      .replace(/\b([A-Za-z_][\w$]*)\s*\.\s*CURRVAL\b/gi, (_, seq) => `currval('${seq.toLowerCase()}')`)
      // Sequence options in Oracle
      .replace(/\bNOCACHE\b/gi, '')
      .replace(/\bNOCYCLE\b/gi, 'NO CYCLE')
      .replace(/\bNOMAXVALUE\b/gi, 'NO MAXVALUE')
      .replace(/\bNOMINVALUE\b/gi, 'NO MINVALUE');
  });

  return rewriteOracleDdlStatement(tokenRewritten);
}

/** Rewrites Oracle-specific ALTER TABLE statements into valid PostgreSQL DDL. */
function rewriteOracleDdlStatement(stmt: string): string {
  let s = stmt.trim();

  // 1. ALTER TABLE <tbl> DROP PRIMARY KEY [CASCADE] -> ALTER TABLE <tbl> DROP CONSTRAINT <tbl>_pkey [CASCADE]
  s = s.replace(
    /^(\s*ALTER\s+TABLE\s+([A-Za-z_][\w$]*)\s+)DROP\s+PRIMARY\s+KEY(\s+CASCADE)?\s*$/i,
    (_, prefix, tbl, cascade) => `${prefix}DROP CONSTRAINT ${tbl.toLowerCase()}_pkey${cascade || ''}`
  );

  // 2. ALTER TABLE <tbl> MODIFY (col type ...) or ALTER TABLE <tbl> MODIFY [COLUMN] col type
  s = s.replace(
    /^(\s*ALTER\s+TABLE\s+[A-Za-z_][\w$]*\s+)MODIFY\s*\(\s*([A-Za-z_][\w$]*)\s+([^)]+?)\s*\)\s*$/i,
    '$1ALTER COLUMN $2 TYPE $3'
  );
  s = s.replace(
    /^(\s*ALTER\s+TABLE\s+[A-Za-z_][\w$]*\s+)MODIFY(?:\s+COLUMN)?\s+([A-Za-z_][\w$]*)\s+(.+?)\s*$/i,
    '$1ALTER COLUMN $2 TYPE $3'
  );

  // 3. ALTER TABLE <tbl> ADD (<col_def>) -> ALTER TABLE <tbl> ADD COLUMN <col_def>
  // (Skip if inside parens starts with CONSTRAINT / PRIMARY / FOREIGN / UNIQUE / CHECK)
  const addParenMatch = /^(\s*ALTER\s+TABLE\s+[A-Za-z_][\w$]*\s+)ADD\s*\(\s*([\s\S]+)\s*\)\s*$/i.exec(s);
  if (addParenMatch) {
    const prefix = addParenMatch[1];
    const inner = addParenMatch[2].trim();
    if (!/^(CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|CHECK)\b/i.test(inner)) {
      s = `${prefix}ADD COLUMN ${inner}`;
    }
  }

  return s;
}

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
        if (sql[j] === ch && sql[j + 1] === ch) {
          j += 2;
          continue;
        }
        if (sql[j] === ch) {
          j += 1;
          break;
        }
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

  if (/\bJOIN\b/i.test(masked.slice(fromStart, fromEnd))) return sql;

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
  if (items.some((it, i) => items.findIndex((o) => o.alias === it.alias) !== i)) return sql;

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
  return splitStatements(sql)
    .map(applyCompatibilityRewrites)
    .map(rewriteOracleOuterJoins);
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

function firstWord(stmt: string): string {
  const m = /^[a-zA-Z]+/.exec(stripLeadingCommentsAndWhitespace(stmt));
  return m ? m[0].toLowerCase() : '';
}

function isRowReturning(stmt: string): boolean {
  const w = firstWord(stmt);
  return w === 'select' || w === 'with';
}

// Note: SAVEPOINT, ROLLBACK, and COMMIT are now handled safely inside `runSandboxed`
const BLOCKED_FIRST_WORDS = [
  'begin', 'start', 'end', 'abort',
  'set', 'reset', 'prepare', 'deallocate', 'declare', 'fetch', 'close', 'move',
  'listen', 'unlisten', 'notify', 'load', 'copy', 'lock', 'discard', 'checkpoint',
  'vacuum', 'reindex', 'cluster', 'grant', 'revoke', 'truncate',
];

function assertStatementsAllowed(statements: string[]): void {
  for (const stmt of statements) {
    const word = firstWord(stmt);
    if (BLOCKED_FIRST_WORDS.indexOf(word) !== -1) {
      const err: any = new Error(
        `"${word.toUpperCase()}" statements aren't allowed here.`
      );
      err.blocked = true;
      throw err;
    }
  }
}

// ---------------------------------------------------------------------------
// Value & Schema comparison
// ---------------------------------------------------------------------------

function normalizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number') return Math.round(value * 1e9) / 1e9;
  if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) {
    const num = Number(value);
    if (!Number.isNaN(num)) return Math.round(num * 1e9) / 1e9;
  }
  return value;
}
const rowKey = (row: unknown[]) => JSON.stringify(row.map(normalizeValue));

function normalizePgType(typeStr: string): string {
  return typeStr
    .toLowerCase()
    .replace(/\bcharacter varying\b/g, 'varchar')
    .replace(/\bcharacter\b/g, 'char')
    .replace(/\binteger\b/g, 'numeric')
    .replace(/\bbigint\b/g, 'numeric')
    .replace(/\bsmallint\b/g, 'numeric')
    .replace(/\s+/g, '');
}

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

function compareSnapshots(
  subRun: SandboxRun,
  refRun: SandboxRun
): { reason: FailureReason; detail: string } {
  const submitted = subRun.after!;
  const expected = refRun.after!;

  // 1. Compare sequences (if reference created/modified sequences)
  if (expected.sequences.length > 0) {
    for (const expSeq of expected.sequences) {
      const subSeq = submitted.sequences.find((s) => s.name === expSeq.name);
      if (
        !subSeq ||
        subSeq.start !== expSeq.start ||
        subSeq.increment !== expSeq.increment ||
        subSeq.max !== expSeq.max
      ) {
        return {
          reason: 'SEQUENCE',
          detail: `Sequence "${expSeq.name}" is missing or its START/INCREMENT/MAXVALUE settings do not match.`,
        };
      }
    }
  }

  // 2. Compare tables, column types, constraints, and row data
  for (const exp of expected.tables) {
    const sub = submitted.tables.find((t) => t.name === exp.name);
    if (!sub || sub.present !== exp.present) {
      return {
        reason: 'SCHEMA',
        detail: exp.present
          ? `Expected table "${exp.name}" to exist, but it was not found.`
          : `Expected table "${exp.name}" to be dropped, but it still exists.`,
      };
    }
    if (!exp.present) continue;

    // Column count & metadata (name, data type, NOT NULL)
    if (sub.columnMeta.length !== exp.columnMeta.length) {
      return {
        reason: 'COLUMNS',
        detail: `Table "${exp.name}" has ${sub.columnMeta.length} column(s), expected ${exp.columnMeta.length}.`,
      };
    }
    for (let i = 0; i < exp.columnMeta.length; i++) {
      const ec = exp.columnMeta[i];
      const sc = sub.columnMeta.find((c) => c.name === ec.name);
      if (!sc) {
        return {
          reason: 'SCHEMA',
          detail: `Column "${ec.name}" is missing on table "${exp.name}".`,
        };
      }
      if (sc.type !== ec.type) {
        return {
          reason: 'SCHEMA',
          detail: `Column "${exp.name}.${ec.name}" has type "${sc.type}", expected "${ec.type}".`,
        };
      }
      if (sc.notNull !== ec.notNull) {
        return {
          reason: 'CONSTRAINTS',
          detail: `Column "${exp.name}.${ec.name}" NOT NULL constraint does not match expected definition.`,
        };
      }
    }

    // Table constraints (PK, FK, UNIQUE, CHECK)
    const expConstraints = exp.constraints.slice().sort();
    const subConstraints = sub.constraints.slice().sort();
    if (JSON.stringify(expConstraints) !== JSON.stringify(subConstraints)) {
      return {
        reason: 'CONSTRAINTS',
        detail: `Constraints on table "${exp.name}" do not match expected PRIMARY KEY, FOREIGN KEY, UNIQUE, or CHECK definitions.`,
      };
    }

    // Row data
    if (sub.rows.length !== exp.rows.length) {
      return {
        reason: 'ROW_COUNT',
        detail: `Table "${exp.name}" has ${sub.rows.length} row(s), expected ${exp.rows.length}.`,
      };
    }
    if (JSON.stringify(sub.rows.map(rowKey).sort()) !== JSON.stringify(exp.rows.map(rowKey).sort())) {
      return {
        reason: 'ROWS',
        detail: `The rows in table "${exp.name}" do not match the expected data.`,
      };
    }
  }

  // 3. Verify TCL events if reference used TCL (SAVEPOINT, ROLLBACK TO, COMMIT)
  if (refRun.tclEvents.length > 0) {
    if (JSON.stringify(subRun.tclEvents) !== JSON.stringify(refRun.tclEvents)) {
      return {
        reason: 'STEPS',
        detail: `Expected transaction control steps (${refRun.tclEvents.join(' -> ')}) were not executed in the required order.`,
      };
    }
  }

  // 4. Verify intermediate step states for multi-step challenges (e.g. ADD then DROP column, or INSERT then ROLLBACK TO)
  if (refRun.stepFingerprints.length > 1) {
    let subIdx = 0;
    for (const reqFp of refRun.stepFingerprints) {
      while (subIdx < subRun.stepFingerprints.length && subRun.stepFingerprints[subIdx] !== reqFp) {
        subIdx++;
      }
      if (subIdx >= subRun.stepFingerprints.length) {
        return {
          reason: 'STEPS',
          detail: 'One or more required intermediate steps in the multi-statement challenge were skipped or incorrect.',
        };
      }
      subIdx++;
    }
  }

  return { reason: null, detail: '' };
}

const tableFingerprint = (t: TableState) =>
  JSON.stringify([
    t.name,
    t.present,
    t.columnMeta,
    t.constraints.slice().sort(),
    t.rows.map(rowKey).sort(),
  ]);

const snapshotFingerprint = (s: SandboxSnapshot) =>
  JSON.stringify({
    tables: s.tables.map(tableFingerprint),
    sequences: s.sequences,
  });

function firstChangedTable(before: TableState[], after: TableState[]): string | null {
  for (const a of after) {
    const b = before.find((t) => t.name === a.name);
    if (!b || tableFingerprint(a) !== tableFingerprint(b)) return a.name;
  }
  for (const b of before) {
    const a = after.find((t) => t.name === b.name);
    if (!a || tableFingerprint(a) !== tableFingerprint(b)) return b.name;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Sandbox execution & Lab 4 Environment Preparation
// ---------------------------------------------------------------------------

async function runCursor(client: PoolClient, sql: string): Promise<QueryOutput> {
  await client.query(`DECLARE grader_cur NO SCROLL CURSOR FOR\n${sql}\n`);
  const res = await client.query({ text: `FETCH ${FETCH_LIMIT} FROM grader_cur`, rowMode: 'array' });
  await client.query('CLOSE grader_cur');
  return { columns: res.fields.map((f) => f.name), rows: res.rows as unknown[][] };
}

async function prepareSandbox(client: PoolClient, targetsToCreateFresh: Set<string>): Promise<void> {
  const res = await client.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = '${SANDBOX_SCHEMA}' ORDER BY tablename`
  );
  const names = res.rows.map((r) => r.tablename);
  for (const name of names) {
    const q = quoteIdent(name);
    await client.query(`CREATE TEMP TABLE ${q} (LIKE ${SANDBOX_SCHEMA}.${q} INCLUDING ALL) ON COMMIT DROP`);
    await client.query(`INSERT INTO pg_temp.${q} SELECT * FROM ${SANDBOX_SCHEMA}.${q}`);
  }

  // Ensure temp schema is searched first so unqualified CREATE TABLE / SEQUENCE lands in pg_temp
  await client.query(`SET LOCAL search_path = pg_temp, ${SANDBOX_SCHEMA}, public`);

  // Ensure Lab 4 auxiliary tables and constraints exist in pg_temp
  if (names.includes('departments')) {
    const pkCheck = await client.query(
      `SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid JOIN pg_namespace n ON n.oid = t.relnamespace
       WHERE n.nspname LIKE 'pg_temp%' AND t.relname = 'departments' AND c.contype = 'p'`
    );
    if (pkCheck.rowCount === 0) {
      await client
        .query(`ALTER TABLE pg_temp.departments ADD CONSTRAINT departments_pkey PRIMARY KEY (department_id)`)
        .catch(() => undefined);
    }
  }

  if (names.includes('employees')) {
    const empPkCheck = await client.query(
      `SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid JOIN pg_namespace n ON n.oid = t.relnamespace
       WHERE n.nspname LIKE 'pg_temp%' AND t.relname = 'employees' AND c.contype = 'p'`
    );
    if (empPkCheck.rowCount === 0) {
      await client
        .query(`ALTER TABLE pg_temp.employees ADD CONSTRAINT employees_pkey PRIMARY KEY (employee_id)`)
        .catch(() => undefined);
    }
    const fkCheck = await client.query(
      `SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid JOIN pg_namespace n ON n.oid = t.relnamespace
       WHERE n.nspname LIKE 'pg_temp%' AND t.relname = 'employees' AND c.conname = 'emp_manager_fk'`
    );
    if (fkCheck.rowCount === 0) {
      await client
        .query(
          `ALTER TABLE pg_temp.employees ADD CONSTRAINT emp_manager_fk FOREIGN KEY (manager_id) REFERENCES pg_temp.employees(employee_id)`
        )
        .catch(() => undefined);
    }
  }

  if (!names.includes('dept')) {
    await client.query(`
      CREATE TEMP TABLE dept (
        deptno NUMERIC(4),
        dname VARCHAR(14),
        loc VARCHAR(13)
      ) ON COMMIT DROP
    `);
  }

  if (!names.includes('dept80')) {
    await client.query(`
      CREATE TEMP TABLE dept80 (
        employee_id NUMERIC(6),
        last_name VARCHAR(20),
        annsal NUMERIC(10,2),
        hire_date DATE
      ) ON COMMIT DROP
    `);
    if (names.includes('employees')) {
      await client
        .query(
          `INSERT INTO pg_temp.dept80 (employee_id, last_name, annsal, hire_date)
           SELECT employee_id, SUBSTRING(last_name FROM 1 FOR 20), salary * 12, hire_date
           FROM pg_temp.employees WHERE department_id = 80`
        )
        .catch(() => undefined);
    }
  }

  if (!names.includes('emp')) {
    await client.query(`
      CREATE TEMP TABLE emp (
        empno NUMERIC(4) PRIMARY KEY,
        ename VARCHAR(10),
        job VARCHAR(9),
        mgr NUMERIC(4),
        hiredate DATE,
        sal NUMERIC(7,2),
        comm NUMERIC(7,2),
        deptno NUMERIC(2)
      ) ON COMMIT DROP;
      INSERT INTO pg_temp.emp VALUES
        (7369, 'SMITH',  'CLERK',   7902, '1980-12-17',  800.00, NULL, 20),
        (7499, 'ALLEN',  'SALESMAN',7698, '1981-02-20', 1600.00, 300.00, 30),
        (7566, 'JONES',  'MANAGER', 7839, '1981-04-02', 2975.00, NULL, 20),
        (7876, 'ADAMS',  'CLERK',   7788, '1987-05-23', 1100.00, NULL, 20),
        (7900, 'JAMES',  'CLERK',   7698, '1981-12-03',  950.00, NULL, 30),
        (7934, 'MILLER', 'CLERK',   7782, '1982-01-23', 1300.00, NULL, 10);
    `);
  }

  if (!names.includes('region')) {
    await client.query(`
      CREATE TEMP TABLE region (
        id NUMERIC(4) PRIMARY KEY,
        name VARCHAR(50)
      ) ON COMMIT DROP;
      INSERT INTO pg_temp.region VALUES (1, 'Europe'), (2, 'Americas'), (3, 'Asia'), (4, 'Middle East and Africa');
    `);
  }

  // If the challenge itself is testing `CREATE TABLE <name>`, drop the pre-seeded temp table first
  for (const tbl of targetsToCreateFresh) {
    await client.query(`DROP TABLE IF EXISTS pg_temp.${quoteIdent(tbl)} CASCADE`);
  }
}

async function snapshotState(client: PoolClient): Promise<SandboxSnapshot> {
  const tblRes = await client.query<{ oid: number; relname: string }>(`
    SELECT c.oid, c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname LIKE 'pg_temp%' AND c.relkind = 'r'
    ORDER BY c.relname
  `);

  const tables: TableState[] = [];
  for (const row of tblRes.rows) {
    const name = row.relname;
    const q = quoteIdent(name);

    const colRes = await client.query<{ attname: string; data_type: string; attnotnull: boolean }>(
      `SELECT a.attname, format_type(a.atttypid, a.atttypmod) AS data_type, a.attnotnull
       FROM pg_attribute a
       WHERE a.attrelid = $1 AND a.attnum > 0 AND NOT a.attisdropped
       ORDER BY a.attnum`,
      [row.oid]
    );

    const columnMeta: ColumnMeta[] = colRes.rows.map((c) => ({
      name: c.attname.toLowerCase(),
      type: normalizePgType(c.data_type),
      notNull: Boolean(c.attnotnull),
    }));

    const conRes = await client.query<{ contype: string; def: string }>(
      `SELECT c.contype, pg_get_constraintdef(c.oid, true) AS def
       FROM pg_constraint c
       WHERE c.conrelid = $1 AND c.contype IN ('p', 'u', 'f', 'c')`,
      [row.oid]
    );

    const constraints = conRes.rows
      .map((c) => `${c.contype}:${c.def.toLowerCase().replace(/pg_temp\./g, '').replace(/\s+/g, ' ').trim()}`)
      .sort();

    const dataRes = await client.query({
      text: `SELECT * FROM pg_temp.${q} LIMIT ${FETCH_LIMIT}`,
      rowMode: 'array',
    });

    tables.push({
      name,
      present: true,
      columns: dataRes.fields.map((f) => f.name),
      columnMeta,
      constraints,
      rows: dataRes.rows as unknown[][],
    });
  }

  const seqRes = await client.query<{
    relname: string;
    seqstart: string;
    seqincrement: string;
    seqmax: string;
  }>(`
    SELECT c.relname, s.seqstart::text, s.seqincrement::text, s.seqmax::text
    FROM pg_sequence s
    JOIN pg_class c ON c.oid = s.seqrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname LIKE 'pg_temp%'
    ORDER BY c.relname
  `);

  const sequences: SequenceState[] = seqRes.rows.map((s) => ({
    name: s.relname.toLowerCase(),
    start: s.seqstart,
    increment: s.seqincrement,
    max: s.seqmax,
  }));

  return { tables, sequences };
}

function extractCreatedTables(statements: string[]): Set<string> {
  const created = new Set<string>();
  for (const stmt of statements) {
    const m = /^\s*CREATE\s+(?:TEMP(?:ORARY)?\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?("?[A-Za-z_][\w$]*"?)/i.exec(
      stripLeadingCommentsAndWhitespace(stmt)
    );
    if (m) {
      created.add(m[1].replace(/"/g, '').toLowerCase());
    }
  }
  return created;
}

/** Runs the statements inside a sandboxed transaction that ALWAYS ends in ROLLBACK. */
async function runSandboxed(
  client: PoolClient,
  statements: string[],
  captureState: boolean,
  targetsToCreateFresh: Set<string> = new Set()
): Promise<SandboxRun> {
  assertStatementsAllowed(statements);

  await client.query('BEGIN');
  try {
    await client.query(`SET LOCAL statement_timeout = '${STATEMENT_TIMEOUT_MS}ms'`);
    await prepareSandbox(client, targetsToCreateFresh);
    await client.query('SAVEPOINT __grader_root');

    const before = captureState ? await snapshotState(client) : null;
    const stepFingerprints: string[] = [];
    const tclEvents: string[] = [];

    let result: QueryOutput | null = null;
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const cleaned = stripLeadingCommentsAndWhitespace(stmt).trim();
      const word = firstWord(cleaned);

      if (word === 'savepoint') {
        const spMatch = /^SAVEPOINT\s+([A-Za-z_][\w$]*)\s*$/i.exec(cleaned);
        if (!spMatch || spMatch[1].toLowerCase().startsWith('__grader')) {
          throw new Error('Invalid SAVEPOINT name.');
        }
        await client.query(`SAVEPOINT ${quoteIdent(spMatch[1].toLowerCase())}`);
        tclEvents.push(`SAVEPOINT:${spMatch[1].toLowerCase()}`);
      } else if (word === 'rollback') {
        const rbToMatch = /^ROLLBACK\s+TO(?:\s+SAVEPOINT)?\s+([A-Za-z_][\w$]*)\s*$/i.exec(cleaned);
        if (rbToMatch) {
          const spName = rbToMatch[1].toLowerCase();
          await client.query(`ROLLBACK TO SAVEPOINT ${quoteIdent(spName)}`);
          tclEvents.push(`ROLLBACK_TO:${spName}`);
        } else if (/^ROLLBACK(?:\s+WORK|\s+TRANSACTION)?\s*$/i.test(cleaned)) {
          await client.query('ROLLBACK TO SAVEPOINT __grader_root');
          await client.query('SAVEPOINT __grader_root');
          tclEvents.push('ROLLBACK');
        } else {
          throw new Error('Unsupported ROLLBACK syntax.');
        }
      } else if (word === 'commit') {
        await client.query('SAVEPOINT __grader_commit_marker');
        tclEvents.push('COMMIT');
      } else if (i === statements.length - 1 && isRowReturning(cleaned)) {
        result = await runCursor(client, stmt);
      } else {
        await client.query(stmt);
      }

      if (captureState) {
        const snap = await snapshotState(client);
        stepFingerprints.push(snapshotFingerprint(snap));
      }
    }

    const after = captureState ? await snapshotState(client) : null;
    await client.query('ROLLBACK');
    return { result, before, after, stepFingerprints, tclEvents };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Grading
// ---------------------------------------------------------------------------

async function gradeByOutput(
  client: PoolClient,
  refStatements: string[],
  submittedStatements: string[],
  start: number
): Promise<GradeResult> {
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
      passed: false,
      status: 'WRONG_ANSWER',
      output:
        "Your script executed, but its final statement didn't return any rows — this challenge expects the last statement to be a query (like SELECT) that returns data.",
      errorMessage: '',
      runtimeMs: Date.now() - start,
      resultColumns: [],
      resultRows: [],
      expectedColumns: ref.columns,
      expectedRows: ref.rows.slice(0, DISPLAY_LIMIT),
      totalRows: 0,
      expectedRowCount: ref.rows.length,
      failureReason: 'NOT_ROW_RETURNING',
    };
  }

  const orderMatters = /\border\s+by\b/i.test(refStatements[refStatements.length - 1]);
  const failureReason = compareOutputs(submitted, ref, orderMatters);
  const passed = failureReason === null;

  return {
    passed,
    status: passed ? 'ACCEPTED' : 'WRONG_ANSWER',
    output: passed
      ? `Correct: ${submitted.rows.length} row(s) match the expected result.`
      : `Wrong answer (${failureReason}).`,
    errorMessage: '',
    runtimeMs: Date.now() - start,
    resultColumns: submitted.columns,
    resultRows: submitted.rows.slice(0, DISPLAY_LIMIT),
    expectedColumns: ref.columns,
    expectedRows: ref.rows.slice(0, DISPLAY_LIMIT),
    totalRows: submitted.rows.length,
    expectedRowCount: ref.rows.length,
    failureReason,
  };
}

async function gradeByState(
  client: PoolClient,
  refStatements: string[],
  submittedStatements: string[],
  start: number
): Promise<GradeResult> {
  const targetsToCreateFresh = extractCreatedTables(refStatements);

  let refRun: SandboxRun;
  try {
    refRun = await runSandboxed(client, refStatements, true, targetsToCreateFresh);
  } catch (refErr) {
    console.error('Reference SQL failed to run:', refErr);
    return emptyResult(start, 'RUNTIME_ERROR', REFERENCE_FAILED);
  }

  let subRun: SandboxRun;
  try {
    subRun = await runSandboxed(client, submittedStatements, true, targetsToCreateFresh);
  } catch (dbErr) {
    return failureFromError(start, dbErr);
  }

  const { reason: failureReason, detail } = compareSnapshots(subRun, refRun);
  const passed = failureReason === null;

  const submittedTables = subRun.after ? subRun.after.tables : [];
  const expectedTables = refRun.after ? refRun.after.tables : [];
  const beforeTables = subRun.before ? subRun.before.tables : [];

  const changedName =
    firstChangedTable(beforeTables, submittedTables) ||
    firstChangedTable(refRun.before ? refRun.before.tables : [], expectedTables);

  const changed = changedName ? submittedTables.find((t) => t.name === changedName) : undefined;
  const expectedChanged = changedName ? expectedTables.find((t) => t.name === changedName) : undefined;

  return {
    passed,
    status: passed ? 'ACCEPTED' : 'WRONG_ANSWER',
    output: passed
      ? 'Correct: the database schema, constraints, and table data match the expected result.'
      : `Wrong answer (${failureReason}) — ${detail || "the state after your statement doesn't match what's expected."}`,
    errorMessage: '',
    runtimeMs: Date.now() - start,
    resultColumns: changed ? changed.columns : [],
    resultRows: changed ? changed.rows.slice(0, DISPLAY_LIMIT) : [],
    expectedColumns: expectedChanged ? expectedChanged.columns : [],
    expectedRows: expectedChanged ? expectedChanged.rows.slice(0, DISPLAY_LIMIT) : [],
    totalRows: changed ? changed.rows.length : 0,
    expectedRowCount: expectedChanged ? expectedChanged.rows.length : null,
    failureReason,
  };
}

export async function gradeSqlSubmission(
  challenge: { referenceAnswer: string | null },
  submittedSql: string
): Promise<GradeResult> {
  const start = Date.now();

  const submittedStatements = normalizeSql(submittedSql);
  if (submittedStatements.length === 0) return emptyResult(start, 'RUNTIME_ERROR', 'Write a query first.');

  const refStatements = normalizeSql(challenge.referenceAnswer || '');
  if (refStatements.length === 0) {
    return emptyResult(start, 'RUNTIME_ERROR', 'This challenge has no reference answer yet. Please report it.');
  }

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

export async function runSqlGraded(referenceSql: string, submittedSql: string): Promise<GradeResult> {
  return gradeSqlSubmission({ referenceAnswer: referenceSql }, submittedSql);
}

export async function testSqlQuery(sql: string): Promise<{
  ok: boolean;
  columns: string[];
  rows: unknown[][];
  message: string;
  runtimeMs: number;
}> {
  const start = Date.now();
  const statements = normalizeSql(sql);
  if (statements.length === 0) {
    return { ok: false, columns: [], rows: [], message: 'Write a query first.', runtimeMs: Date.now() - start };
  }

  const acquired = await graderPool.connect().catch((e: Error) => e);
  if (acquired instanceof Error) {
    return { ok: false, columns: [], rows: [], message: `Could not connect: ${acquired.message}`, runtimeMs: Date.now() - start };
  }
  const client = acquired;

  try {
    const dataChanging = !isRowReturning(statements[statements.length - 1]);
    const targetsToCreateFresh = extractCreatedTables(statements);
    const run = await runSandboxed(client, statements, dataChanging, targetsToCreateFresh);

    if (run.result) {
      return {
        ok: true,
        columns: run.result.columns,
        rows: run.result.rows.slice(0, DISPLAY_LIMIT),
        message: `${run.result.rows.length} row(s) returned.`,
        runtimeMs: Date.now() - start,
      };
    }

    const beforeTables = run.before ? run.before.tables : [];
    const afterTables = run.after ? run.after.tables : [];
    const changedName = firstChangedTable(beforeTables, afterTables);
    if (changedName) {
      const afterTable = afterTables.find((t) => t.name === changedName);
      if (afterTable && afterTable.present) {
        return {
          ok: true,
          columns: afterTable.columns,
          rows: afterTable.rows.slice(0, DISPLAY_LIMIT),
          message: `Statement(s) executed on "${changedName}" (${afterTable.columns.length} column(s), ${afterTable.rows.length} row(s)). Sandbox resets after every run.`,
          runtimeMs: Date.now() - start,
        };
      }
    }
    return {
      ok: true,
      columns: [],
      rows: [],
      message: 'Statement(s) executed successfully (no rows returned).',
      runtimeMs: Date.now() - start,
    };
  } catch (err: any) {
    return {
      ok: false,
      columns: [],
      rows: [],
      message: err && err.code === '57014' ? 'Query took too long to execute.' : describeError(err),
      runtimeMs: Date.now() - start,
    };
  } finally {
    client.release();
  }
}