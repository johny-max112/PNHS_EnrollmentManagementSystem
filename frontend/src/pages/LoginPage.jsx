import { useState } from 'react';
import api from '../api/client';

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('registrar');
  const [password, setPassword] = useState('Registrar123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/api/auth/login', { username, password });
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
        <h1>PNHS Staff Login</h1>
        <p>Use your Registrar or Admin account to access enrollment workflows.</p>

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
