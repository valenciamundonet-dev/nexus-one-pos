import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// JWT Secret — DEBE ser consistente con el middleware (src/middleware.ts)
// Si no esta en .env, se genera un secreto temporal en runtime.
// NOTA: Sin JWT_SECRET en .env, los tokens no sobreviven un reinicio del servidor.
let _runtimeSecret: string | null = null;
function getJwtSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (!_runtimeSecret) {
    _runtimeSecret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    console.warn('[SECURITY] JWT_SECRET no configurado en .env — usando secreto temporal. Los tokens no sobreviviran un reinicio. Agregue JWT_SECRET=... a su .env');
  }
  return _runtimeSecret;
}
const JWT_SECRET = getJwtSecret();
const JWT_EXPIRES_IN = '24h'; // Token expira en 24 horas

export interface SessionPayload {
  userId: string;
  username: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Genera un token JWT firmado para la sesion del usuario.
 */
export function createSessionToken(user: {
  id: string;
  username: string;
  role: string;
}): string {
  const payload = {
    userId: user.id,
    username: user.username,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: 'HS256',
  });
}

/**
 * Verifica y decodifica un token JWT.
 * Retorna el payload si es valido, null si no.
 */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    }) as SessionPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Extrae el token JWT del header Authorization: Bearer <token>
 * Tambien acepta token via query param (para downloads) o cookie.
 */
export function extractToken(request: Request): string | null {
  // 1. Header Authorization: Bearer <token>
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // 2. Query param ?token=<token> (para downloads de archivos)
  const url = new URL(request.url);
  const tokenParam = url.searchParams.get('token');
  if (tokenParam) {
    return tokenParam;
  }

  // 3. Cookie: session_token=<token>
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/session_token=([^;]+)/);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Valida la sesion de una request.
 * Retorna el payload del usuario o null si no hay sesion valida.
 */
export function validateSession(request: Request): SessionPayload | null {
  const token = extractToken(request);
  if (!token) return null;
  return verifySessionToken(token);
}
