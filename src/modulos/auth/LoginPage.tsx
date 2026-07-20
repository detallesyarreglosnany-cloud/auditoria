import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export function LoginPage() {
  const [modo, setModo] = useState<'entrar' | 'registrar'>('entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function manejarEnvio(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    setCargando(true);

    const { error } =
      modo === 'entrar'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setCargando(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (modo === 'registrar') {
      setMensaje('Cuenta creada. Revisa tu correo para confirmar el acceso.');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 h-10 w-10 rounded-lg bg-acento flex items-center justify-center text-fondo font-bold text-lg">
            N
          </div>
          <h1 className="text-xl font-semibold text-texto">Nany OS</h1>
          <p className="text-sm text-texto-secundario mt-1">Dashboard Estratégico</p>
        </div>

        <form onSubmit={manejarEnvio} className="space-y-4">
          <div>
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
            />
          </div>
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-peligro">{error}</p>}
          {mensaje && <p className="text-sm text-acento">{mensaje}</p>}

          <Button type="submit" className="w-full" disabled={cargando}>
            {cargando ? 'Procesando…' : modo === 'entrar' ? 'Entrar' : 'Crear cuenta'}
          </Button>
        </form>

        <button
          className="mt-4 w-full text-center text-xs text-texto-secundario hover:text-texto transition-colors"
          onClick={() => setModo(modo === 'entrar' ? 'registrar' : 'entrar')}
        >
          {modo === 'entrar' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Entra'}
        </button>
      </Card>
    </div>
  );
}
