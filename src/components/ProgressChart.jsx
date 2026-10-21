import {
  formatChange,
  formatProgressValue,
  periodAriaLabel,
  periodLabel,
  progressSeries,
} from '../lib/progress.js';

const PERIOD_TEXT = {
  week: { label: 'Esta semana', empty: 'Sin entrenos esta semana' },
  month: { label: 'Este mes', empty: 'Sin entrenos este mes' },
};

const changeClass = (change) => {
  if (change > 0) return 'up';
  if (change < 0) return 'down';
  return 'flat';
};

const Segmented = ({ label, options, value, onChange }) => (
  <div className="seg" role="group" aria-label={label}>
    {options.map(option => (
      <button
        key={option.value}
        className={`seg-btn${option.value === value ? ' on' : ''}`}
        aria-pressed={option.value === value}
        onClick={() => onChange(option.value)}
      >
        {option.label}
      </button>
    ))}
  </div>
);

export const ProgressChart = ({
  sessions,
  planId,
  exercise,
  color,
  period,
  metric,
  onPeriodChange,
  onMetricChange,
  now = new Date(),
}) => {
  const { unit, empty, periods, current, change } = progressSeries(sessions, planId, exercise, { period, metric, now });
  const peak = Math.max(...periods.map(p => p.value));
  const text = PERIOD_TEXT[period];

  return (
    <div className="progress-chart">
      <div className="progress-controls">
        <Segmented
          label="Periodo"
          value={period}
          onChange={onPeriodChange}
          options={[{ value: 'week', label: 'Semana' }, { value: 'month', label: 'Mes' }]}
        />
        <Segmented
          label="Medida"
          value={metric}
          onChange={onMetricChange}
          options={[
            { value: 'volume', label: 'Volumen' },
            { value: 'max', label: unit === 'kg' ? 'Peso máx.' : 'Mejor serie' },
          ]}
        />
      </div>
      {empty ? (
        <p className="empty-text">Aún no hay entrenos guardados de este ejercicio</p>
      ) : (
        <>
          <p className="progress-period">{text.label}</p>
          <p className="progress-value">
            <span>{current === 0 ? text.empty : formatProgressValue(current, unit)}</span>
            {change !== null && (
              <span className={`progress-change ${changeClass(change)}`}>{formatChange(change)}</span>
            )}
          </p>
          <ol className="progress-bars" role="list" aria-label="Evolución">
            {periods.map((p, i) => {
              const isCurrent = i === periods.length - 1;
              const value = p.value === 0 ? 'sin entrenos' : formatProgressValue(p.value, unit);
              return (
                <li key={p.start.getTime()} className="progress-bar-item" aria-label={`${periodAriaLabel(p.start, period)}: ${value}`}>
                  <span className="progress-bar-track">
                    <span
                      className="progress-bar-fill"
                      style={{
                        height: `${peak > 0 ? (p.value / peak) * 100 : 0}%`,
                        background: isCurrent ? color : undefined,
                      }}
                    />
                  </span>
                  <span className="progress-bar-label" aria-hidden="true">
                    {periodLabel(p.start, periods[i - 1]?.start ?? null, period)}
                  </span>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
};
