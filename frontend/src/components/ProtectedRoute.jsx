import { Navigate } from 'react-router-dom';

function getHomePath(role) {
  if (role === 'student') {
    return '/student/dashboard';
  }

  if (role === 'admin') {
    return '/admin/enroll';
  }

  if (role === 'registrar') {
    return '/registrar/enroll';
  }

  return '/';
}

function ProtectedRoute({ auth, allowedRoles = [], children }) {
  if (!auth?.token) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(auth.user?.role)) {
    return <Navigate to={getHomePath(auth.user?.role)} replace />;
  }

  return children;
}

export default ProtectedRoute;
