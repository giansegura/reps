import { useRef } from 'react';
import { ProgressChart } from './ProgressChart.jsx';
import { useModal } from './useModal.js';

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
}) => {
  const dialogRef = useRef(null);

  useModal(dialogRef, onClose, opener);

  return (
    <div className="modal-backdrop progress-sheet-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal progress-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="progress-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <span id="progress-sheet-title" className="modal-title">{exercise.name}</span>
          <button className="modal-btn" autoFocus onClick={onClose}>Cerrar</button>
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
      </div>
    </div>
  );
};
