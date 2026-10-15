import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import { useAuth } from '@/context/AuthContext'
import Login from '@/pages/auth/Login'
import Dashboard from '@/pages/Dashboard'
import TicketList from '@/pages/tickets/TicketList'
import TicketDetail from '@/pages/tickets/TicketDetail'
import NewTicket from '@/pages/tickets/NewTicket'
import AssetList from '@/pages/assets/AssetList'
import AssetDetail from '@/pages/assets/AssetDetail'
import NewAsset from '@/pages/assets/NewAsset'
import Reports from '@/pages/reports/Reports'
import KnowledgeList from '@/pages/knowledge/KnowledgeList'
import KnowledgeDetail from '@/pages/knowledge/KnowledgeDetail'
import KnowledgeEditor from '@/pages/knowledge/KnowledgeEditor'
import EmployeeList from '@/pages/employees/EmployeeList'
import AuditLogs from '@/pages/admin/AuditLogs'
import SettingsPage from '@/pages/admin/Settings'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <p className="text-slate-500 dark:text-slate-400">Loading…</p>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/tickets" element={<TicketList />} />
        <Route path="/tickets/new" element={<NewTicket />} />
        <Route path="/tickets/:id" element={<TicketDetail />} />
        <Route path="/assets" element={<AssetList />} />
        <Route path="/assets/new" element={<NewAsset />} />
        <Route path="/assets/:id" element={<AssetDetail />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/knowledge" element={<KnowledgeList />} />
        <Route path="/knowledge/new" element={<KnowledgeEditor />} />
        <Route path="/knowledge/:id/edit" element={<KnowledgeEditor />} />
        <Route path="/knowledge/:id" element={<KnowledgeDetail />} />
        <Route path="/employees" element={<EmployeeList />} />
        <Route path="/audit-logs" element={<AuditLogs />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
