const statusColors = {
  answered: { bg: 'bg-green-bg', text: 'text-green-text' },
  not_answered: { bg: 'bg-amber-bg', text: 'text-amber-text' },
  hangup: { bg: 'bg-pink-bg', text: 'text-pink-text' },
  busy: { bg: 'bg-orange-bg', text: 'text-orange-text' },
  failed: { bg: 'bg-red-bg', text: 'text-red-text' },
  outgoing: { bg: 'bg-blue-100', text: 'text-blue-800' },
  incoming: { bg: 'bg-green-bg', text: 'text-green-text' },
};

const statusLabels = {
  answered: 'Answered',
  not_answered: 'Not Answered',
  hangup: 'Hang Up',
  busy: 'Busy',
  failed: 'Failed',
  outgoing: 'Outgoing',
  incoming: 'Incoming',
};

export default function Badge({ status, children }) {
  const key = (status || children || '').toLowerCase().replace(/\s+/g, '_');
  const colors = statusColors[key];
  const label = statusLabels[key] || status || children;

  if (!colors) {
    return (
      <span className="inline-block rounded-full border border-surface-border bg-surface-muted px-4 py-1.5 text-[11px] font-extrabold text-text-muted">
        {label}
      </span>
    );
  }

  return (
    <span className={`inline-block rounded-full px-4 py-1.5 text-[11px] font-extrabold ${colors.bg} ${colors.text}`}>
      {label}
    </span>
  );
}
