import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function CampaignBar({ data }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-50 text-text-light text-sm font-medium">No campaign data</div>;
  }

  const chartData = data.slice(0, 12).map(d => ({
    name: String(d.campaign_id || '--').length > 14 ? String(d.campaign_id || '--').slice(0, 14) + '...' : String(d.campaign_id || '--'),
    calls: d.total,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e6f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fontFamily: 'Plus Jakarta Sans' }} tickLine={false} />
        <YAxis
          dataKey="name"
          type="category"
          tick={{ fontSize: 10, fontFamily: 'Plus Jakarta Sans' }}
          tickLine={false}
          axisLine={false}
          width={90}
        />
        <Tooltip
          contentStyle={{
            fontFamily: 'Plus Jakarta Sans',
            fontSize: 12,
            borderRadius: 8,
            border: '1px solid #e2e6f0',
          }}
        />
        <Bar dataKey="calls" fill="#4ecdc4" radius={[0, 6, 6, 0]} barSize={14} opacity={0.85} />
      </BarChart>
    </ResponsiveContainer>
  );
}
