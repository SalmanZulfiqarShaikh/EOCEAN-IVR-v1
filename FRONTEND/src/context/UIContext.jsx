import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  // Sidebar OPEN by default on desktop, closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    let timeout;
    const handleResize = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const mobile = window.innerWidth < 1024;
        setIsMobile(mobile);
        // Only auto-close on mobile. Don't force-open on desktop.
        if (mobile) setSidebarOpen(false);
      }, 100);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeout);
    };
  }, []);

  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const toggleDarkMode = useCallback(() => setIsDarkMode(prev => !prev), []);

  return (
    <UIContext.Provider value={{
      isMobile,
      sidebarOpen,
      setSidebarOpen,
      toggleSidebar,
      closeSidebar,
      openSidebar,
      isDarkMode,
      toggleDarkMode
    }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within UIProvider');
  return ctx;
}

export default UIContext;
