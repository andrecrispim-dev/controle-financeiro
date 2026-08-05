import { useEffect } from 'react';

export function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => {
      onClose?.();
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;
  return (
    <div className={`toast ${toast.type || 'success'}`} role="status">
      <span>{toast.message}</span>
      <button onClick={onClose} aria-label="Fechar mensagem">x</button>
    </div>
  );
}
