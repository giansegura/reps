import { useState } from 'react';
import { Icon } from './Icon.jsx';
import { Sheet } from './Sheet.jsx';

export function ExerciseNoteEditor({ exercise, value, opener, fallback, onSave, onClose }) {
  const [text, setText] = useState(value);

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
    <Sheet label={`Nota · ${exercise.name}`} opener={opener} fallback={fallback} onClose={onClose}>
      <div className="sheet-head">
        <div className="sheet-heading">
          <span className="kicker">Nota de hoy</span>
          <h2 className="sheet-title">{exercise.name}</h2>
        </div>
        <button className="round-btn" aria-label="Cerrar" onClick={onClose}>
          <Icon name="close" size={20} />
        </button>
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
      <p className="sheet-hint">Se guarda con el entreno y la tendrás delante la próxima vez que hagas este ejercicio.</p>
      <div className="sheet-actions">
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn primary" onClick={save}>Guardar nota</button>
      </div>
    </Sheet>
  );
}
