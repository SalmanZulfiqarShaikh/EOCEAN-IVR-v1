import { NavLink, useLocation } from 'react-router-dom';
import { useDb } from '../../context/DbContext';
import { useUI } from '../../context/UIContext';
import { ChevronLeft } from 'lucide-react';
import logoUrl from '../../assets/images/eoceanlogo.webp';
import logoFullUrl from '../../assets/images/eoceanfulllogo.webp';

const navItems = [
  { path: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { path: '/reports', label: 'Reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { path: '/recordings', label: 'Recordings', icon: 'M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z' },
  { path: '/db-manager', label: 'DB Manager', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4' },
];

const disabledItems = [
  { label: 'Metabase', icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z' },
];

function NavIcon({ path }) {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

export default function Sidebar() {
  const { databases, selectedDb, setSelectedDb, connectionStatus } = useDb();
  const { isMobile, sidebarOpen, closeSidebar } = useUI();
  const location = useLocation();

  const EXPANDED_W = 260;

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 transition-opacity"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed top-0 left-0 h-screen bg-navy flex flex-col z-50 transition-transform duration-300 ease-in-out overflow-hidden shadow-2xl ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: `${EXPANDED_W}px` }}
      >
        <div className="flex flex-col h-full w-full">

          {/* Header: Logo centered + collapse button top-right */}
          <div className="flex items-center justify-center h-16 border-b border-white/8 shrink-0 relative">
            <img src={logoUrl} alt="eOcean" className="h-10 object-contain mx-auto" />
            <button
              onClick={closeSidebar}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-white/30 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* DB selector */}
          <div className="px-4 py-4 border-b border-white/6 shrink-0">
            <div className="text-[10px] font-bold text-teal/70 tracking-[1.5px] uppercase mb-2.5">
              Database
            </div>

            {databases.length === 0 ? (
              <div className="text-sm text-white/35 leading-relaxed">
                No databases.{' '}
                <NavLink to="/db-manager" onClick={() => isMobile && closeSidebar()} className="text-teal hover:text-teal-light font-semibold">
                  Connect
                </NavLink>
              </div>
            ) : (
              <>
                <div className="relative group">
                  <select
                    value={selectedDb}
                    onChange={(e) => setSelectedDb(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 group-hover:border-white/20 group-hover:bg-white/8 rounded-lg text-white text-sm font-medium py-2.5 pl-3 pr-8 appearance-none cursor-pointer outline-none transition-all"
                  >
                    <option value="" className="bg-navy text-white/50">Select database</option>
                    {databases.map((db) => (
                      <option key={db.name} value={db.name} className="bg-navy text-white">{db.name}</option>
                    ))}
                  </select>
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                <div className="flex items-center gap-2 mt-2.5 px-0.5">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    connectionStatus === 'connected' ? 'bg-green shadow-[0_0_6px_rgba(16,185,129,0.7)]' :
                    connectionStatus === 'error' ? 'bg-red' : 'bg-white/20'
                  }`} />
                  <span className="text-xs text-white/40 font-medium truncate">
                    {connectionStatus === 'connected' ? `Connected (${databases.length})` :
                     connectionStatus === 'error' ? 'Error' : 'Connecting...'}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden custom-scrollbar">
            <div className="text-[10px] font-bold text-white/25 tracking-[1.5px] uppercase px-5 mb-2">
              Analytics
            </div>

            <div className="px-3 flex flex-col gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path ||
                  (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => isMobile && closeSidebar()}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 no-underline ${
                      isActive
                        ? 'bg-teal/12 text-teal shadow-[inset_0_1px_0_rgba(78,205,196,0.08)]'
                        : 'text-white/55 hover:bg-white/5 hover:text-white/90'
                    }`}
                  >
                    <NavIcon path={item.icon} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>

            <div className="text-[10px] font-bold text-white/25 tracking-[1.5px] uppercase px-5 mb-2 mt-6">
              System
            </div>

            <div className="px-3 flex flex-col gap-1">
              {disabledItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/20 cursor-not-allowed border-l-2 border-transparent"
                >
                  <NavIcon path={item.icon} />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </nav>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-white/6 shrink-0">
            <div className="text-center flex flex-col items-center gap-1.5">
              <img src={logoFullUrl} alt="eOcean" className="h-14 object-contain opacity-45" />
              <div className="text-[10px] text-white/20 tracking-wider font-semibold">Bridging Global Interactions</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
