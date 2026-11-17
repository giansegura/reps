import { Icon } from './Icon.jsx';

const setNumbers = (exercise) => Array.from({ length: exercise.sets }, (_, i) => i + 1);

export function SetTable({
  exercise,
  sets,
  activeSet,
  activeRow,
  level,
  noted,
  onSaveField,
  onTogglePC,
  onToggleDone,
  onMore,
}) {
  const Heading = level === 1 ? 'h1' : 'h2';

  return (
    <section className="exercise" aria-label={exercise.name}>
      <div className="exercise-head">
        <div className="exercise-heading">
          <Heading className="exercise-title">{exercise.name}</Heading>
          <p className="exercise-target">{exercise.sets} × {exercise.reps}</p>
        </div>
        <button
          className={`icon-btn${noted ? ' on' : ''}`}
          aria-label={`Notas y progreso de ${exercise.name}${noted ? ', con nota de hoy' : ''}`}
          onClick={onMore}
        >
          <Icon name="more" />
        </button>
      </div>
      <div className="sets">
        <div className="sets-head" aria-hidden="true">
          <span />
          <span>kg</span>
          <span>reps</span>
          <span />
        </div>
        {setNumbers(exercise).map(n => {
          const set = sets?.[n] ?? {};
          const isBW = set.weight === 'PC';
          const active = n === activeSet;
          return (
            <div
              key={n}
              ref={active ? activeRow : undefined}
              className={`set-row${set.done ? ' done' : ''}${active ? ' active' : ''}`}
            >
              <span className="set-num">{n}</span>
              <div className="set-cell">
                {isBW ? (
                  <button
                    className="set-input pc"
                    aria-label={`Serie ${n}: usar peso corporal`}
                    aria-pressed="true"
                    onClick={() => onTogglePC(exercise.id, n)}
                  >PC</button>
                ) : (
                  <input
                    className="set-input"
                    type="number"
                    inputMode="decimal"
                    autoComplete="off"
                    aria-label={`${exercise.name}, serie ${n}, peso en kilos`}
                    placeholder="—"
                    value={set.weight || ''}
                    onInput={(e) => onSaveField(exercise.id, n, 'weight', e.target.value)}
                    onChange={() => {}}
                  />
                )}
                {exercise.allowBW && active && !isBW && (
                  <button
                    className="pc-btn"
                    aria-label={`Serie ${n}: usar peso corporal`}
                    aria-pressed="false"
                    onClick={() => onTogglePC(exercise.id, n)}
                  >PC</button>
                )}
              </div>
              <input
                className="set-input"
                type="number"
                inputMode="numeric"
                autoComplete="off"
                aria-label={`${exercise.name}, serie ${n}, repeticiones${exercise.reps ? `, objetivo ${exercise.reps}` : ''}`}
                placeholder="—"
                value={set.reps || ''}
                onInput={(e) => onSaveField(exercise.id, n, 'reps', e.target.value)}
                onChange={() => {}}
              />
              <button
                className="set-check"
                aria-label={`Marcar serie ${n} de ${exercise.name}`}
                aria-pressed={!!set.done}
                aria-current={active ? 'step' : undefined}
                onClick={() => onToggleDone(exercise, n)}
              >
                <Icon name="check" size={26} strokeWidth={3} />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
