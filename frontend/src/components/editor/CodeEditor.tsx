'use client';

import Editor from '@monaco-editor/react';
import { useTheme } from 'next-themes';

interface Props {
  value: string;
  onChange: (val: string) => void;
  language: string;
}

export default function CodeEditor({ value, onChange, language }: Props) {
  const { resolvedTheme } = useTheme();

  return (
    <div className="rounded-2xl overflow-hidden glass">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 dark:border-white/[0.06]">
        <span className="w-3 h-3 rounded-full bg-red-400/70" />
        <span className="w-3 h-3 rounded-full bg-amber-400/70" />
        <span className="w-3 h-3 rounded-full bg-teal-400/70" />
        <span className="ml-2 text-xs font-mono text-slate-500 dark:text-white/40">query.sql</span>
      </div>
      <Editor
        height="460px"
        language="sql"
        value={value}
        onChange={(val) => onChange(val || '')}
        theme={resolvedTheme === 'dark' ? 'vs-dark' : 'vs-light'}
        options={{
          fontSize: 16,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          padding: { top: 16 },
        }}
      />
    </div>
  );
}