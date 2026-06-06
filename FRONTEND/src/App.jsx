import { Routes, Route, Navigate } from 'react-router-dom';
import { DbProvider } from './context/DbContext';
import { UIProvider } from './context/UIContext';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import DbManager from './pages/DbManager';
import Recordings from './pages/Recordings';

export default function App() {
  return (
    <DbProvider>
      <UIProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/db-manager" element={<DbManager />} />
            <Route path="/recordings" element={<Recordings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </UIProvider>
    </DbProvider>
  );
}
