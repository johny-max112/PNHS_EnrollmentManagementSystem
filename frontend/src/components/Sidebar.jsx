import { NavLink } from 'react-router-dom'
import '../styles/sidebar.css'

export default function Sidebar({ auth, role, onLogout }) {
  if (!auth?.token) {
    return null
  }

  const navItems = []

  if (role === 'admin') {
    navItems.push(
      { label: 'Dashboard', path: '/admin/dashboard' },
      { label: 'Subject Assignment', path: '/admin/enroll' },
      { label: 'Requirement Validator', path: '/admin/documents' },
      { label: 'Section Assignment', path: '/admin/section-assignment' },
      { label: 'Reports', path: '/admin/reports' },
      { label: 'Users', path: '/admin/users' }
    )
  } else if (role === 'registrar') {
    navItems.push(
      { label: 'Dashboard', path: '/registrar/dashboard' },
      { label: 'Subject Assignment', path: '/registrar/enroll' },
      { label: 'Requirement Validator', path: '/registrar/documents' },
      { label: 'Section Assignment', path: '/registrar/section-assignment' },
      { label: 'Reports', path: '/registrar/reports' }
    )
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <img className="sidebar-logo" src="/logo_pnhs.png" alt="PNHS logo" />
        <div className="sidebar-brand-text">
          <h2>PNHS</h2>
          <p>Enrollment Management System</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <span className="user-label">Logged in as</span>
          <span className="user-role">{role?.toUpperCase()}</span>
        </div>
        <button type="button" className="logout-btn" onClick={() => onLogout(role)}>
          Logout
        </button>
      </div>
    </aside>
  )
}
