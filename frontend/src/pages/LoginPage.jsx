import { useState } from 'react';
import api from '../api/client';
import '../styles/base.css';
import '../styles/LoginPage.css';

function LoginPage({ onLogin, expectedRole = 'registrar' }) {
  const isAdmin = expectedRole === 'admin';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/api/auth/login', { username, password });

      if (data?.user?.role !== expectedRole) {
        setError(`This portal is for ${expectedRole} accounts only.`);
        return;
      }

      onLogin(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell login-shell">
      <section className="login-branding" aria-label="School branding">
        <img className="login-logo" src="/logo_pnhs.png" alt="Pateros National High School logo" />
        <h1 className="school-name">Pateros National High School</h1>
        <p className="school-address">San Pedro, Pateros</p>
        <p className="school-system">Enrollment Management System</p>
      </section>

      <form className="enroll-card auth-card login-card" onSubmit={handleSubmit}>
        <h2>Login</h2>
        <p className="login-role-note">
          {isAdmin
            ? 'Admin account access'
            : 'Registrar account access'}
        </p>

        <label htmlFor="username">Username</label>
        <input
          id="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        {error && <p className="status error">{error}</p>}
      </form>
    </main>
  );
}

export default LoginPage;
