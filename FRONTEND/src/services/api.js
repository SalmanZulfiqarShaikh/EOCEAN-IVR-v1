import axios from 'axios';
import mockData from './mockData';

const USE_MOCK = true; // Toggle this to switch between mock and real API

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
});

// Databases and servers
export const getDatabases = () =>
  USE_MOCK ? Promise.resolve(mockData.getDatabases()) : api.get('/databases').then(r => r.data);
export const getServers = () =>
  USE_MOCK ? Promise.resolve([]) : api.get('/servers').then(r => r.data);
export const addServer = (data) =>
  USE_MOCK ? Promise.resolve(mockData.addServer()) : api.post('/servers', data).then(r => r.data);
export const removeServer = (host, port, user) =>
  USE_MOCK ? Promise.resolve({ success: true }) : api.delete(`/servers/${encodeURIComponent(host)}/${port}/${encodeURIComponent(user)}`).then(r => r.data);
export const syncDatabases = () =>
  USE_MOCK ? Promise.resolve(mockData.syncDatabases()) : api.post('/sync').then(r => r.data);
export const removeDatabase = (name) =>
  USE_MOCK ? Promise.resolve(mockData.removeDatabase()) : api.delete(`/databases/${encodeURIComponent(name)}`).then(r => r.data);

// Table browsing
export const getTables = (dbName) =>
  USE_MOCK ? Promise.resolve(mockData.getTables(dbName)) : api.get(`/${encodeURIComponent(dbName)}/tables`).then(r => r.data);
export const getTableData = (dbName, table, limit, offset) =>
  USE_MOCK ? Promise.resolve(mockData.getTableData(dbName, table, limit, offset)) : api.get(`/${encodeURIComponent(dbName)}/tables/${encodeURIComponent(table)}/data`, { params: { limit, offset } }).then(r => r.data);
export const getTableStructure = (dbName, table) =>
  USE_MOCK ? Promise.resolve(mockData.getTableStructure(dbName, table)) : api.get(`/${encodeURIComponent(dbName)}/tables/${encodeURIComponent(table)}/structure`).then(r => r.data);
export const searchTable = (dbName, table, q, limit) =>
  USE_MOCK ? Promise.resolve(mockData.searchTable(dbName, table, q, limit)) : api.get(`/${encodeURIComponent(dbName)}/tables/${encodeURIComponent(table)}/search`, { params: { q, limit } }).then(r => r.data);
export const updateRow = (dbName, table, oldRow, newRow) =>
  USE_MOCK ? Promise.resolve({ success: true, affected: 1 }) : api.post(`/${encodeURIComponent(dbName)}/tables/${encodeURIComponent(table)}/update`, { old: oldRow, new: newRow }).then(r => r.data);
export const deleteRow = (dbName, table, row) =>
  USE_MOCK ? Promise.resolve({ success: true, affected: 1 }) : api.post(`/${encodeURIComponent(dbName)}/tables/${encodeURIComponent(table)}/delete`, { row }).then(r => r.data);

// Dashboard
export const getDashboard = (dbName, days = 30) =>
  USE_MOCK ? Promise.resolve(mockData.getDashboard(dbName, days)) : api.get(`/dashboard/${encodeURIComponent(dbName)}`, { params: { days } }).then(r => r.data);

// Reports
export const getReport = (dbName, params) =>
  USE_MOCK ? Promise.resolve(mockData.getReport(params)) : api.get(`/report/${encodeURIComponent(dbName)}`, { params }).then(r => r.data);
export const getReportMeta = (dbName, column) =>
  USE_MOCK ? Promise.resolve(mockData.getReportMeta(column)) : api.get(`/report/meta/${encodeURIComponent(dbName)}/${encodeURIComponent(column)}`).then(r => r.data);

// Recordings
export const getRecordings = (dbName, params) =>
  USE_MOCK ? Promise.resolve(mockData.getRecordings(params)) : api.get(`/recordings/${encodeURIComponent(dbName)}`, { params }).then(r => r.data);
export const getRecordingStreamUrl = (dbName, id) =>
  USE_MOCK ? mockData.getRecordingStreamUrl(dbName, id) : `${api.defaults.baseURL}/recordings/${encodeURIComponent(dbName)}/${encodeURIComponent(id)}`;
export const getBulkDownloadUrl = (dbName, ids) =>
  USE_MOCK ? mockData.getBulkDownloadUrl(dbName, ids) : `${api.defaults.baseURL}/recordings/${encodeURIComponent(dbName)}/bulk?ids=${encodeURIComponent(ids.join(','))}`;

export const deleteRecording = (dbName, id) =>
  USE_MOCK ? Promise.resolve({ success: true }) : api.delete(`/recordings/${encodeURIComponent(dbName)}/${encodeURIComponent(id)}`).then(r => r.data);

// Metabase
export const getMetabaseEmbedUrl = (dbName, dashboardId = 1) =>
  USE_MOCK ? Promise.resolve({ success: true, data: { url: '' } }) : api.get(`/metabase/embed/${encodeURIComponent(dbName)}`, { params: { dashboard: dashboardId } }).then(r => r.data);

export default api;
