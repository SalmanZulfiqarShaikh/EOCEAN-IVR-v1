import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function HourlyChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-50 text-text-light text-sm font-medium">No hourly data</div>;
  }

  const byHour = Array.from({ length: 24 }, (_, i) => {
    const found = data.find(d => d.hour === i);
    return { hour: i + 'h', count: found ? found.count : 0 };
  });

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={byHour}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e6f0" vertical={false} />
        <XAxis dataKey="hour" tick={{ fontSize: 9, fontFamily: 'Plus Jakarta Sans' }} tickLine={false} interval={2} />
        <YAxis tick={{ fontSize: 10, fontFamily: 'Plus Jakarta Sans' }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            fontFamily: 'Plus Jakarta Sans',
            fontSize: 12,
            borderRadius: 8,
            border: '1px solid #e2e6f0',
          }}
        />
        <Bar
          dataKey="count"
          radius={[3, 3, 0, 0]}
          barSize={14}
          fill="#4ecdc4"
          opacity={0.7}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
