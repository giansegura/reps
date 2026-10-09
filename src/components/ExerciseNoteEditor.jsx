import { useEffect, useState } from 'react';

export function ExerciseNoteEditor({ exercise, value, onSave, onClose }) {
  const [text, setText] = useState(value);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const save = () => {
    onSave(exercise.id, text);
    onClose();
  };

  const onTextKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      save();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-note-editor-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <span id="exercise-note-editor-title" className="modal-title">Nota · {exercise.name}</span>
          <button className="icon-btn" aria-label="Cerrar" onClick={onClose}>✕</button>
        </div>
        <textarea
          className="field-input field-textarea"
          rows={4}
          autoFocus
          value={text}
          placeholder="Cómo ha ido, sensaciones, molestias, qué cambiar la próxima vez…"
          aria-label={`Nota de ${exercise.name}`}
          onInput={(e) => setText(e.target.value)}
          onChange={() => {}}
          onKeyDown={onTextKeyDown}
        />
        <div className="modal-actions">
          <button className="modal-btn" onClick={onClose}>Cancelar</button>
          <button className="modal-btn primary" onClick={save}>Guardar nota</button>
        </div>
      </div>
    </div>
  );
}
