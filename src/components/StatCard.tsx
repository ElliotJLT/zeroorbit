interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}

export function StatCard({ icon, value, label }: StatCardProps) {
  return (
    <div className="bg-muted rounded-xl p-4 text-center border border-border">
      <div 
        className="inline-flex items-center justify-center w-10 h-10 rounded-full mb-2"
        style={{ background: 'hsl(var(--primary) / 0.15)' }}
      >
        {icon}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
