import { ProgressChart } from './ProgressChart.jsx';
import { Sheet } from './Sheet.jsx';

export const ProgressSheet = ({
  exercise,
  color,
  sessions,
  planId,
  period,
  metric,
  onPeriodChange,
  onMetricChange,
  opener,
  onClose,
}) => (
  <Sheet labelledBy="progress-sheet-title" opener={opener} onClose={onClose}>
    <div className="sheet-head">
      <h2 id="progress-sheet-title" className="sheet-title">{exercise.name}</h2>
      <button className="pill-btn" autoFocus onClick={onClose}>Cerrar</button>
    </div>
    <ProgressChart
      sessions={sessions}
      planId={planId}
      exercise={exercise}
      color={color}
      period={period}
      metric={metric}
      onPeriodChange={onPeriodChange}
      onMetricChange={onMetricChange}
    />
  </Sheet>
);
