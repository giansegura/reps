import { useState } from 'react';
import { Icon } from './Icon.jsx';
import { ProgressChart } from './ProgressChart.jsx';

const optionValue = (day, exercise) => `${day.id}:${exercise.id}`;

export const Progress = ({ plan, sessions, period, metric, onPeriodChange, onMetricChange }) => {
  const days = plan.days.filter(d => d.exercises.length > 0);
  const [selected, setSelected] = useState(() => (days[0] ? optionValue(days[0], days[0].exercises[0]) : null));
  const header = (
    <header className="page-top">
      <h1 className="page-title">Progreso</h1>
    </header>
  );

  if (days.length === 0) {
    return (
      <>
        {header}
        <p className="empty-text">Este plan aún no tiene ejercicios</p>
      </>
    );
  }

  const day = days.find(d => d.exercises.some(ex => optionValue(d, ex) === selected)) ?? days[0];
  const exercise = day.exercises.find(ex => optionValue(day, ex) === selected) ?? day.exercises[0];

  return (
    <>
      {header}
      <div className="select-wrap">
        <select
          className="select"
          aria-label="Ejercicio"
          value={optionValue(day, exercise)}
          onChange={(e) => setSelected(e.target.value)}
        >
          {days.map(d => (
            <optgroup key={d.id} label={d.label}>
              {d.exercises.map(ex => (
                <option key={ex.id} value={optionValue(d, ex)}>{ex.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <Icon name="down" size={18} />
      </div>
      <p className="progress-day">
        <span className="dot" style={{ background: day.color }} />
        {day.label}
      </p>
      <ProgressChart
        sessions={sessions}
        planId={plan.id}
        exercise={exercise}
        color={day.color}
        period={period}
        metric={metric}
        onPeriodChange={onPeriodChange}
        onMetricChange={onMetricChange}
      />
    </>
  );
};
