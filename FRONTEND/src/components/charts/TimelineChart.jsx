import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export default function TimelineChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-55 text-text-light text-sm font-medium">No timeline data</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e6f0" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: 'Plus Jakarta Sans' }} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fontFamily: 'Plus Jakarta Sans' }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            fontFamily: 'Plus Jakarta Sans',
            fontSize: 12,
            borderRadius: 8,
            border: '1px solid #e2e6f0',
            boxShadow: '0 4px 12px rgba(26,35,83,0.1)',
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, fontFamily: 'Plus Jakarta Sans' }}
          iconType="circle"
          iconSize={8}
        />
        <Line type="monotone" dataKey="total" stroke="#1a2353" strokeWidth={2} dot={false} name="Total" />
        <Line type="monotone" dataKey="answered" stroke="#4ecdc4" strokeWidth={2} dot={false} name="Answered" />
        <Line type="monotone" dataKey="not_answered" stroke="#f59e0b" strokeWidth={2} dot={false} name="Not Ans" />
      </LineChart>
    </ResponsiveContainer>
  );
}
