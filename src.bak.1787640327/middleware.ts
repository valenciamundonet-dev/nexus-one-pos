import { NextRequest, NextResponse } from 'next/server';

// Rutas API que NO requieren autenticacion
const PUBLIC_ROUTES = [
  '/api/auth',
  '/api/product-images',
  '/api/catalog',
];

// Rutas API que requieren rol de administrador
const ADMIN_ROUTES = [
  '/api/users',
  '/api/roles',
  '/api/backup',
  '/api/license',
];

// JWT Secret — debe coincidir EXACTAMENTE con src/lib/session.ts
const JWT_SECRET = process.env.JWT_SECRET || 'nexusone-pos-jwt-secret-v2.9.34-change-in-production';

async function hmacSha256(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function base64urlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = str.length % 4;
  if (pad === 1) str += '=';
  else if (pad === 2) str += '==';
  else if (pad === 3) str += '=';
  const raw = atob(str);
  return raw;
}

async function verifyToken(token: string): Promise<{ userId: string; username: string; role: string } | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payloadStr = base64urlDecode(parts[1]);
    const payload = JSON.parse(payloadStr);

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    const expectedSigHex = await hmacSha256(JWT_SECRET, parts[0] + '.' + parts[1]);
    const sigB64url = parts[2];
    const sigHex = Array.from(atob(sigB64url.replace(/-/g, '+').replace(/_/g, '/')))
      .map(b => b.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('');

    if (expectedSigHex !== sigHex) return null;

    return { userId: payload.userId, username: payload.username, role: payload.role };
  } catch {
    return null;
  }
}

function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);

  const tokenParam = request.nextUrl.searchParams.get('token');
  if (tokenParam) return tokenParam;

  const cookieToken = request.cookies.get('session_token')?.value;
  if (cookieToken) return cookieToken;

  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/api/')) return NextResponse.next();

  for (const publicRoute of PUBLIC_ROUTES) {
    if (pathname === publicRoute || pathname.startsWith(publicRoute + '/')) return NextResponse.next();
  }

  const token = extractToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Acceso no autorizado. Inicie sesion.', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const session = await verifyToken(token);
  if (!session) {
    return NextResponse.json({ error: 'Sesion expirada o invalida. Inicie sesion nuevamente.', code: 'SESSION_EXPIRED' }, { status: 401 });
  }

  for (const adminRoute of ADMIN_ROUTES) {
    if (pathname === adminRoute || pathname.startsWith(adminRoute + '/')) {
      if (session.role !== 'admin') {
        return NextResponse.json({ error: 'Acceso restringido. Se requiere rol de administrador.', code: 'FORBIDDEN' }, { status: 403 });
      }
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', session.userId);
  requestHeaders.set('x-user-role', session.role);
  requestHeaders.set('x-username', session.username);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: '/api/:path*',
};
