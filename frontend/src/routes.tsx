import { Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { DebugView } from './pages/DebugView';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/debug" element={<DebugView />} />
      <Route path="/debug/:guildId" element={<DebugView />} />
      <Route path="/debug/:guildId/:topicName" element={<DebugView />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}