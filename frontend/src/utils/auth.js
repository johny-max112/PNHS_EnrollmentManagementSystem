const LEGACY_AUTH_KEY = 'pnhs-auth';
const AUTH_KEYS = {
  student: 'pnhs-auth-student',
  admin: 'pnhs-auth-admin',
  registrar: 'pnhs-auth-registrar',
};

function parseStoredAuth(raw, key) {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (_error) {
    localStorage.removeItem(key);
    return null;
  }
}

function isSupportedRole(role) {
  return role === 'student' || role === 'admin' || role === 'registrar';
}

export function getRoleFromPath(pathname) {
  if (pathname.startsWith('/student')) {
    return 'student';
  }

  if (pathname.startsWith('/admin')) {
    return 'admin';
  }

  if (pathname.startsWith('/registrar')) {
    return 'registrar';
  }

  return null;
}

export function getStoredAuthByRole(role) {
  if (!isSupportedRole(role)) {
    return null;
  }

  const raw = localStorage.getItem(AUTH_KEYS[role]);
  return parseStoredAuth(raw, AUTH_KEYS[role]);
}

export function storeAuthByRole(role, authData) {
  if (!isSupportedRole(role)) {
    return;
  }

  localStorage.setItem(AUTH_KEYS[role], JSON.stringify(authData));
}

export function clearStoredAuthByRole(role) {
  if (!isSupportedRole(role)) {
    return;
  }

  localStorage.removeItem(AUTH_KEYS[role]);
}

export function getStoredAuth() {
  const legacy = parseStoredAuth(localStorage.getItem(LEGACY_AUTH_KEY), LEGACY_AUTH_KEY);
  if (legacy?.user?.role && isSupportedRole(legacy.user.role)) {
    storeAuthByRole(legacy.user.role, legacy);
    localStorage.removeItem(LEGACY_AUTH_KEY);
    return legacy;
  }

  return null;
}
