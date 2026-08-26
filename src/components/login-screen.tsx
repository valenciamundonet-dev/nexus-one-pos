"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { CurrentUser } from "./users-tab";

interface LoginScreenProps {
  onLogin: (user: CurrentUser & { token?: string }) => void;
  storeName?: string;
}

export default function LoginScreen({ onLogin, storeName = "NexusOne" }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [appVer, setAppVer] = useState('');

  useEffect(() => {
    fetch('/api/app-version').then(r => r.json()).then(d => setAppVer(d.version || '')).catch(() => {});
  }, []);

  // Estado para forzar cambio de contraseña
  const [showForceChange, setShowForceChange] = useState(false);
  const [pendingUser, setPendingUser] = useState<CurrentUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  // Toggle password visibility
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [showLoginPwd, setShowLoginPwd] = useState(false);

  const EyeButton = ({ show, onToggle }: { show: boolean; onToggle: () => void }) => (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
      tabIndex={-1}
    >
      {show ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )}
    </button>
  );


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      toast.error("Ingrese su usuario");
      return;
    }
    if (!password.trim()) {
      toast.error("Ingrese su contrasena");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Error al iniciar sesion");
        return;
      }

      // Si el servidor indica que debe cambiar la contraseña
      if (data.requirePasswordChange) {
        setPendingUser(data);
        setShowForceChange(true);
        toast.warning("Debe cambiar la contrasena por defecto antes de continuar");
        return;
      }

      // Store token JWT and user data
      if (data.token) {
        localStorage.setItem("nexus-one-pos_token", data.token);
      }
      localStorage.setItem("nexus-one-pos_user", JSON.stringify(data));
      onLogin(data);
      toast.success(`Bienvenido, ${data.fullName || data.username}`);
    } catch {
      toast.error("Error de conexion con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleForceChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error("La nueva contrasena debe tener al menos 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Las contrasenas no coinciden");
      return;
    }
    if (newPassword === "admin") {
      toast.error("No puede usar la contrasena por defecto");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch("/api/auth", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: pendingUser?.id,
          currentPassword: password,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Error al cambiar la contrasena");
        return;
      }

      // Contraseña cambiada — guardar nuevo token si viene
      if (pendingUser) {
        if (data.token) {
          localStorage.setItem("nexus-one-pos_token", data.token);
        }
        localStorage.setItem("nexus-one-pos_user", JSON.stringify(pendingUser));
        onLogin(pendingUser);
        toast.success("Contrasena actualizada correctamente");
      }
    } catch {
      toast.error("Error de conexion con el servidor");
    } finally {
      setChangingPassword(false);
    }
  };

  // Pantalla de cambio forzado de contraseña
  if (showForceChange && pendingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0c1222 0%, #162033 40%, #1a1a2e 100%)' }}>
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20 blur-[100px]" style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }} />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full opacity-10 blur-[120px]" style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }} />
        </div>

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        <div className="relative w-full max-w-[400px] animate-fade-up">
          {/* Icon */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', boxShadow: '0 8px 32px rgba(245, 158, 11, 0.25)' }}>
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Cambiar Contrasena</h1>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              Por seguridad, debe cambiar la contrasena por defecto antes de usar el sistema.
            </p>
          </div>

          <Card className="border-white/[0.08] shadow-2xl" style={{ background: 'rgba(30, 41, 59, 0.7)', backdropFilter: 'blur(24px) saturate(150%)' }}>
            <CardContent className="p-7">
              <form onSubmit={handleForceChangePassword} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-slate-300 text-sm font-medium">
                    Nueva Contrasena
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPwd ? "text" : "password"}
                      placeholder="Minimo 6 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoFocus
                      autoComplete="new-password"
                      className="bg-slate-800/60 border-white/10 text-white placeholder:text-slate-500 focus:ring-amber-500/50 focus:border-amber-500/50 h-11 rounded-lg pr-10 transition-all"
                    />
                    <EyeButton show={showNewPwd} onToggle={() => setShowNewPwd(!showNewPwd)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-slate-300 text-sm font-medium">
                    Confirmar Contrasena
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPwd ? "text" : "password"}
                      placeholder="Repita la nueva contrasena"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      onKeyDown={(e) => e.key === "Enter" && handleForceChangePassword(e)}
                      className="bg-slate-800/60 border-white/10 text-white placeholder:text-slate-500 focus:ring-amber-500/50 focus:border-amber-500/50 h-11 rounded-lg pr-10 transition-all"
                    />
                    <EyeButton show={showConfirmPwd} onToggle={() => setShowConfirmPwd(!showConfirmPwd)} />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-sm font-semibold rounded-lg mt-2"
                  style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', boxShadow: '0 4px 16px rgba(245, 158, 11, 0.3)' }}
                  disabled={changingPassword}
                >
                  {changingPassword ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                      Cambiando...
                    </span>
                  ) : (
                    "Cambiar Contrasena y Entrar"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-slate-600 text-xs mt-8 font-medium">
            NexusOne POS v{appVer}
          </p>
        </div>
      </div>
    );
  }

  // Pantalla de login normal
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0c1222 0%, #162033 40%, #1a1a2e 100%)' }}>
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-15 blur-[100px]" style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }} />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full opacity-10 blur-[120px]" style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full opacity-[0.06] blur-[80px]" style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
      </div>

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

      <div className="relative w-full max-w-[400px] animate-fade-up">
        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-[72px] h-[72px] rounded-2xl mb-5" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)', boxShadow: '0 12px 40px rgba(59, 130, 246, 0.3)' }}>
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-[26px] font-bold text-white tracking-tight">{storeName}</h1>
          <p className="text-slate-400 text-sm mt-1.5 font-medium">Sistema Punto de Venta</p>
        </div>

        {/* Login Card */}
        <Card className="border-white/[0.08] shadow-2xl" style={{ background: 'rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(24px) saturate(150%)' }}>
          <CardContent className="p-7">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-300 text-sm font-medium">
                  Usuario
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Ingrese su usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                  autoComplete="username"
                  className="bg-slate-800/60 border-white/10 text-white placeholder:text-slate-500 focus:ring-blue-500/50 focus:border-blue-500/50 h-11 rounded-lg transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300 text-sm font-medium">
                  Contrasena
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showLoginPwd ? "text" : "password"}
                    placeholder="Ingrese su contrasena"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    onKeyDown={(e) => e.key === "Enter" && handleLogin(e)}
                    className="bg-slate-800/60 border-white/10 text-white placeholder:text-slate-500 focus:ring-blue-500/50 focus:border-blue-500/50 h-11 rounded-lg pr-10 transition-all"
                  />
                  <EyeButton show={showLoginPwd} onToggle={() => setShowLoginPwd(!showLoginPwd)} />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-sm font-semibold rounded-lg mt-1"
                style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)', boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)' }}
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                    Ingresando...
                  </span>
                ) : (
                  "Iniciar Sesion"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-1.5 mt-7">
          <span className="text-slate-600 text-xs font-medium">NexusOne POS v{appVer}</span>
          <span className="text-slate-700">&bull;</span>
          <span className="text-slate-600 text-xs">Doble Moneda $/Bs</span>
        </div>
      </div>
    </div>
  );
}