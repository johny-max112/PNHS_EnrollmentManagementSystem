import { NavLink, useNavigate } from 'react-router-dom'
import '../styles/sidebar.css'

export default function Sidebar({ auth, role, onLogout }) {
  const navigate = useNavigate()

  if (!auth?.token) {
    return null
  }

  const navItems = []

  if (role === 'admin') {
    navItems.push(
      { label: 'Enrollment', path: '/admin/enroll' },
      { label: 'Documents', path: '/admin/documents' },
      { label: 'Workflow', path: '/admin/workflow' },
      { label: 'Reports', path: '/admin/reports' },
      { label: 'Users', path: '/admin/users' }
    )
  } else if (role === 'registrar') {
    navItems.push(
      { label: 'Enrollment', path: '/registrar/enroll' },
      { label: 'Documents', path: '/registrar/documents' },
      { label: 'Workflow', path: '/registrar/workflow' },
      { label: 'Reports', path: '/registrar/reports' }
    )
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>PNHS</h2>
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
          <span className="user-role">{role?.toUpperCase()}</span>
        </div>
        <button type="button" className="logout-btn" onClick={() => onLogout(role)}>
          Logout
        </button>
      </div>
    </aside>
  )
}
