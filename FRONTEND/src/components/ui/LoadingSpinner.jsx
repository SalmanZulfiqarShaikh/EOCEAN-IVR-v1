export default function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-7 h-7 border-2.5 border-surface-border border-t-teal rounded-full animate-spin" />
      <span className="text-sm font-medium text-text-muted">{text}</span>
    </div>
  );
}
