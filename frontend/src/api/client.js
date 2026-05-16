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

// Store active abort controllers for each request
const abortControllers = new Map();

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

  // Create abort controller for this request
  const controller = new AbortController();
  config.signal = controller.signal;
  
  // Store controller keyed by request URL for cleanup
  const key = `${config.method}:${config.url}`;
  abortControllers.set(key, controller);

  return config;
});

api.interceptors.response.use(
  (response) => {
    // Clean up abort controller after successful response
    const key = `${response.config.method}:${response.config.url}`;
    abortControllers.delete(key);
    return response;
  },
  (error) => {
    const status = error?.response?.status;
    const requestUrl = error?.config?.url || '';
    const isLoginRequest = requestUrl.includes('/api/auth/login');

    // Clean up abort controller even on error
    const key = `${error?.config?.method}:${error?.config?.url}`;
    abortControllers.delete(key);

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

// Export function to cancel all pending requests
export function cancelAllRequests() {
  abortControllers.forEach((controller) => {
    controller.abort();
  });
  abortControllers.clear();
}

export default api;
