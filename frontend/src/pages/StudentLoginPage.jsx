import { useState } from 'react';
import api from '../api/client';

function StudentLoginPage({ onLogin }) {
  const [lrn, setLrn] = useState('100000000001');
  const [password, setPassword] = useState('Student123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/api/student-auth/login', { lrn, password });
      onLogin(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Student login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell">
      <form className="enroll-card auth-card" onSubmit={handleSubmit}>
        <h1>Student Login</h1>
        <p>Sign in with your LRN to manage your own enrollment only.</p>

        <label htmlFor="lrn">LRN</label>
        <input id="lrn" value={lrn} onChange={(event) => setLrn(event.target.value)} required />

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

export default StudentLoginPage;
