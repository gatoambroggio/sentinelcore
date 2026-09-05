import { useState, useEffect } from 'react';
import { Plus, Trash2, ScanFace, Loader2, UserPlus, Power } from 'lucide-react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function FaceId() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [faces, setFaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    api.get('/faces').then(r => setFaces(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const onFile = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!name || !file) return;
    setSubmitting(true);
    setError('');
    const fd = new FormData();
    fd.append('name', name);
    fd.append('photo', file);
    try {
      await api.post('/faces', fd);
      setName(''); setFile(null); setPreview(''); setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar rostro');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('¿Eliminar este rostro registrado?')) return;
    await api.delete(`/faces/${id}`);
    load();
  };

  const toggle = async (face) => {
    await api.put(`/faces/${face.id}`, { active: !face.active });
    load();
  };

  if (loading) return <div className="flex items-center justify-center h-full p-8"><Loader2 className="w-8 h-8 text-accent animate-spin" /></div>;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Face ID</h1>
          <p className="text-slate-400 text-sm mt-1">Rostros registrados para reconocimiento facial</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)} className="bg-accent hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
            <Plus className="w-4 h-4" /> Registrar rostro
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-card rounded-xl p-5 border border-slate-700/30 mb-6 space-y-4">
          {error && <div className="bg-red-500/10 text-red-400 text-sm rounded-lg p-3 border border-red-500/20">{error}</div>}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Nombre de la persona</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-panel border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="Ej: Juan Pérez" required />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Foto del rostro</label>
              <input type="file" accept="image/*" onChange={onFile} className="w-full text-sm text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-accent file:text-white file:text-sm file:font-medium file:cursor-pointer" required />
            </div>
          </div>
          {preview && <img src={preview} alt="preview" className="w-32 h-32 rounded-lg object-cover" />}
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="bg-accent hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {submitting ? 'Procesando...' : 'Guardar'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setPreview(''); setFile(null); }} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">Cancelar</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {faces.map(face => (
          <div key={face.id} className="bg-card rounded-xl border border-slate-700/30 overflow-hidden">
            <div className="aspect-square bg-panel">
              {face.photoUrl ? (
                <img src={face.photoUrl} alt={face.name} className={`w-full h-full object-cover ${!face.active ? 'opacity-40' : ''}`} />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><ScanFace className="w-10 h-10 text-slate-600" /></div>
              )}
            </div>
            <div className="p-3">
              <p className="font-medium text-sm truncate">{face.name}</p>
              <p className="text-xs text-slate-500 mb-2">{new Date(face.createdAt).toLocaleDateString('es-AR')}</p>
              {isAdmin && (
                <div className="flex gap-1">
                  <button onClick={() => toggle(face)} className="flex-1 bg-slate-700/40 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded text-xs flex items-center justify-center gap-1 transition-colors">
                    <Power className="w-3 h-3" /> {face.active ? 'On' : 'Off'}
                  </button>
                  <button onClick={() => remove(face.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {faces.length === 0 && !loading && (
        <div className="text-center py-16 text-slate-500">
          <ScanFace className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No hay rostros registrados. {isAdmin && 'Registrá el primero.'}</p>
        </div>
      )}
    </div>
  );
}