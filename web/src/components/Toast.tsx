import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { CheckCircleIcon, CloseIcon } from './icons';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

const ToastContext = createContext<{
  notify: (message: string, type?: Toast['type']) => void;
}>({
  notify: () => {}
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts(t => t.filter(x => x.id !== id));
    }, 3500);
  }, []);

  const close = (id: number) => setToasts(t => t.filter(x => x.id !== id));

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="fixed bottom-6 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4" role="region" aria-live="polite">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`fade-up flex items-center gap-3 rounded-xl2 border px-4 py-3 shadow-card backdrop-blur ${
              t.type === 'success'
                ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
                : t.type === 'error'
                ? 'border-red-100 bg-red-50 text-red-800'
                : 'border-blue-100 bg-blue-50 text-blue-800'
            }`}
          >
            {t.type === 'success' ? <CheckCircleIcon size={20} /> : <span className="text-lg">💬</span>}
            <p className="flex-1 text-sm font-semibold">{t.message}</p>
            <button onClick={() => close(t.id)} aria-label="إغلاق" className="opacity-60 hover:opacity-100">
              <CloseIcon size={18} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
