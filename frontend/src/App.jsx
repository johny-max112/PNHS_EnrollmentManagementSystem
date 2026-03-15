import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
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
import { clearStoredAuth, getStoredAuth, storeAuth } from './utils/auth'
import './App.css'

function App() {
  const navigate = useNavigate()
  const [auth, setAuth] = useState(getStoredAuth)

  const roleLabel = useMemo(() => auth?.user?.role?.toUpperCase() || '', [auth])

  const handleLogin = (data) => {
    const authData = {
      token: data.token,
      user: data.user,
    }
    setAuth(authData)
    storeAuth(authData)
    navigate(data.user.role === 'student' ? '/student/dashboard' : '/enroll')
  }

  const handleLogout = () => {
    setAuth(null)
    clearStoredAuth()
    navigate('/')
  }

  return (
    <>
      <header className="topbar">
        <p>PNHS Enrollment Management System</p>
        {auth?.token && auth.user?.role === 'student' && (
          <nav className="topnav">
            <NavLink to="/student/dashboard">My Status</NavLink>
            <NavLink to="/student/enrollment">Enrollment</NavLink>
            <span>{roleLabel}</span>
            <button type="button" onClick={handleLogout}>Logout</button>
          </nav>
        )}
        {auth?.token && auth.user?.role !== 'student' && (
          <nav className="topnav">
            <NavLink to="/enroll">Enrollment</NavLink>
            <NavLink to="/workflow">Workflow</NavLink>
            <NavLink to="/reports">Reports</NavLink>
            {auth.user?.role === 'admin' && <NavLink to="/admin/users">Users</NavLink>}
            <span>{roleLabel}</span>
            <button type="button" onClick={handleLogout}>Logout</button>
          </nav>
        )}
      </header>

      <Routes>
        <Route path="/" element={<PortalHomePage />} />
        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
        <Route path="/student/login" element={<StudentLoginPage onLogin={handleLogin} />} />
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute auth={auth} allowedRoles={['student']}>
              <StudentDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/enrollment"
          element={
            <ProtectedRoute auth={auth} allowedRoles={['student']}>
              <StudentEnrollmentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/enroll"
          element={
            <ProtectedRoute auth={auth} allowedRoles={['admin', 'registrar']}>
              <EnrollmentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workflow"
          element={
            <ProtectedRoute auth={auth} allowedRoles={['admin', 'registrar']}>
              <WorkflowPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute auth={auth} allowedRoles={['admin', 'registrar']}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute auth={auth} allowedRoles={['admin']}>
              <AdminUsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="*"
          element={
            <Navigate
              to={auth?.token ? (auth.user?.role === 'student' ? '/student/dashboard' : '/enroll') : '/'}
              replace
            />
          }
        />
      </Routes>
    </>
  )
}

export default App
