const COLOR_MAP = {
  accent: { bg: 'bg-sky-500/10', text: 'text-sky-400' },
  sky: { bg: 'bg-sky-500/10', text: 'text-sky-400' },
  red: { bg: 'bg-red-500/10', text: 'text-red-400' },
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-400' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
};

export default function StatCard({ icon: Icon, label, value, color = 'accent' }) {
  const c = COLOR_MAP[color] || COLOR_MAP.accent;
  return (
    <div className="bg-card rounded-xl p-5 border border-slate-700/30 hover:border-slate-600/50 transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        {Icon && (
          <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${c.bg}`}>
            <Icon className={`w-5 h-5 ${c.text}`} />
          </div>
        )}
      </div>
    </div>
  );
}