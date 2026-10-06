'use client';

import Editor from '@monaco-editor/react';
import { useTheme } from 'next-themes';

interface Props {
  value: string;
  onChange: (val: string) => void;
  language: string;
  onPaste?: (pastedLength: number) => void;
}

const MONACO_LANG_MAP: Record<string, string> = {
  SQL: 'sql', JAVASCRIPT: 'javascript', PYTHON: 'python', TYPESCRIPT: 'typescript', JAVA: 'java', CPP: 'cpp', GO: 'go',
};

export default function CodeEditor({ value, onChange, language, onPaste }: Props) {
  const { resolvedTheme } = useTheme();

  return (
    <div className="rounded-2xl overflow-hidden glass">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700/50">
        <span className="w-3 h-3 rounded-full bg-red-400/70" />
        <span className="w-3 h-3 rounded-full bg-amber-400/70" />
        <span className="w-3 h-3 rounded-full bg-purple-400/70" />
        <span className="ml-2 text-xs font-mono text-slate-500 dark:text-slate-500">query.sql</span>
      </div>
      <Editor
        height="420px"
        language={MONACO_LANG_MAP[language] || 'sql'}
        value={value}
        onChange={(val) => onChange(val || '')}
        theme={resolvedTheme === 'dark' ? 'vs-dark' : 'vs-light'}
        options={{ fontSize: 15, minimap: { enabled: false }, scrollBeyondLastLine: false, padding: { top: 16 } }}
        onMount={(editorInstance) => {
          if (!onPaste) return;
          editorInstance.onDidPaste((e: any) => {
            try {
              const model = editorInstance.getModel();
              const pastedText = model?.getValueInRange(e.range) ?? '';
              onPaste(pastedText.length);
            } catch {
              // Non-critical — if Monaco's event shape ever changes, we
              // simply skip flagging rather than break the editor.
            }
          });
        }}
      />
    </div>
  );
}