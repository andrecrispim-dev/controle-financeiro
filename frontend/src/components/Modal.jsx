import { X } from 'lucide-react';

export function Modal({ title, children, onClose, wide = false }) {
  return (
    <div className="modalBackdrop" role="presentation">
      <section className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modalHeader">
          <h2>{title}</h2>
          <button className="iconButton" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
