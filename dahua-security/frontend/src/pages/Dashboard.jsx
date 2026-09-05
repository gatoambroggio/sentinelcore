import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { AlertTriangle, Camera, Users, ScanFace, Activity, Clock, ShieldAlert } from 'lucide-react';
import api from '../api/client.js';
import StatCard from '../components/StatCard.jsx';

const PIE_COLORS = ['#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981'];
const TYPE_LABELS = { PERSON: 'Persona', VEHICLE: 'Vehículo', INTRUSION: 'Intrusión', FACE_ID: 'Face ID', UNKNOWN_FACE: 'Desconocido' };

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => api.get('/stats').then(r => setStats(r.data)).catch(() => {});
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return <div className="flex items-center justify-center h-full p-8"><div className="w-8 h-8 border-4 border-slate-700 border-t-accent rounded-full animate-spin" /></div>;
  }

  const t = stats?.totals || {};
  const typeData = (stats?.eventsByType || []).map(e => ({ name: TYPE_LABELS[e.type] || e.type, value: e.count }));
  const hourlyData = stats?.hourly || [];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Resumen del sistema de vigilancia · actualización automática</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Activity} label="Eventos 24h" value={t.events24h ?? 0} color="sky" />
        <StatCard icon={ShieldAlert} label="Intrusiones" value={t.intrusions ?? 0} color="red" />
        <StatCard icon={ScanFace} label="Face ID" value={t.faceIds ?? 0} color="violet" />
        <StatCard icon={Camera} label="Cámaras activas" value={`${t.activeCameras ?? 0}/${t.cameras ?? 0}`} color="emerald" />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-xl p-5 border border-slate-700/30 lg:col-span-2">
          <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent" /> Eventos por hora (últimas 24h)
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="hour" stroke="#64748b" fontSize={10} interval={2} />
              <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
              <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-xl p-5 border border-slate-700/30">
          <h3 className="text-sm font-medium text-slate-300 mb-4">Eventos por tipo</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                {typeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Last intrusion + cameras by events */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl p-5 border border-slate-700/30">
          <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" /> Última intrusión detectada
          </h3>
          {stats?.lastIntrusion ? (
            <div className="space-y-2">
              {stats.lastIntrusion.snapshotPath && (
                <img src={stats.lastIntrusion.snapshotPath} alt="snapshot" className="w-full rounded-lg max-h-48 object-cover" />
              )}
              <div className="text-sm text-slate-300">
                <span className="text-slate-400">Cámara:</span> {stats.lastIntrusion.camera || '-'}
              </div>
              <div className="text-sm text-slate-300">
                <span className="text-slate-400">Tipo:</span> {TYPE_LABELS[stats.lastIntrusion.type] || stats.lastIntrusion.type}
              </div>
              <div className="text-sm text-slate-300">
                <span className="text-slate-400">Confianza:</span> {(stats.lastIntrusion.confidence * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-slate-500">
                {new Date(stats.lastIntrusion.createdAt).toLocaleString('es-AR')}
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Sin intrusiones registradas</p>
          )}
        </div>
        <div className="bg-card rounded-xl p-5 border border-slate-700/30">
          <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
            <Camera className="w-4 h-4 text-accent" /> Eventos por cámara (24h)
          </h3>
          {(stats?.byCamera || []).length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.byCamera} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} />
                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={100} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
                <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-sm">Sin eventos en las últimas 24h</p>
          )}
        </div>
      </div>
    </div>
  );
}