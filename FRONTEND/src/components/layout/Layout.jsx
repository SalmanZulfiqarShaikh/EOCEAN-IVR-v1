import Sidebar from './Sidebar';
import { useUI } from '../../context/UIContext';

export default function Layout({ children }) {
  const { isMobile, sidebarOpen } = useUI();

  // Desktop: 260px when open, 0 when collapsed. Mobile: always 0 (overlay).
  const marginLeft = (!isMobile && sidebarOpen) ? '260px' : '0px';

  return (
    <div className="flex w-full min-h-screen">
      <Sidebar />
      <main
        className="flex-1 flex flex-col h-screen overflow-y-auto bg-surface min-w-0 transition-[margin-left] duration-300 ease-in-out"
        style={{ marginLeft }}
      >
        {children}
      </main>
    </div>
  );
}
