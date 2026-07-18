interface Props {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;  // tailwind color class for value
}

export function StatCard({ label, value, sub, accent = "text-slate-900" }: Props) {
  return (
    <div className="bg-white rounded-lg p-3 border border-slate-300 shadow-sm">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold font-mono ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}
