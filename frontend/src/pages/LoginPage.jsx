import { useState } from 'react';
import api from '../api/client';

function LoginPage({ onLogin, expectedRole = 'registrar' }) {
  const isAdmin = expectedRole === 'admin';
  const [username, setUsername] = useState(isAdmin ? 'admin' : 'registrar');
  const [password, setPassword] = useState(isAdmin ? 'Admin123!' : 'Registrar123!');
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
    <main className="page-shell">
      <form className="enroll-card auth-card" onSubmit={handleSubmit}>
        <h1>{isAdmin ? 'PNHS Admin Login' : 'PNHS Registrar Login'}</h1>
        <p>
          {isAdmin
            ? 'Use your admin account for full system and user management access.'
            : 'Use your registrar account to manage enrollment workflows and reports.'}
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
