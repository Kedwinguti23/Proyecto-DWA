// MOCK: hash determinista para el login de demostración.
// En producción debe sustituirse por argon2/bcrypt en el backend (RNF09).
export function hashPassword(value, salt = 'hf-admin-v2') {
  const input = `${salt}:${value}`;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
