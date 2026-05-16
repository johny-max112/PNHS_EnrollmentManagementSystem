import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import PortalHomePage from './pages/PortalHomePage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ReportsPage from './pages/ReportsPage'
import AdminUsersPage from './pages/AdminUsersPage'
import DocumentsPage from './pages/DocumentsPage'
import StudentEnrollmentPage from './pages/StudentEnrollmentPage'
import SectionAssignmentPage from './pages/SectionAssignmentPage'
import ProtectedRoute from './components/ProtectedRoute'
import Sidebar from './components/Sidebar'
import {
  clearStoredAuthByRole,
  getRoleFromPath,
  getStoredAuth,
  getStoredAuthByRole,
  storeAuthByRole,
} from './utils/auth'
import './App.css'
import './styles/sidebar.css'

function getHomePath(role) {
  if (role === 'admin') {
    return '/admin/dashboard'
  }

  if (role === 'registrar') {
    return '/registrar/dashboard'
  }

  return '/'
}

function App() {
  const navigate = useNavigate()
  const location = useLocation()

  const [legacyAuth] = useState(getStoredAuth)
  const [adminAuth, setAdminAuth] = useState(
    () => getStoredAuthByRole('admin') || (legacyAuth?.user?.role === 'admin' ? legacyAuth : null)
  )
  const [registrarAuth, setRegistrarAuth] = useState(
    () => getStoredAuthByRole('registrar') || (legacyAuth?.user?.role === 'registrar' ? legacyAuth : null)
  )

  const activeRole = useMemo(() => getRoleFromPath(location.pathname), [location.pathname])
  const activeAuth = useMemo(() => {
    if (activeRole === 'admin') {
      return adminAuth
    }

    if (activeRole === 'registrar') {
      return registrarAuth
    }

    return null
  }, [activeRole, adminAuth, registrarAuth])

  const hasSidebar = Boolean(activeAuth?.token && activeRole)

  const handleLogin = (role, data) => {
    if (data?.user?.role !== role) {
      return
    }

    const authData = {
      token: data.token,
      user: data.user,
    }

    if (role === 'admin') {
      setAdminAuth(authData)
    } else if (role === 'registrar') {
      setRegistrarAuth(authData)
    }

    storeAuthByRole(role, authData)
    navigate(getHomePath(role))
  }

  const handleLogout = (role) => {
    if (role === 'admin') {
      setAdminAuth(null)
    } else if (role === 'registrar') {
      setRegistrarAuth(null)
    }

    clearStoredAuthByRole(role)
    navigate('/')
  }

  return (
    <>
      {activeRole && (
        <Sidebar
          auth={activeAuth}
          role={activeRole}
          onLogout={handleLogout}
        />
      )}

      <div className={`app-layout ${hasSidebar ? 'with-sidebar' : ''}`}>
        <div className="main-content">
          <Routes>
        <Route path="/" element={<PortalHomePage />} />
        <Route
          path="/admin/login"
          element={<LoginPage expectedRole="admin" onLogin={(data) => handleLogin('admin', data)} />}
        />
        <Route
          path="/registrar/login"
          element={<LoginPage expectedRole="registrar" onLogin={(data) => handleLogin('registrar', data)} />}
        />
        <Route
          path="/admin/enroll"
          element={
            <ProtectedRoute auth={adminAuth} allowedRoles={['admin']}>
              <StudentEnrollmentPage role="admin" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/section-assignment"
          element={
            <ProtectedRoute auth={adminAuth} allowedRoles={['admin']}>
              <SectionAssignmentPage role="admin" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/documents"
          element={
            <ProtectedRoute auth={adminAuth} allowedRoles={['admin']}>
              <DocumentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute auth={adminAuth} allowedRoles={['admin']}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute auth={adminAuth} allowedRoles={['admin']}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute auth={adminAuth} allowedRoles={['admin']}>
              <AdminUsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/registrar/enroll"
          element={
            <ProtectedRoute auth={registrarAuth} allowedRoles={['registrar']}>
              <StudentEnrollmentPage role="registrar" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/registrar/section-assignment"
          element={
            <ProtectedRoute auth={registrarAuth} allowedRoles={['registrar']}>
              <SectionAssignmentPage role="registrar" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/registrar/documents"
          element={
            <ProtectedRoute auth={registrarAuth} allowedRoles={['registrar']}>
              <DocumentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/registrar/dashboard"
          element={
            <ProtectedRoute auth={registrarAuth} allowedRoles={['registrar']}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/registrar/reports"
          element={
            <ProtectedRoute auth={registrarAuth} allowedRoles={['registrar']}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="*"
          element={
            <Navigate to="/" replace />
          }
        />
        </Routes>
        </div>
      </div>
    </>
  )
}

export default App
