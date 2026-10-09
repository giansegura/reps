import { useEffect } from 'react';

export function ExerciseNotes({ exercise, onClose }) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
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
