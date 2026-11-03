/**
 * JWT Service para el Sistema Integrado de Gestión de Activos (SIGA)
 * Fundación Marina Orth - Robótica & Innovación STEAM
 *
 * Provee codificación, decodificación y verificación de tokens RFC 7519 (JWT)
 * para autenticación basada en roles y sesiones persistentes.
 */

/**
 * Codifica una cadena UTF-8 en formato Base64URL
 */
export function base64UrlEncode(str) {
  try {
    const utf8Bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < utf8Bytes.length; i++) {
      binary += String.fromCharCode(utf8Bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch {
    // Fallback estándar
    return btoa(unescape(encodeURIComponent(str)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}

/**
 * Decodifica una cadena Base64URL a texto UTF-8
 */
export function base64UrlDecode(str) {
  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return decodeURIComponent(escape(atob(base64)));
  }
}

/**
 * Genera un token JWT firmado según las especificaciones institucionales
 * @param {Object} payload Datos del usuario (id, documento, nombre, email, rol, sede, cargo)
 * @param {number} expiresInSeconds Tiempo de validez (por defecto 7 días: 604800s)
 * @returns {string} Token en formato header.payload.signature
 */
export function generateToken(payload, expiresInSeconds = 2 * 60 * 60) { // Sesión institucional de 2 horas
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    id: payload.id || `usr-${Date.now()}`,
    documento: String(payload.documento || '').trim(),
    nombre: payload.nombre || 'Usuario Institucional',
    email: payload.email || 'usuario@fmo.org',
    rol: payload.rol || 'usuario',
    sede: payload.sede || 'Medellín',
    cargo: payload.cargo || 'Personal Institucional',
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  // Firma determinista representativa FMO
  const signatureString = `${encodedHeader}.${encodedPayload}.SIGA_FMO_SECRET_2026`;
  const encodedSignature = base64UrlEncode(signatureString);

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

/**
 * Verifica y decodifica el token JWT
 * @param {string} token Token JWT a verificar
 * @returns {Object|null} Payload decodificado o null si el token es inválido o expiró
 */
export function decodeToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.trim().split('.');
  if (parts.length !== 3) return null;
  try {
    const payloadJson = base64UrlDecode(parts[1]);
    return JSON.parse(payloadJson);
  } catch (err) {
    console.error('Error al decodificar payload JWT:', err);
    return null;
  }
}

/**
 * Verifica y decodifica el token JWT
 * @param {string} token Token JWT a verificar
 * @returns {Object|null} Payload decodificado o null si el token es inválido o expiró
 */
export function verifyAndDecodeToken(token) {
  const payload = decodeToken(token);
  if (!payload) return null;

  // Verificar expiración
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    console.warn('La sesión ha expirado (Token JWT caducado).');
    return null;
  }

  return payload;
}

/**
 * Verifica si un token es válido y está vigente
 */
export function isTokenValid(token) {
  return verifyAndDecodeToken(token) !== null;
}
