export default function KpiCard({ value, label, color = '#4ecdc4', icon }) {
  return (
    <div
      className="premium-card premium-card-hover relative overflow-hidden px-6 py-5"
    >
      <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: color }} />
      {icon && (
        <div className="text-lg mb-2.5 text-text-muted">{icon}</div>
      )}
      <div className="text-[22px] font-extrabold text-text-main leading-tight">{value}</div>
      <div className="text-[10px] font-bold text-text-muted uppercase tracking-wide mt-1.5">{label}</div>
    </div>
  );
}
