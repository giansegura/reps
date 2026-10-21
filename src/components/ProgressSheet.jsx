import { useEffect, useRef } from 'react';
import { ProgressChart } from './ProgressChart.jsx';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

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

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusable = [...dialogRef.current.querySelectorAll(FOCUSABLE)].filter(el => !el.disabled);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      const outside = !dialogRef.current.contains(document.activeElement);
      if (e.shiftKey && (outside || document.activeElement === first)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (outside || document.activeElement === last)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => () => opener?.focus(), [opener]);

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
