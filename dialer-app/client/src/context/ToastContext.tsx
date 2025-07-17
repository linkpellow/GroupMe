import React, { createContext, useContext, useState, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  title: string;
  description?: string;
  status: ToastType;
  duration?: number;
  isClosable?: boolean;
}

interface ToastContextType {
  toast: (props: Omit<Toast, 'id'>) => void;
  closeToast: (id: string) => void;
  toasts: Toast[];
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = (props: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...props, id };

    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss after duration (default 3000ms)
    const duration = props.duration || 3000;
    setTimeout(() => {
      closeToast(id);
    }, duration);

    return id;
  };

  const closeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast, closeToast, toasts }}>
      {children}

      {/* Render toasts */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-md shadow-md text-white p-4 flex items-start ${
              toast.status === 'success'
                ? 'bg-green-500'
                : toast.status === 'error'
                  ? 'bg-red-500'
                  : 'bg-blue-500'
            }`}
            style={{ minWidth: '300px', maxWidth: '400px' }}
          >
            <div className="flex-1">
              <div className="font-semibold">{toast.title}</div>
              {toast.description && <div className="mt-1 text-sm">{toast.description}</div>}
            </div>
            {toast.isClosable && (
              <button
                onClick={() => closeToast(toast.id)}
                className="text-white hover:text-gray-200"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context.toast;
};

export default ToastContext;
