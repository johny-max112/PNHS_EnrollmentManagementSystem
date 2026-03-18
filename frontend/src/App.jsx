import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import PortalHomePage from './pages/PortalHomePage'
import EnrollmentPage from './pages/EnrollmentPage'
import StudentEnrollmentPage from './pages/StudentEnrollmentPage'
import StudentDashboardPage from './pages/StudentDashboardPage'
import LoginPage from './pages/LoginPage'
import StudentLoginPage from './pages/StudentLoginPage'
import WorkflowPage from './pages/WorkflowPage'
import ReportsPage from './pages/ReportsPage'
import AdminUsersPage from './pages/AdminUsersPage'
import ProtectedRoute from './components/ProtectedRoute'
import {
  clearStoredAuthByRole,
  getRoleFromPath,
  getStoredAuth,
  getStoredAuthByRole,
  storeAuthByRole,
} from './utils/auth'
import './App.css'

function getHomePath(role) {
  if (role === 'student') {
    return '/student/dashboard'
  }

  if (role === 'admin') {
    return '/admin/enroll'
  }

  if (role === 'registrar') {
    return '/registrar/enroll'
  }

  return '/'
}

function App() {
  const navigate = useNavigate()
  const location = useLocation()

  const [legacyAuth] = useState(getStoredAuth)
  const [studentAuth, setStudentAuth] = useState(
    () => getStoredAuthByRole('student') || (legacyAuth?.user?.role === 'student' ? legacyAuth : null)
  )
  const [adminAuth, setAdminAuth] = useState(
    () => getStoredAuthByRole('admin') || (legacyAuth?.user?.role === 'admin' ? legacyAuth : null)
  )
  const [registrarAuth, setRegistrarAuth] = useState(
    () => getStoredAuthByRole('registrar') || (legacyAuth?.user?.role === 'registrar' ? legacyAuth : null)
  )

  const activeRole = useMemo(() => getRoleFromPath(location.pathname), [location.pathname])
  const activeAuth = useMemo(() => {
    if (activeRole === 'student') {
      return studentAuth
    }

    if (activeRole === 'admin') {
      return adminAuth
    }

    if (activeRole === 'registrar') {
      return registrarAuth
    }

    return null
  }, [activeRole, studentAuth, adminAuth, registrarAuth])

  const roleLabel = useMemo(() => activeAuth?.user?.role?.toUpperCase() || '', [activeAuth])

  const handleLogin = (role, data) => {
    if (data?.user?.role !== role) {
      return
    }

    const authData = {
      token: data.token,
      user: data.user,
    }

    if (role === 'student') {
      setStudentAuth(authData)
    } else if (role === 'admin') {
      setAdminAuth(authData)
    } else if (role === 'registrar') {
      setRegistrarAuth(authData)
    }

    storeAuthByRole(role, authData)
    navigate(getHomePath(role))
  }

  const handleLogout = (role) => {
    if (role === 'student') {
      setStudentAuth(null)
    } else if (role === 'admin') {
      setAdminAuth(null)
    } else if (role === 'registrar') {
      setRegistrarAuth(null)
    }

    clearStoredAuthByRole(role)
    navigate('/')
  }

  return (
    <>
      <header className="topbar">
        <p>PNHS Enrollment Management System</p>
        {activeRole === 'student' && studentAuth?.token && (
          <nav className="topnav">
            <NavLink to="/student/dashboard">My Status</NavLink>
            <NavLink to="/student/enrollment">Enrollment</NavLink>
            <span>{roleLabel}</span>
            <button type="button" onClick={() => handleLogout('student')}>Logout</button>
          </nav>
        )}
        {activeRole === 'admin' && adminAuth?.token && (
          <nav className="topnav">
            <NavLink to="/admin/enroll">Enrollment</NavLink>
            <NavLink to="/admin/workflow">Workflow</NavLink>
            <NavLink to="/admin/reports">Reports</NavLink>
            <NavLink to="/admin/users">Users</NavLink>
            <span>{roleLabel}</span>
            <button type="button" onClick={() => handleLogout('admin')}>Logout</button>
          </nav>
        )}
        {activeRole === 'registrar' && registrarAuth?.token && (
          <nav className="topnav">
            <NavLink to="/registrar/enroll">Enrollment</NavLink>
            <NavLink to="/registrar/workflow">Workflow</NavLink>
            <NavLink to="/registrar/reports">Reports</NavLink>
            <span>{roleLabel}</span>
            <button type="button" onClick={() => handleLogout('registrar')}>Logout</button>
          </nav>
        )}
      </header>

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
        <Route path="/student/login" element={<StudentLoginPage onLogin={(data) => handleLogin('student', data)} />} />
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute auth={studentAuth} allowedRoles={['student']}>
              <StudentDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/enrollment"
          element={
            <ProtectedRoute auth={studentAuth} allowedRoles={['student']}>
              <StudentEnrollmentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/enroll"
          element={
            <ProtectedRoute auth={adminAuth} allowedRoles={['admin']}>
              <EnrollmentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/workflow"
          element={
            <ProtectedRoute auth={adminAuth} allowedRoles={['admin']}>
              <WorkflowPage />
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
              <EnrollmentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/registrar/workflow"
          element={
            <ProtectedRoute auth={registrarAuth} allowedRoles={['registrar']}>
              <WorkflowPage />
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
    </>
  )
}

export default App
