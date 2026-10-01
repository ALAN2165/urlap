'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Table2 } from 'lucide-react';
import { Schema, SchemaColumn } from '@/types';

interface Props {
  value: string | null;
  onChange: (json: string) => void;
}

function parseSchema(value: string | null): Schema {
  if (!value) return { tables: [] };
  try {
    const parsed = JSON.parse(value);
    if (parsed && Array.isArray(parsed.tables)) return parsed;
  } catch {}
  return { tables: [] };
}

export default function SchemaBuilder({ value, onChange }: Props) {
  const [schema, setSchema] = useState<Schema>(() => parseSchema(value));

  useEffect(() => {
    setSchema(parseSchema(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // hydrate once from the initial value; afterward this component owns the state

  function commit(next: Schema) {
    setSchema(next);
    onChange(JSON.stringify(next));
  }

  const addTable = () => commit({ tables: [...schema.tables, { name: 'table_name', columns: [{ name: 'id', type: 'int', key: 'PK' }] }] });
  const removeTable = (ti: number) => commit({ tables: schema.tables.filter((_, i) => i !== ti) });
  const updateTableName = (ti: number, name: string) => commit({ tables: schema.tables.map((t, i) => (i === ti ? { ...t, name } : t)) });
  const addColumn = (ti: number) => commit({ tables: schema.tables.map((t, i) => (i === ti ? { ...t, columns: [...t.columns, { name: 'column_name', type: 'varchar' }] } : t)) });
  const removeColumn = (ti: number, ci: number) => commit({ tables: schema.tables.map((t, i) => (i === ti ? { ...t, columns: t.columns.filter((_, j) => j !== ci) } : t)) });
  const updateColumn = (ti: number, ci: number, patch: Partial<SchemaColumn>) =>
    commit({ tables: schema.tables.map((t, i) => (i === ti ? { ...t, columns: t.columns.map((c, j) => (j === ci ? { ...c, ...patch } : c)) } : t)) });

  return (
    <div className="space-y-4">
      {schema.tables.map((table, ti) => (
        <motion.div key={ti} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700/50 dark:bg-slate-800/30">
          <div className="mb-3 flex items-center gap-2">
            <Table2 size={15} className="text-purple-400" />
            <input
              value={table.name}
              onChange={(e) => updateTableName(ti, e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-sm font-semibold text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-700/50 dark:bg-slate-900/50 dark:text-white"
              placeholder="table_name"
            />
            <button type="button" onClick={() => removeTable(ti)} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-500">
              <Trash2 size={14} />
            </button>
          </div>

          <div className="space-y-2">
            {table.columns.map((col, ci) => (
              <div key={ci} className="flex items-center gap-2">
                <input
                  value={col.name}
                  onChange={(e) => updateColumn(ti, ci, { name: e.target.value })}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-700/50 dark:bg-slate-900/50 dark:text-white"
                  placeholder="column_name"
                />
                <input
                  value={col.type}
                  onChange={(e) => updateColumn(ti, ci, { type: e.target.value })}
                  className="w-24 flex-shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-700/50 dark:bg-slate-900/50 dark:text-white"
                  placeholder="type"
                />
                <select
                  value={col.key ?? ''}
                  onChange={(e) => updateColumn(ti, ci, { key: (e.target.value || undefined) as SchemaColumn['key'] })}
                  className="w-20 flex-shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-700/50 dark:bg-slate-900/50 dark:text-white"
                >
                  <option value="">—</option>
                  <option value="PK">PK</option>
                  <option value="FK">FK</option>
                </select>
                <button type="button" onClick={() => removeColumn(ti, ci)} className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-500">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>

          <button type="button" onClick={() => addColumn(ti)} className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:underline dark:text-purple-400">
            <Plus size={13} />
            Add column
          </button>
        </motion.div>
      ))}

      <button
        type="button"
        onClick={addTable}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 py-3 text-sm font-semibold text-slate-500 hover:border-purple-400 hover:text-purple-500 dark:border-slate-700"
      >
        <Plus size={15} />
        Add table
      </button>
    </div>
  );
}