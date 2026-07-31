import { Modal } from './Modal.jsx';

export function ConfirmDialog({ title, message, confirmLabel = 'Confirmar', onConfirm, onClose, danger = false }) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="muted">{message}</p>
      <div className="modalActions">
        <button className="secondary" onClick={onClose}>Cancelar</button>
        <button className={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}
