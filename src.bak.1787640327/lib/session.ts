import jwt from 'jsonwebtoken';

// JWT Secret — debe coincidir EXACTAMENTE con src/middleware.ts
// Si no hay variable de entorno, usa un secreto hardcoded consistente.
// Esto garantiza que el middleware (Edge runtime) y las rutas API (Node.js runtime)
// usen el mismo secreto para firmar y verificar tokens JWT.
const JWT_SECRET = process.env.JWT_SECRET || 'nexusone-pos-jwt-secret-v2.9.34-change-in-production';
const JWT_EXPIRES_IN = '24h';

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
  return jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN, algorithm: 'HS256' }
  );
}

/**
 * Verifica y decodifica un token JWT.
 */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Extrae el token JWT del header Authorization, query param o cookie.
 */
export function extractToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);

  const url = new URL(request.url);
  const tokenParam = url.searchParams.get('token');
  if (tokenParam) return tokenParam;

  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/session_token=([^;]+)/);
    if (match) return match[1];
  }

  return null;
}

/**
 * Valida la sesion de una request.
 */
export function validateSession(request: Request): SessionPayload | null {
  const token = extractToken(request);
  if (!token) return null;
  return verifySessionToken(token);
}
