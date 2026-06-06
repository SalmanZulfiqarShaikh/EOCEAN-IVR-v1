import { ChevronDown, SlidersHorizontal } from 'lucide-react';

export default function FilterBar({ filters, onChange, onRun }) {
  return (
    <div className="premium-card mb-4 p-5">
      <div className="mb-4 flex items-center gap-2 text-[10px] font-extrabold uppercase text-text-light">
        <SlidersHorizontal className="h-3.5 w-3.5 text-teal-dark" />
        Filter stack
        <span className="flex-1 h-px bg-surface-border" />
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
        {filters.map((f, i) => (
          <div key={i} className="flex flex-col gap-1">
            <label className="premium-label">{f.label}</label>
            {f.type === 'select' ? (
              <div className="select-shell">
                <select
                  value={f.value || ''}
                  onChange={e => onChange(f.key, e.target.value)}
                  className="premium-select"
                >
                  {f.options.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown />
              </div>
            ) : (
              <input
                type={f.type || 'text'}
                value={f.value || ''}
                onChange={e => onChange(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="premium-input"
              />
            )}
          </div>
        ))}
      </div>
      {onRun && (
        <div className="flex justify-end gap-2 mt-3 pt-1">
          <button
            onClick={onRun}
            className="btn-premium btn-primary"
          >
            Run Report
          </button>
        </div>
      )}
    </div>
  );
}
