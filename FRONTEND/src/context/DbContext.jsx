import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getDatabases } from '../services/api';

const DbContext = createContext(null);

export function DbProvider({ children }) {
  const [databases, setDatabases] = useState([]);
  const [selectedDb, setSelectedDb] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [loading, setLoading] = useState(true);

  const refreshDatabases = useCallback(async () => {
    try {
      const res = await getDatabases();
      if (res.success) {
        setDatabases(res.data);
        setConnectionStatus('connected');
      }
    } catch {
      setConnectionStatus('error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDatabases();
  }, [refreshDatabases]);

  const value = {
    databases,
    selectedDb,
    setSelectedDb,
    connectionStatus,
    loading,
    refreshDatabases,
  };

  return (
    <DbContext.Provider value={value}>
      {children}
    </DbContext.Provider>
  );
}

export function useDb() {
  const ctx = useContext(DbContext);
  if (!ctx) throw new Error('useDb must be used within DbProvider');
  return ctx;
}

export default DbContext;
