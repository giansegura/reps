import { formatShortDate } from '../lib/format.js';
import {
  formatChange,
  formatProgressValue,
  periodAriaLabel,
  periodLabel,
  progressSeries,
  recentSessions,
} from '../lib/progress.js';
import { SetsText } from './SetsText.jsx';

const PERIOD_TEXT = {
  week: { label: 'Esta semana', empty: 'Sin entrenos esta semana' },
  month: { label: 'Este mes', empty: 'Sin entrenos este mes' },
};

const decimalFormat = new Intl.NumberFormat('es-ES', { useGrouping: 'always', maximumFractionDigits: 1 });
const wholeFormat = new Intl.NumberFormat('es-ES', { useGrouping: 'always', maximumFractionDigits: 0 });

const compact = (value) => {
  if (value >= 10_000) return `${decimalFormat.format(value / 1000)}k`;
  return value >= 1000 ? wholeFormat.format(value) : decimalFormat.format(value);
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
  const recent = recentSessions(sessions, planId, exercise.id);

  return (
    <div className="progress-chart" style={{ '--accent': color }}>
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
          <div className="stat">
            <p className="kicker">{text.label}</p>
            <p className={`stat-value${current === 0 ? ' none' : ''}`}>
              <span>{current === 0 ? text.empty : formatProgressValue(current, unit)}</span>
            </p>
            {change !== null && (
              <p className={`progress-change ${changeClass(change)}`}>
                <span>{formatChange(change)}</span>
                <span className="progress-change-text">{period === 'week' ? 'que la semana pasada' : 'que el mes pasado'}</span>
              </p>
            )}
          </div>
          <ol className="progress-bars" role="list" aria-label="Evolución">
            {periods.map((p, i) => {
              const isCurrent = i === periods.length - 1;
              const value = p.value === 0 ? 'sin entrenos' : formatProgressValue(p.value, unit);
              return (
                <li key={p.start.getTime()} className={`progress-bar-item${isCurrent ? ' current' : ''}`}>
                  <span className="sr-only">{`${periodAriaLabel(p.start, period)}: ${value}`}</span>
                  <span className="progress-bar-value" aria-hidden="true">{p.value === 0 ? '' : compact(p.value)}</span>
                  <span className="progress-bar-track" aria-hidden="true">
                    <span className="progress-bar-fill" style={{ height: `${peak > 0 ? (p.value / peak) * 100 : 0}%` }} />
                  </span>
                  <span className="progress-bar-label" aria-hidden="true">
                    {periodLabel(p.start, periods[i - 1]?.start ?? null, period)}
                  </span>
                </li>
              );
            })}
          </ol>
          {recent.length > 0 && (
            <section className="recent">
              <h3 className="kicker">Últimas sesiones</h3>
              {recent.map(entry => (
                <div key={entry.date} className="recent-row">
                  <span className="recent-date">{formatShortDate(new Date(entry.date))}</span>
                  <span className="recent-sets"><SetsText sets={entry.sets} /></span>
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
};
