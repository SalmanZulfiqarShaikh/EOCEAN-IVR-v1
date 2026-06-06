import { useDb } from '../../context/DbContext';
import { useUI } from '../../context/UIContext';
import { Menu, Moon, Sun, ChevronRight } from 'lucide-react';

export default function Header({ title, subtitle, actions }) {
  const { selectedDb, connectionStatus } = useDb();
  const { isMobile, sidebarOpen, openSidebar, isDarkMode, toggleDarkMode } = useUI();

  return (
    <header className="bg-card-bg/85 backdrop-blur-md border-b border-surface-border px-4 lg:px-6 h-14 flex items-center justify-between sticky top-0 z-30 transition-colors shadow-[0_1px_4px_rgba(26,35,83,0.04)]">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile hamburger / Desktop expand button */}
        {(isMobile || !sidebarOpen) && (
          <button
            onClick={openSidebar}
            className="p-1.5 -ml-1 text-text-muted hover:text-text-main hover:bg-surface-muted rounded-lg transition-colors flex items-center justify-center cursor-pointer"
            title="Open sidebar"
          >
            {isMobile ? <Menu className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-[15px] font-bold text-text-main leading-tight truncate">{title}</h1>
          {subtitle && (
            <p className="text-[11px] text-text-muted mt-0.5 truncate hidden sm:block">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {selectedDb && (
          <div className="hidden md:flex items-center gap-1.5 bg-surface-muted/60 text-text-muted border border-surface-border rounded-full px-2.5 py-1 text-[11px] font-semibold">
            <span className={`w-1.5 h-1.5 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green shadow-[0_0_4px_rgba(16,185,129,0.5)]' : 'bg-text-light/50'
            }`} />
            {selectedDb}
          </div>
        )}
        <button
          onClick={toggleDarkMode}
          className="p-1.5 text-text-muted hover:text-text-main hover:bg-surface-muted rounded-lg transition-colors cursor-pointer"
          title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        {actions}
      </div>
    </header>
  );
}
