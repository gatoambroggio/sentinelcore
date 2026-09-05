import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Shield, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-panel p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <Shield className="w-8 h-8 text-accent" />
            <span className="text-2xl font-bold">DAWA<span className="text-accent">Security</span></span>
          </div>
          <p className="text-slate-400 text-sm">Sistema de Vigilancia Local</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-card rounded-xl p-6 border border-slate-700/30 space-y-4">
          {error && (
            <div className="bg-red-500/10 text-red-400 text-sm rounded-lg p-3 border border-red-500/20">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-panel border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
              placeholder="admin@dahua.local"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-panel border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-sky-600 text-white font-medium rounded-lg py-2.5 text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
        <p className="text-center text-xs text-slate-500 mt-6">DAWA Security © 2026 — Local-Only System</p>
      </div>
    </div>
  );
}