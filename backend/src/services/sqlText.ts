export type StmtKind = 'query' | 'dml' | 'ddl' | 'commit' | 'rollback' | 'rollbackTo' | 'savepoint' | 'blocked';
export interface Stmt { sql: string; kind: StmtKind; word: string }

/** Internal savepoint that marks "the last COMMIT" inside the sandbox transaction. */
export const TXN_BASE = 'urlap_base';

/** Same-length copy of `sql` with comments, string literals, quoted identifiers and $-quoted bodies
 *  blanked out, so keyword scans can't be fooled while character indexes still line up. */
export function maskSql(sql: string): string {
  const out = sql.split('');
  const n = sql.length;
  const blank = (a: number, b: number) => { for (let k = a; k < b; k++) if (out[k] !== '\n') out[k] = ' '; };
  let i = 0;
  while (i < n) {
    const ch = sql[i];
    if (ch === '-' && sql[i + 1] === '-') { const nl = sql.indexOf('\n', i); const e = nl === -1 ? n : nl; blank(i, e); i = e; continue; }
    if (ch === '/' && sql[i + 1] === '*') { const c = sql.indexOf('*/', i + 2); const e = c === -1 ? n : c + 2; blank(i, e); i = e; continue; }
    if (ch === "'" || ch === '"') {
      let j = i + 1;
      while (j < n) {
        if (sql[j] === ch && sql[j + 1] === ch) { j += 2; continue; }
        if (sql[j] === ch) { j += 1; break; }
        j += 1;
      }
      blank(i, j); i = j; continue;
    }
    if (ch === '$') {
      const tag = /^\$[A-Za-z0-9_]*\$/.exec(sql.slice(i));
      if (tag) { const c = sql.indexOf(tag[0], i + tag[0].length); const e = c === -1 ? n : c + tag[0].length; blank(i, e); i = e; continue; }
    }
    i += 1;
  }
  return out.join('');
}

/** Regex replace that only ever matches OUTSIDE strings, comments and quoted identifiers. */
function replaceMasked(sql: string, re: RegExp, repl: string | ((m: RegExpExecArray) => string)): string {
  const masked = maskSql(sql);
  const r = new RegExp(re.source, re.flags.indexOf('g') !== -1 ? re.flags : `${re.flags}g`);
  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = r.exec(masked)) !== null) {
    out += sql.slice(last, m.index) + (typeof repl === 'function' ? repl(m) : repl);
    last = m.index + m[0].length;
    if (m[0].length === 0) r.lastIndex++;
  }
  return out + sql.slice(last);
}

export function splitStatements(sql: string): string[] {
  const masked = maskSql(sql);
  const parts: string[] = [];
  let start = 0;
  for (let i = 0; i <= masked.length; i++) {
    if (i === masked.length || masked[i] === ';') {
      if (masked.slice(start, i).trim()) parts.push(sql.slice(start, i).trim());
      start = i + 1;
    }
  }
  return parts;
}

export function firstWord(sql: string): string {
  const m = /^\s*([A-Za-z]+)/.exec(maskSql(sql));
  return m ? m[1].toLowerCase() : '';
}

const BLOCKED = ['begin', 'start', 'end', 'abort', 'release', 'set', 'reset', 'prepare', 'deallocate', 'declare', 'fetch', 'close', 'move', 'listen', 'unlisten', 'notify', 'load', 'copy', 'lock', 'discard', 'checkpoint', 'vacuum', 'reindex', 'cluster'];
const DDL = ['create', 'alter', 'drop', 'truncate', 'rename', 'comment', 'grant', 'revoke'];

export function classify(sql: string): StmtKind {
  const masked = maskSql(sql).trim();
  const word = firstWord(sql);
  if (word === 'select' || word === 'with') return 'query';
  if (word === 'commit') return 'commit';
  if (word === 'rollback') return /^rollback\b(?:\s+work)?\s+to\b/i.test(masked) ? 'rollbackTo' : 'rollback';
  if (word === 'savepoint') return 'savepoint';
  if (BLOCKED.indexOf(word) !== -1) return 'blocked';
  if (DDL.indexOf(word) !== -1) return 'ddl';
  return 'dml';
}

export function parseSavepoint(sql: string): string | null {
  const m = /^\s*savepoint\s+([A-Za-z_][\w$]*)\s*$/i.exec(maskSql(sql));
  return m ? m[1] : null;
}

export function parseRollbackTo(sql: string): string | null {
  const m = /^\s*rollback(?:\s+work)?\s+to(?:\s+savepoint)?\s+([A-Za-z_][\w$]*)\s*$/i.exec(maskSql(sql));
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// Oracle (+) outer joins -> LEFT JOIN
// ---------------------------------------------------------------------------

function stripPlusMarkers(text: string, mask: string): string {
  const re = /\(\s*\+\s*\)/g;
  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(mask)) !== null) { out += text.slice(last, m.index); last = m.index + m[0].length; }
  return out + text.slice(last);
}

/** SELECT .. FROM a x, b y WHERE x.k(+) = y.k [AND ..]  ->  SELECT .. FROM b y LEFT JOIN a x ON (x.k = y.k) [WHERE ..].
 *  Anything it doesn't fully understand is returned untouched (PostgreSQL then reports its own error). */
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
    while ((mm = r.exec(slice)) !== null) if (depth[from + mm.index] === 0) found.push({ index: from + mm.index, length: mm[0].length });
    return found;
  };

  const fromItems: string[] = [];
  let itemStart = fromStart;
  for (let i = fromStart; i < fromEnd; i++) {
    if (masked[i] === ',' && depth[i] === 0) { fromItems.push(sql.slice(itemStart, i)); itemStart = i + 1; }
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
  for (const a of ands) { conjuncts.push({ text: sql.slice(cs, a.index), mask: masked.slice(cs, a.index) }); cs = a.index + a.length; }
  conjuncts.push({ text: sql.slice(cs, whereEnd), mask: masked.slice(cs, whereEnd) });

  const joinConds: { alias: string; cond: string }[] = [];
  const remaining: string[] = [];
  for (const c of conjuncts) {
    if (!PLUS.test(c.mask)) { if (c.text.trim()) remaining.push(c.text.trim()); continue; }
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

// ---------------------------------------------------------------------------
// Oracle DDL -> PostgreSQL
// ---------------------------------------------------------------------------

function mapOracleTypes(sql: string): string {
  let s = replaceMasked(sql, /\(\s*(\d+)\s+(?:CHAR|BYTE)\s*\)/gi, (m) => `(${m[1]})`);
  s = replaceMasked(s, /\bN?VARCHAR2\b/gi, 'VARCHAR');
  s = replaceMasked(s, /\bNUMBER\b/gi, 'NUMERIC');
  s = replaceMasked(s, /\bN?CLOB\b/gi, 'TEXT');
  s = replaceMasked(s, /\bBLOB\b/gi, 'BYTEA');
  return replaceMasked(s, /\bNCHAR\b/gi, 'CHAR');
}

function parenBody(masked: string, from: number): { start: number; end: number } | null {
  const open = masked.indexOf('(', from);
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < masked.length; i++) {
    if (masked[i] === '(') depth++;
    else if (masked[i] === ')') { depth--; if (depth === 0) return { start: open + 1, end: i }; }
  }
  return null;
}

function splitItems(sql: string, masked: string, start: number, end: number): string[] {
  const items: string[] = [];
  let depth = 0;
  let s = start;
  for (let i = start; i < end; i++) {
    const c = masked[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === ',' && depth === 0) { items.push(sql.slice(s, i).trim()); s = i + 1; }
  }
  items.push(sql.slice(s, end).trim());
  return items.filter(Boolean);
}

/** Oracle MODIFY item ("col type [DEFAULT x] [NOT NULL|NULL]") -> PostgreSQL ALTER COLUMN actions. */
function modifyItem(item: string): string | null {
  const m = /^([A-Za-z_][\w$]*)\s+([\s\S]+)$/.exec(item);
  if (!m) return null;
  const col = m[1];
  let spec = m[2].trim();
  let nullPart: string | null = null;
  let defPart: string | null = null;
  const nn = /\s*\b(NOT\s+NULL|NULL)\s*$/i.exec(maskSql(spec));
  if (nn) {
    nullPart = /^NOT/i.test(nn[1]) ? `ALTER COLUMN ${col} SET NOT NULL` : `ALTER COLUMN ${col} DROP NOT NULL`;
    spec = spec.slice(0, nn.index).trim();
  }
  const dm = /\bDEFAULT\b/i.exec(maskSql(spec));
  if (dm) {
    defPart = `ALTER COLUMN ${col} SET DEFAULT ${spec.slice(dm.index + 7).trim()}`;
    spec = spec.slice(0, dm.index).trim();
  }
  const parts: string[] = [];
  if (spec) parts.push(`ALTER COLUMN ${col} TYPE ${spec}`);
  if (defPart) parts.push(defPart);
  if (nullPart) parts.push(nullPart);
  return parts.length ? parts.join(', ') : null;
}

function dropPrimaryKeyBlock(table: string, cascade: boolean): string {
  const t = table.toLowerCase();
  return `DO $urlap$
DECLARE c text;
BEGIN
  SELECT conname INTO c FROM pg_constraint WHERE conrelid = '${t}'::regclass AND contype = 'p';
  IF c IS NULL THEN
    RAISE EXCEPTION 'Table "${t}" has no PRIMARY KEY to drop.';
  END IF;
  EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I${cascade ? ' CASCADE' : ''}', '${t}', c);
END
$urlap$`;
}

function rewriteAlterTable(stmt: string): string {
  const masked = maskSql(stmt);
  const head = /^\s*alter\s+table\s+((?:[A-Za-z_][\w$]*\s*\.\s*)?[A-Za-z_][\w$]*)\s+(add|modify|drop)\b/i.exec(masked);
  if (!head) return stmt;
  const table = head[1].replace(/\s+/g, '');
  const action = head[2].toLowerCase();
  const restStart = head[0].length;
  const restMasked = masked.slice(restStart);
  const parenthesized = /^\s*\(/.test(restMasked);
  const body = parenthesized ? parenBody(masked, restStart) : null;

  if (action === 'add') {
    if (!body) return stmt; // PostgreSQL-style "ADD COLUMN ..." / "ADD CONSTRAINT ..." / "ADD FOREIGN KEY ..." already valid
    const items = splitItems(stmt, masked, body.start, body.end).map((it) =>
      /^(constraint|primary\s+key|foreign\s+key|unique|check)\b/i.test(it) ? `ADD ${it}` : `ADD COLUMN ${it}`
    );
    return `ALTER TABLE ${table} ${items.join(', ')}`;
  }

  if (action === 'modify') {
    const items = body ? splitItems(stmt, masked, body.start, body.end) : [stmt.slice(restStart).trim()];
    const actions = items.map(modifyItem);
    if (actions.some((a) => a === null)) return stmt;
    return `ALTER TABLE ${table} ${actions.join(', ')}`;
  }

  // drop
  const trimmed = restMasked.trim();
  if (/^primary\s+key\b/i.test(trimmed)) {
    if (!/^[A-Za-z_]\w*$/.test(table)) return stmt;
    return dropPrimaryKeyBlock(table, /\bcascade\b/i.test(trimmed));
  }
  if (body) {
    const cols = splitItems(stmt, masked, body.start, body.end).map((c) => `DROP COLUMN ${c}`);
    return `ALTER TABLE ${table} ${cols.join(', ')}`;
  }
  return replaceMasked(stmt, /\bCASCADE\s+CONSTRAINTS\b/gi, 'CASCADE');
}

function rewriteOracleDdl(stmt: string): string {
  const masked = maskSql(stmt);
  if (/^\s*create\s+table\b/i.test(masked)) return mapOracleTypes(stmt);
  if (/^\s*create\s+sequence\b/i.test(masked)) {
    let s = replaceMasked(stmt, /\bNOCYCLE\b/gi, 'NO CYCLE');
    s = replaceMasked(s, /\bNOMAXVALUE\b/gi, 'NO MAXVALUE');
    s = replaceMasked(s, /\bNOMINVALUE\b/gi, 'NO MINVALUE');
    s = replaceMasked(s, /\bNOCACHE\b/gi, 'CACHE 1');
    return replaceMasked(s, /\b(?:NO)?ORDER\b/gi, '');
  }
  if (/^\s*alter\s+table\b/i.test(masked)) return mapOracleTypes(rewriteAlterTable(stmt));
  if (/^\s*drop\s+table\b/i.test(masked)) return replaceMasked(replaceMasked(stmt, /\s+CASCADE\s+CONSTRAINTS\b/gi, ' CASCADE'), /\s+PURGE\b/gi, '');
  const ren = /^\s*rename\s+([A-Za-z_][\w$]*)\s+to\s+([A-Za-z_][\w$]*)\s*$/i.exec(masked);
  if (ren) return `ALTER TABLE ${ren[1]} RENAME TO ${ren[2]}`;
  return stmt;
}

/** seq.NEXTVAL / seq.CURRVAL -> nextval('seq') / currval('seq') */
function rewriteSequenceRefs(sql: string): string {
  return replaceMasked(sql, /\b([A-Za-z_][\w$]*(?:\.[A-Za-z_][\w$]*)?)\.(nextval|currval)\b/gi, (m) => `${m[2].toLowerCase()}('${m[1]}')`);
}

/** Splits a script into statements, classifies each, and translates Oracle syntax to PostgreSQL. */
export function normalizeSql(sql: string): Stmt[] {
  const withDates = replaceMasked(sql, /\bSYSDATE\b(?!\s*\()/gi, 'CURRENT_DATE');
  return splitStatements(withDates).map((original) => {
    const kind = classify(original);
    let out = original;
    if (kind === 'query') out = rewriteOracleOuterJoins(out);
    if (kind === 'ddl') out = rewriteOracleDdl(out);
    out = rewriteSequenceRefs(out);
    return { sql: out, kind, word: firstWord(original) };
  });
}