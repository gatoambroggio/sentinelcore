import { useState, useEffect } from 'react';
import { Plus, Trash2, Camera, Video, Power, Loader2 } from 'lucide-react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import WebRTCStream from '../components/WebRTCStream.jsx';

export default function Cameras() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', ip: '', port: 554, username: '', password: '', channel: 1, subtype: 'main' });

  const load = () => {
    api.get('/cameras').then(r => setCameras(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    await api.post('/cameras', form);
    setForm({ name: '', ip: '', port: 554, username: '', password: '', channel: 1, subtype: 'main' });
    setShowForm(false);
    load();
  };

  const remove = async (id) => {
    if (!confirm('¿Eliminar esta cámara?')) return;
    await api.delete(`/cameras/${id}`);
    load();
  };

  const toggle = async (cam) => {
    await api.put(`/cameras/${cam.id}`, { active: !cam.active });
    load();
  };

  if (loading) return <div className="flex items-center justify-center h-full p-8"><Loader2 className="w-8 h-8 text-accent animate-spin" /></div>;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Cámaras</h1>
          <p className="text-slate-400 text-sm mt-1">Gestión de cámaras RTSP de la LAN</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)} className="bg-accent hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
            <Plus className="w-4 h-4" /> Agregar
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-card rounded-xl p-5 border border-slate-700/30 mb-6 grid md:grid-cols-3 gap-3">
          <input className="bg-panel border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="Nombre" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          <input className="bg-panel border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="IP (192.168.1.108)" value={form.ip} onChange={e => setForm({...form, ip: e.target.value})} required />
          <input type="number" className="bg-panel border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="Puerto" value={form.port} onChange={e => setForm({...form, port: +e.target.value})} />
          <input className="bg-panel border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="Usuario RTSP" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required />
          <input type="password" className="bg-panel border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="Password RTSP" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
          <input type="number" className="bg-panel border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="Canal" value={form.channel} onChange={e => setForm({...form, channel: +e.target.value})} />
          <select className="bg-panel border border-slate-700 rounded-lg px-3 py-2 text-sm" value={form.subtype} onChange={e => setForm({...form, subtype: e.target.value})}>
            <option value="main">Stream principal</option>
            <option value="sub">Stream secundario</option>
          </select>
          <div className="md:col-span-3 flex gap-2">
            <button type="submit" className="bg-accent hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Guardar</button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">Cancelar</button>
          </div>
        </form>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cameras.map(cam => (
          <div key={cam.id} className="bg-card rounded-xl border border-slate-700/30 overflow-hidden">
            <div className="aspect-video bg-panel flex items-center justify-center relative">
              {cam.active ? (
                <WebRTCStream cameraId={cam.id} />
              ) : (
                <Video className="w-10 h-10 text-slate-600" />
              )}
              <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium z-10 ${cam.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
                {cam.active ? 'ACTIVA' : 'INACTIVA'}
              </span>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Camera className="w-4 h-4 text-accent" />
                <h3 className="font-medium text-sm">{cam.name}</h3>
              </div>
              <p className="text-xs text-slate-400">{cam.ip}:{cam.port} · Canal {cam.channel}</p>
              <div className="flex gap-2 mt-3">
                {isAdmin && (
                  <>
                    <button onClick={() => toggle(cam)} className="flex-1 bg-slate-700/40 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors">
                      <Power className="w-3 h-3" /> {cam.active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button onClick={() => remove(cam.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-xs transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {cameras.length === 0 && !loading && (
        <div className="text-center py-16 text-slate-500">
          <Camera className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No hay cámaras registradas. {isAdmin && 'Agregá la primera cámara.'}</p>
        </div>
      )}
    </div>
  );
}