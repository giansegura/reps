import { useState } from 'react';
import { ProgressChart } from './ProgressChart.jsx';

const optionValue = (day, exercise) => `${day.id}:${exercise.id}`;

export const Progress = ({ plan, sessions, period, metric, onPeriodChange, onMetricChange, onBack }) => {
  const days = plan.days.filter(d => d.exercises.length > 0);
  const [selected, setSelected] = useState(() => optionValue(days[0], days[0].exercises[0]));
  const day = days.find(d => d.exercises.some(ex => optionValue(d, ex) === selected)) ?? days[0];
  const exercise = day.exercises.find(ex => optionValue(day, ex) === selected) ?? day.exercises[0];

  return (
    <>
      <div className="page-header">
        <button className="back-btn" onClick={onBack}>← Inicio</button>
        <h1 className="page-title">{plan.name}</h1>
      </div>
      <select
        className="field-input progress-select"
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
