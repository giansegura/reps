import { useRef } from 'react';
import { useModal } from './useModal.js';

export function ExerciseNotes({ exercise, opener, onClose }) {
  const dialogRef = useRef(null);
  useModal(dialogRef, onClose, opener);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-notes-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <span id="exercise-notes-title" className="modal-title">{exercise.name}</span>
          <button className="icon-btn" aria-label="Cerrar" autoFocus onClick={onClose}>✕</button>
        </div>
        <p className="modal-body">{exercise.notes}</p>
      </div>
    </div>
  );
}
