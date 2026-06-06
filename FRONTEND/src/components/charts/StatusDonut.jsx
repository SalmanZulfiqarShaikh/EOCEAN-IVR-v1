import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = {
  answered: '#4ecdc4',
  not_answered: '#f59e0b',
  hangup: '#ec4899',
  busy: '#f97316',
  failed: '#9ca3af',
  unknown: '#d1d5db',
};

export default function StatusDonut({ data }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-55 text-text-light text-sm font-medium">No status data</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="status"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={COLORS[entry.status] || '#9ca3af'} strokeWidth={0} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            fontFamily: 'Plus Jakarta Sans',
            fontSize: 12,
            borderRadius: 8,
            border: '1px solid #e2e6f0',
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, fontFamily: 'Plus Jakarta Sans' }}
          iconType="circle"
          iconSize={8}
          verticalAlign="bottom"
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
