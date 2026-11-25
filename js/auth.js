// Autenticación MOCK del panel (RNF09).
// // MOCK: reemplazar por sesión real con JWT/HttpOnly cookie en el backend.
import {CONFIG} from './config.js';
import {hashPassword} from './hash.js';

const SESSION_KEY = 'hf_admin_session';
const ATTEMPTS_KEY = 'hf_admin_attempts';

function readAttempts() {
  try { return JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || '{}'); }
  catch (_) { return {}; }
}
function saveAttempts(value) {
  try { localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(value)); }
  catch (_) {}
}

export function login(user, password) {
  const attempts = readAttempts();
  const now = Date.now();

  if (attempts.lockedUntil && now < attempts.lockedUntil) {
    const mins = Math.ceil((attempts.lockedUntil - now) / 60000);
    throw new Error(`Panel bloqueado por intentos fallidos. Intenta de nuevo en ${mins} minuto(s).`);
  }

  const valid = String(user).trim().toLowerCase() === CONFIG.admin.username &&
    hashPassword(String(password)) === CONFIG.admin.passwordHash;

  if (!valid) {
    const withinWindow = now - (attempts.firstAt || now) < CONFIG.admin.lockMinutes * 60000;
    const count = (withinWindow ? (attempts.count || 0) : 0) + 1;
    const locked = count >= CONFIG.admin.maxAttempts;
    saveAttempts({
      count,
      firstAt: attempts.firstAt || now,
      lockedUntil: locked ? now + CONFIG.admin.lockMinutes * 60000 : 0
    });
    throw new Error(locked
      ? 'Demasiados intentos fallidos. Panel bloqueado durante 15 minutos.'
      : 'Usuario o contraseña incorrectos.');
  }

  saveAttempts({count: 0, firstAt: 0, lockedUntil: 0});
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({at: now})); }
  catch (_) {}
  return true;
}

export function logout() {
  try { sessionStorage.removeItem(SESSION_KEY); }
  catch (_) {}
}

export function isAuthenticated() {
  try {
    const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    return Boolean(session && Date.now() - session.at < CONFIG.admin.sessionHours * 3600000);
  } catch (_) {
    return false;
  }
}
