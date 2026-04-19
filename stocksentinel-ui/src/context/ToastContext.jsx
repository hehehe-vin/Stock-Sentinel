import { createContext, useState, useContext, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);

    if (duration) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            className="flex items-center gap-3 p-4 rounded-lg shadow-lg min-w-[300px] animate-in slide-in-from-bottom border"
            style={{ 
              background: 'var(--bg-card)',
              borderColor: 'var(--border)',
              color: 'var(--text)' 
            }}
          >
            {toast.type === 'success' && <CheckCircle size={20} style={{ color: 'var(--success)' }} />}
            {toast.type === 'error' && <AlertCircle size={20} style={{ color: 'var(--danger)' }} />}
            {toast.type === 'info' && <Info size={20} style={{ color: 'var(--accent)' }} />}
            
            <p className="font-medium text-sm flex-1">{toast.message}</p>
            
            <button onClick={() => removeToast(toast.id)} className="p-1 hover:bg-black/5 rounded opacity-50 hover:opacity-100">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
