import { useEffect, useState } from 'react';
import api from '../api/client';
import '../styles/base.css';
import '../styles/AdminUsersPage.css';

const defaultForm = {
  username: '',
  password: '',
  fullName: '',
  role: 'registrar',
};

function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState(defaultForm);
  const [drafts, setDrafts] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/api/admin/users');
      setUsers(data.users || []);
      const nextDrafts = {};
      (data.users || []).forEach((user) => {
        nextDrafts[user.id] = {
          fullName: user.full_name,
          role: user.role,
          isActive: Boolean(user.is_active),
          password: '',
        };
      });
      setDrafts(nextDrafts);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const updateDraft = (userId, key, value) => {
    setDrafts((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [key]: value,
      },
    }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      const { data } = await api.post('/api/admin/users', formData);
      setMessage(data.message);
      setFormData(defaultForm);
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user.');
    }
  };

  const saveUser = async (userId) => {
    setMessage('');
    setError('');
    try {
      const draft = drafts[userId];
      const payload = {
        fullName: draft.fullName,
        role: draft.role,
        isActive: draft.isActive,
      };
      if (draft.password) {
        payload.password = draft.password;
      }
      const { data } = await api.patch(`/api/admin/users/${userId}`, payload);
      setMessage(data.message);
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user.');
    }
  };

  return (
    <main className="page-shell">
      <section className="admin-layout">
        <form className="enroll-card" onSubmit={handleCreate}>
          <h1>Admin User Management</h1>
          <p>Create and manage Registrar/Admin accounts.</p>

          <label htmlFor="username">Username</label>
          <input
            id="username"
            value={formData.username}
            onChange={(event) => setFormData((prev) => ({ ...prev, username: event.target.value }))}
            required
          />

          <label htmlFor="fullName">Full Name</label>
          <input
            id="fullName"
            value={formData.fullName}
            onChange={(event) => setFormData((prev) => ({ ...prev, fullName: event.target.value }))}
            required
          />

          <label htmlFor="password">Temporary Password</label>
          <input
            id="password"
            type="password"
            value={formData.password}
            onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
            required
          />

          <label htmlFor="role">Role</label>
          <select
            id="role"
            value={formData.role}
            onChange={(event) => setFormData((prev) => ({ ...prev, role: event.target.value }))}
          >
            <option value="registrar">Registrar</option>
            <option value="admin">Admin</option>
          </select>

          <button type="submit">Create User</button>
          {error && <p className="status error">{error}</p>}
          {message && <p className="status success">{message}</p>}
        </form>

        <section className="enroll-card">
          <h2>Existing Users</h2>
          {loading && <p>Loading users...</p>}
          <div className="table-wrap">
            <table className="workflow-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Full Name</th>
                  <th>Role</th>
                  <th>Active</th>
                  <th>Reset Password</th>
                  <th>Save</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const draft = drafts[user.id] || {
                    fullName: user.full_name,
                    role: user.role,
                    isActive: Boolean(user.is_active),
                    password: '',
                  };

                  return (
                    <tr key={user.id}>
                      <td>{user.username}</td>
                      <td>
                        <input
                          value={draft.fullName}
                          onChange={(event) => updateDraft(user.id, 'fullName', event.target.value)}
                        />
                      </td>
                      <td>
                        <select
                          value={draft.role}
                          onChange={(event) => updateDraft(user.id, 'role', event.target.value)}
                        >
                          <option value="registrar">Registrar</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td>
                        <select
                          value={draft.isActive ? 'active' : 'inactive'}
                          onChange={(event) => updateDraft(user.id, 'isActive', event.target.value === 'active')}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="password"
                          placeholder="Optional"
                          value={draft.password}
                          onChange={(event) => updateDraft(user.id, 'password', event.target.value)}
                        />
                      </td>
                      <td>
                        <button type="button" onClick={() => saveUser(user.id)}>Save</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}

export default AdminUsersPage;
