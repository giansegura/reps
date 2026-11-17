import { useRef } from 'react';
import { useModal } from './useModal.js';

export function Sheet({ label, labelledBy, describedBy, role = 'dialog', opener, onClose, children }) {
  const dialogRef = useRef(null);
  useModal(dialogRef, onClose, opener);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="sheet"
        role={role}
        aria-modal="true"
        aria-label={label}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="sheet-handle" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}
