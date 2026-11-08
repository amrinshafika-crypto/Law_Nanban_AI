import { ReactNode } from 'react';

export function Card({ children, className = '', hover = false }: { children: ReactNode; className?: string; hover?: boolean }) {
  return <div className={`card ${hover ? 'card-hover' : ''} ${className}`}>{children}</div>;
}

export function Badge({ children, color = 'navy', className = '' }: { children: ReactNode; color?: string; className?: string }) {
  const colors: Record<string, string> = {
    navy: 'bg-navy-100 text-navy-700',
    gold: 'bg-gold-100 text-gold-800',
    accent: 'bg-accent-100 text-accent-700',
    success: 'bg-success-100 text-success-700',
    warning: 'bg-warning-100 text-warning-700',
    danger: 'bg-danger-100 text-danger-700',
    gray: 'bg-gray-100 text-gray-600',
  };
  return <span className={`badge ${colors[color] || colors.navy} ${className}`}>{children}</span>;
}

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <div
      className="animate-spin rounded-full border-2 border-navy-200 border-t-navy-600"
      style={{ width: size, height: size }}
    />
  );
}

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <Spinner size={32} />
      <p className="text-sm text-navy-500">{message}</p>
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      {icon && <div className="text-navy-300">{icon}</div>}
      <h3 className="text-base font-semibold text-navy-700">{title}</h3>
      {description && <p className="text-sm text-navy-500 max-w-md">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-danger-100 flex items-center justify-center text-danger-600">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <p className="text-sm text-danger-700 max-w-md">{message}</p>
      {onRetry && <button onClick={onRetry} className="btn-outline">Try again</button>}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-serif font-semibold text-navy-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-navy-500 mt-1">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function StatCard({ label, value, icon, trend, color = 'navy' }: { label: string; value: string | number; icon?: ReactNode; trend?: string; color?: string }) {
  const iconColors: Record<string, string> = {
    navy: 'bg-navy-100 text-navy-600',
    gold: 'bg-gold-100 text-gold-700',
    accent: 'bg-accent-100 text-accent-700',
    success: 'bg-success-100 text-success-700',
    warning: 'bg-warning-100 text-warning-700',
    danger: 'bg-danger-100 text-danger-700',
  };
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-navy-500 font-medium">{label}</p>
          <p className="text-2xl font-serif font-semibold text-navy-900 mt-1">{value}</p>
          {trend && <p className="text-xs text-navy-400 mt-1">{trend}</p>}
        </div>
        {icon && <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconColors[color]}`}>{icon}</div>}
      </div>
    </div>
  );
}

export function priorityBadge(priority: string) {
  const map: Record<string, { color: string; label: string }> = {
    urgent: { color: 'danger', label: 'Urgent' },
    high: { color: 'warning', label: 'High' },
    normal: { color: 'accent', label: 'Normal' },
    low: { color: 'gray', label: 'Low' },
  };
  const cfg = map[priority] || map.normal;
  return <Badge color={cfg.color}>{cfg.label}</Badge>;
}

export function statusBadge(status: string) {
  const map: Record<string, { color: string; label: string }> = {
    intake: { color: 'gray', label: 'Intake' },
    active: { color: 'accent', label: 'Active' },
    review: { color: 'warning', label: 'Under Review' },
    hearing: { color: 'gold', label: 'In Hearing' },
    disposed: { color: 'success', label: 'Disposed' },
    closed: { color: 'gray', label: 'Closed' },
    archived: { color: 'gray', label: 'Archived' },
  };
  const cfg = map[status] || map.intake;
  return <Badge color={cfg.color}>{cfg.label}</Badge>;
}

export function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    criminal: 'Criminal', civil: 'Civil', family: 'Family', property: 'Property',
    consumer: 'Consumer', cyber: 'Cyber', labor: 'Labor', constitutional: 'Constitutional',
    corporate: 'Corporate', tax: 'Tax', other: 'Other',
  };
  return labels[category] || category;
}
