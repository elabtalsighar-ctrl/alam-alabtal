import { useState } from 'react';

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`} role="status" aria-label="جارٍ التحميل">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
    </div>
  );
}

export function PageLoader({ label = 'جارٍ التحميل...' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
      <Spinner />
      <p className="text-sm font-medium text-slate-500">{label}</p>
    </div>
  );
}

export function Stars({ rating, size = 18 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5 text-sun-500" aria-label={`التقييم ${rating} من 5`}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={i <= Math.round(rating) ? 'text-sun-500' : 'text-slate-200'}>
          <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </span>
      ))}
    </div>
  );
}

interface ImgProps {
  src?: string;
  alt: string;
  className?: string;
  fallback?: string;
}

const DEFAULT_FALLBACK = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="#eff6ff"/>
  <circle cx="200" cy="170" r="60" fill="#bfdbfe"/>
  <path fill="#f59e0b" d="M200 90 a70 70 0 1 1 -70 70 a58 62 0 0 1 140 -70 z"/>
  <rect x="40" y="260" width="320" height="90" rx="30" fill="#93c5fd"/>
  <circle cx="150" cy="300" r="26" fill="#60a5fa"/>
  <circle cx="230" cy="300" r="26" fill="#2563eb"/>
  <circle cx="190" cy="330" r="22" fill="#fbbf24"/>
</svg>`);

export function ImageWithFallback({ src, alt, className, fallback }: ImgProps) {
  const [error, setError] = useState(false);
  const url = src && !error ? src : fallback || DEFAULT_FALLBACK;
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      onError={() => setError(true)}
      className={className}
    />
  );
}

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
  actionLabel
}: {
  icon?: string;
  title: string;
  subtitle?: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center">
      {icon && <span className="text-5xl" aria-hidden="true">{icon}</span>}
      <h3 className="text-lg font-bold text-slate-800">{title}</h3>
      {subtitle && <p className="max-w-sm text-sm text-slate-500">{subtitle}</p>}
      {action && actionLabel && (
        <button onClick={action} className="btn-primary mt-2">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`fade-up relative z-10 max-h-[90vh] w-full ${wide ? 'max-w-3xl' : 'max-w-md'} overflow-y-auto rounded-2xl bg-white p-6 shadow-card`}>
        <div className="mb-4 flex items-center justify-between">
          {title && <h2 className="text-lg font-bold text-slate-800">{title}</h2>}
          <button onClick={onClose} aria-label="إغلاق" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Badge({ text, color }: { text: string; color: string }) {
  return <span className={`badge ${color}`}>{text}</span>;
}
