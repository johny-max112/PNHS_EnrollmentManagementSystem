import axios from 'axios';
import {
  clearStoredAuthByRole,
  getRoleFromPath,
  getStoredAuthByRole,
} from '../utils/auth';

const apiBaseUrl = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const role = getRoleFromPath(window.location.pathname);
  let auth = role ? getStoredAuthByRole(role) : null;

  // Fallback for edge routes where role cannot be inferred from path.
  if (!auth?.token) {
    auth = getStoredAuthByRole('admin') || getStoredAuthByRole('registrar');
  }

  if (auth?.token) {
    config.headers.Authorization = `Bearer ${auth.token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const requestUrl = error?.config?.url || '';
    const isLoginRequest = requestUrl.includes('/api/auth/login');

    if (status === 401 && !isLoginRequest) {
      const role = getRoleFromPath(window.location.pathname);

      if (role) {
        clearStoredAuthByRole(role);
        window.location.replace(`/${role}/login`);
      } else {
        clearStoredAuthByRole('admin');
        clearStoredAuthByRole('registrar');
        window.location.replace('/');
      }
    }

    return Promise.reject(error);
  }
);

export default api;
