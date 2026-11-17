import { countDone } from '../lib/workout.js';
import { Icon } from './Icon.jsx';
import { Sheet } from './Sheet.jsx';

function IndexRow({ exercise, number, workout, current, onPick }) {
  const done = countDone(workout, exercise);
  const complete = done === exercise.sets;
  return (
    <button className="index-row" aria-current={current ? 'true' : undefined} onClick={onPick}>
      <span className="index-num">{number}</span>
      <span className="index-main">
        <span className="index-name">{exercise.name}</span>
        <span className="index-target">{exercise.sets} × {exercise.reps}</span>
      </span>
      {current && <span className="badge">Ahora</span>}
      <span className="index-count" aria-label={`${done} de ${exercise.sets} series`}>{done}/{exercise.sets}</span>
      {complete && <Icon name="check" size={20} strokeWidth={3.5} />}
    </button>
  );
}

export function WorkoutIndex({ groups, workout, currentIndex, opener, onPick, onClose }) {
  const numberOf = (groupPosition, exercisePosition) =>
    groups.slice(0, groupPosition).reduce((sum, group) => sum + group.exercises.length, 0) + exercisePosition + 1;

  return (
    <Sheet labelledBy="index-title" opener={opener} onClose={onClose}>
      <div className="sheet-head">
        <h2 id="index-title" className="sheet-title">Ejercicios de hoy</h2>
        <button className="round-btn" aria-label="Cerrar" autoFocus onClick={onClose}>
          <Icon name="close" size={20} />
        </button>
      </div>
      <div className="index-list">
        {groups.map((group, groupPosition) => {
          const rows = group.exercises.map((exercise, exercisePosition) => (
            <IndexRow
              key={exercise.id}
              exercise={exercise}
              number={numberOf(groupPosition, exercisePosition)}
              workout={workout}
              current={groupPosition === currentIndex && !group.superset}
              onPick={() => onPick(groupPosition)}
            />
          ));
          return group.superset ? (
            <div key={group.exercises[0].id} className="index-superset">
              <span className="kicker">
                Superserie{groupPosition === currentIndex && <span className="badge">Ahora</span>}
              </span>
              {rows}
            </div>
          ) : rows;
        })}
      </div>
    </Sheet>
  );
}
