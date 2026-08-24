"use client";

import dynamic from 'next/dynamic';

/**
 * Nexus One POS — Page (Client Component)
 * 
 * Carga el componente cliente principal con SSR deshabilitado.
 * Esto elimina TODOS los errores de hidratacion (React Error #310)
 * porque el servidor nunca renderiza el contenido de la app.
 * 
 * El cliente se encarga de todo: loading, login, y la app principal.
 */
const HomeClient = dynamic(() => import('@/app/home-client'), {
  ssr: false,
  loading: () => (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f8fafc',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 40, height: 40,
          border: '3px solid #e2e8f0',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px',
        }} />
        <p style={{ color: '#64748b', fontSize: 14 }}>Cargando Nexus One POS...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  ),
});

export default function Page() {
  return <HomeClient />;
}
