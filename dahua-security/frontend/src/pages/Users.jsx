import { useState, useEffect } from 'react';
import { Plus, Trash2, Power, Loader2, Shield, User, Mail } from 'lucide-react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', fullName: '', role: 'OPERATOR' });

  const load = () => {
    api.get('/users').then(r => setUsers(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    await api.post('/users', form);
    setForm({ email: '', password: '', fullName: '', role: 'OPERATOR' });
    setShowForm(false);
    load();
  };

  const remove = async (id) => {
    if (!confirm('¿Eliminar este usuario?')) return;
    try {
      await api.delete(`/users/${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar');
    }
  };

  const toggle = async (u) => {
    try {
      await api.patch(`/users/${u.id}/active`, { active: !u.active });
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Error');
    }
  };

  const changeRole = async (u, role) => {
    await api.put(`/users/${u.id}`, { role });
    load();
  };

  if (loading) return <div className="flex items-center justify-center h-full p-8"><Loader2 className="w-8 h-8 text-accent animate-spin" /></div>;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-slate-400 text-sm mt-1">Gestión de usuarios del sistema</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-accent hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4" /> Nuevo usuario
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-card rounded-xl p-5 border border-slate-700/30 mb-6 grid md:grid-cols-2 gap-3">
          <input className="bg-panel border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
          <input type="password" className="bg-panel border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="Contraseña" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
          <input className="bg-panel border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="Nombre completo" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} />
          <select className="bg-panel border border-slate-700 rounded-lg px-3 py-2 text-sm" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
            <option value="OPERATOR">Operador</option>
            <option value="ADMIN">Administrador</option>
          </select>
          <div className="md:col-span-2 flex gap-2">
            <button type="submit" className="bg-accent hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Crear</button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">Cancelar</button>
          </div>
        </form>
      )}

      <div className="bg-card rounded-xl border border-slate-700/30 overflow-hidden">
        {users.map((u, i) => (
          <div key={u.id} className={`flex items-center gap-4 p-4 ${i > 0 ? 'border-t border-slate-700/30' : ''}`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${u.role === 'ADMIN' ? 'bg-accent/10 text-accent' : 'bg-slate-700/40 text-slate-400'}`}>
              {u.role === 'ADMIN' ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{u.fullName || u.email}</span>
                {u.id === currentUser?.id && <span className="text-xs text-accent">(vos)</span>}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Mail className="w-3 h-3" /> {u.email}
              </div>
            </div>
            <select
              value={u.role}
              onChange={e => changeRole(u, e.target.value)}
              disabled={u.id === currentUser?.id}
              className="bg-panel border border-slate-700 rounded-lg px-2 py-1 text-xs disabled:opacity-50"
            >
              <option value="OPERATOR">Operador</option>
              <option value="ADMIN">Admin</option>
            </select>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
              {u.active ? 'Activo' : 'Inactivo'}
            </span>
            <div className="flex gap-1">
              <button onClick={() => toggle(u)} disabled={u.id === currentUser?.id} className="bg-slate-700/40 hover:bg-slate-700 text-slate-200 p-2 rounded-lg disabled:opacity-30 transition-colors">
                <Power className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => remove(u.id)} disabled={u.id === currentUser?.id} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2 rounded-lg disabled:opacity-30 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
        {users.length === 0 && !loading && (
          <div className="text-center py-12 text-slate-500"><p>Sin usuarios</p></div>
        )}
      </div>
    </div>
  );
}