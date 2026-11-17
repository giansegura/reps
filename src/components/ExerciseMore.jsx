import { Icon } from './Icon.jsx';
import { Sheet } from './Sheet.jsx';

export function ExerciseMore({ exercise, note, opener, onEditNote, onShowProgress, onClose }) {
  const planNotes = exercise.notes?.trim();

  return (
    <Sheet labelledBy="more-title" opener={opener} onClose={onClose}>
      <div className="sheet-head">
        <h2 id="more-title" className="sheet-title">{exercise.name}</h2>
        <button className="round-btn" aria-label="Cerrar" autoFocus onClick={onClose}>
          <Icon name="close" size={20} />
        </button>
      </div>
      {planNotes && (
        <div className="more-block">
          <span className="kicker">Notas del plan</span>
          <p className="more-text">{planNotes}</p>
        </div>
      )}
      {note && (
        <div className="more-block">
          <span className="kicker">Nota de hoy</span>
          <p className="more-text">{note}</p>
        </div>
      )}
      <div className="sheet-actions">
        <button className="btn" onClick={onEditNote}>{note ? 'Editar nota' : 'Añadir nota'}</button>
        <button className="btn" onClick={onShowProgress}>Ver progreso</button>
      </div>
    </Sheet>
  );
}
