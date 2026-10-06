'use client';

import { useTheme } from 'next-themes';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

interface DataPoint { label: string; value: number; }

interface Props {
  data: DataPoint[];
  color?: string;
  height?: number;
  valueSuffix?: string;
}

export default function HorizontalBarChart({ data, color = '#a855f7', height = 260, valueSuffix = '' }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const axisColor = isDark ? '#8b8ba3' : '#64748b';
  const gridColor = isDark ? 'rgba(148,163,184,0.1)' : 'rgba(100,116,139,0.12)';

  if (data.length === 0) {
    return <div className="flex h-[200px] items-center justify-center text-sm text-slate-400 dark:text-slate-500">No data yet.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }}>
        <XAxis type="number" tick={{ fontSize: 11, fill: axisColor }} axisLine={{ stroke: gridColor }} tickLine={false} />
        <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: isDark ? 'rgba(168,85,247,0.08)' : 'rgba(168,85,247,0.06)' }}
          contentStyle={{
            background: isDark ? '#15101f' : '#ffffff',
            border: `1px solid ${isDark ? 'rgba(168,85,247,0.3)' : '#e2e8f0'}`,
            borderRadius: 12, fontSize: 12, color: isDark ? '#fff' : '#0f172a',
          }}
formatter={(value: any) => [`${value}${valueSuffix}`, '']}
          labelFormatter={() => ''}
        />
        <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={22}>
          {data.map((_, i) => <Cell key={i} fill={color} fillOpacity={1 - i * 0.08} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}