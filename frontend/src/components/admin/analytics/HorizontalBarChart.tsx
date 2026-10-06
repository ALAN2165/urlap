'use client';

import { useTheme } from 'next-themes';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

interface DataPoint { label: string; fullLabel?: string; value: number; }

interface Props {
  data: DataPoint[];
  color?: string;
  height?: number;
  valueLabel?: string;
}

function CustomTooltip({ active, payload, isDark, valueLabel }: any) {
  if (!active || !payload || !payload.length) return null;
  const point: DataPoint = payload[0].payload;
  return (
    <div
      style={{
        background: isDark ? '#15101f' : '#ffffff',
        border: `1px solid ${isDark ? 'rgba(168,85,247,0.35)' : '#e2e8f0'}`,
        borderRadius: 12, padding: '8px 12px', fontSize: 12, maxWidth: 240,
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
      }}
    >
      <div style={{ color: isDark ? '#ffffff' : '#0f172a', fontWeight: 700, marginBottom: 2 }}>{point.fullLabel ?? point.label}</div>
      <div style={{ color: isDark ? '#c4b5fd' : '#7c3aed', fontWeight: 600 }}>{point.value}{valueLabel ? ` ${valueLabel}` : ''}</div>
    </div>
  );
}

export default function HorizontalBarChart({ data, color = '#a855f7', height = 280, valueLabel = '' }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const axisColor = isDark ? '#a9a2c3' : '#475569';
  const gridColor = isDark ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.14)';

  if (data.length === 0) {
    return <div className="flex h-[200px] items-center justify-center text-sm text-slate-400 dark:text-slate-500">No data yet.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 20, bottom: 4, left: 4 }}>
        <XAxis type="number" tick={{ fontSize: 11, fill: axisColor }} axisLine={{ stroke: gridColor }} tickLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="label" width={190} tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} interval={0} />
        <Tooltip
          cursor={{ fill: isDark ? 'rgba(168,85,247,0.08)' : 'rgba(168,85,247,0.06)' }}
          content={(props: any) => <CustomTooltip {...props} isDark={isDark} valueLabel={valueLabel} />}
        />
        <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={22}>
          {data.map((_, i) => <Cell key={i} fill={color} fillOpacity={1 - i * 0.07} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}