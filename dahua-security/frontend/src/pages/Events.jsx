import { useState, useEffect } from 'react';
import { Download, Search, Loader2, AlertTriangle, ScanFace, ShieldAlert, Car, User } from 'lucide-react';
import api from '../api/client.js';

const TYPE_META = {
  PERSON: { label: 'Persona', icon: User, color: 'text-sky-400 bg-sky-500/10' },
  VEHICLE: { label: 'Vehículo', icon: Car, color: 'text-amber-400 bg-amber-500/10' },
  INTRUSION: { label: 'Intrusión', icon: ShieldAlert, color: 'text-red-400 bg-red-500/10' },
  FACE_ID: { label: 'Face ID', icon: ScanFace, color: 'text-violet-400 bg-violet-500/10' },
  UNKNOWN_FACE: { label: 'Desconocido', icon: AlertTriangle, color: 'text-orange-400 bg-orange-500/10' },
};

export default function Events() {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: '', cameraId: '', from: '', to: '', minConfidence: '' });
  const [cameras, setCameras] = useState([]);

  useEffect(() => {
    api.get('/cameras').then(r => setCameras(r.data)).catch(() => {});
  }, []);

  const load = () => {
    setLoading(true);
    const params = { ...filters, page, limit: 50 };
    Object.keys(params).forEach(k => !params[k] && delete params[k]);
    api.get('/events', { params }).then(r => {
      setEvents(r.data.events);
      setTotal(r.data.total);
      setPages(r.data.pages);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, filters]);

  const applyFilters = () => { setPage(1); load(); };

  const exportData = (format) => {
    const params = new URLSearchParams();
    if (filters.type) params.set('type', filters.type);
    if (filters.cameraId) params.set('cameraId', filters.cameraId);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    window.open(`/api/events/export/${format}?${params.toString()}`);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Eventos</h1>
          <p className="text-slate-400 text-sm mt-1">{total} eventos registrados</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportData('csv')} className="bg-card hover:bg-slate-700 border border-slate-700/30 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={() => exportData('pdf')} className="bg-card hover:bg-slate-700 border border-slate-700/30 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
            <Download className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl p-4 border border-slate-700/30 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Tipo</label>
          <select value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})} className="bg-panel border border-slate-700 rounded-lg px-3 py-2 text-sm">
            <option value="">Todos</option>
            <option value="PERSON">Persona</option>
            <option value="VEHICLE">Vehículo</option>
            <option value="INTRUSION">Intrusión</option>
            <option value="FACE_ID">Face ID</option>
            <option value="UNKNOWN_FACE">Desconocido</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Cámara</label>
          <select value={filters.cameraId} onChange={e => setFilters({...filters, cameraId: e.target.value})} className="bg-panel border border-slate-700 rounded-lg px-3 py-2 text-sm">
            <option value="">Todas</option>
            {cameras.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Desde</label>
          <input type="datetime-local" value={filters.from} onChange={e => setFilters({...filters, from: e.target.value})} className="bg-panel border border-slate-700 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Hasta</label>
          <input type="datetime-local" value={filters.to} onChange={e => setFilters({...filters, to: e.target.value})} className="bg-panel border border-slate-700 rounded-lg px-3 py-2 text-sm" />
        </div>
        <button onClick={applyFilters} className="bg-accent hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
          <Search className="w-4 h-4" /> Filtrar
        </button>
      </div>

      {/* Events list */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-accent animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {events.map(ev => {
            const meta = TYPE_META[ev.type] || TYPE_META.PERSON;
            const Icon = meta.icon;
            return (
              <div key={ev.id} className="bg-card rounded-lg border border-slate-700/30 p-4 flex gap-4 hover:border-slate-600/50 transition-colors">
                {ev.snapshotPath ? (
                  <img src={ev.snapshotPath} alt="snapshot" className="w-24 h-24 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-panel flex items-center justify-center flex-shrink-0">
                    <Icon className="w-8 h-8 text-slate-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>{meta.label}</span>
                    {ev.faceName && <span className="text-violet-400 text-sm font-medium">{ev.faceName}</span>}
                  </div>
                  <p className="text-sm text-slate-300">{ev.message || '—'}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                    <span>{ev.camera?.name || '—'}</span>
                    <span>Confianza: {(ev.confidence * 100).toFixed(1)}%</span>
                    <span>{new Date(ev.createdAt).toLocaleString('es-AR')}</span>
                  </div>
                </div>
              </div>
            );
          })}
          {events.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No se encontraron eventos con esos filtros</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="bg-card border border-slate-700/30 px-4 py-2 rounded-lg text-sm disabled:opacity-40 hover:bg-slate-700 transition-colors">Anterior</button>
          <span className="text-sm text-slate-400">Página {page} de {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="bg-card border border-slate-700/30 px-4 py-2 rounded-lg text-sm disabled:opacity-40 hover:bg-slate-700 transition-colors">Siguiente</button>
        </div>
      )}
    </div>
  );
}