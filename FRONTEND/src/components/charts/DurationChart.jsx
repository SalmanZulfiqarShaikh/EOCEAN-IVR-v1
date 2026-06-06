import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function DurationChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-50 text-text-light text-sm font-medium">No duration data</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-border)" vertical={false} />
        <XAxis
          dataKey="bucket"
          tick={{ fontSize: 10, fontFamily: 'Plus Jakarta Sans' }}
          tickLine={false}
        />
        <YAxis tick={{ fontSize: 10, fontFamily: 'Plus Jakarta Sans' }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            fontFamily: 'Plus Jakarta Sans',
            fontSize: 12,
            borderRadius: 8,
            border: '1px solid var(--color-surface-border)',
            background: 'var(--color-card-bg)',
            color: 'var(--color-text-main)',
          }}
          formatter={(value, name) => [value.toLocaleString(), 'Calls']}
          labelFormatter={(label) => `Duration: ${label}`}
        />
        <Bar
          dataKey="count"
          fill="var(--color-teal)"
          radius={[4, 4, 0, 0]}
          barSize={28}
          opacity={0.8}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
