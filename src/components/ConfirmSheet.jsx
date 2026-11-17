import { Sheet } from './Sheet.jsx';

export function ConfirmSheet({ title, text, confirmLabel, cancelLabel = 'Cancelar', danger = false, opener, onConfirm, onCancel }) {
  return (
    <Sheet
      role="alertdialog"
      labelledBy="confirm-title"
      describedBy={text ? 'confirm-text' : undefined}
      opener={opener}
      onClose={onCancel}
    >
      <h2 id="confirm-title" className="sheet-title">{title}</h2>
      {text && <p id="confirm-text" className="sheet-text">{text}</p>}
      <div className="sheet-actions stacked">
        {danger ? (
          <>
            <button className="btn primary" autoFocus onClick={onCancel}>{cancelLabel}</button>
            <button className="btn danger" onClick={onConfirm}>{confirmLabel}</button>
          </>
        ) : (
          <>
            <button className="btn primary" autoFocus onClick={onConfirm}>{confirmLabel}</button>
            <button className="btn" onClick={onCancel}>{cancelLabel}</button>
          </>
        )}
      </div>
    </Sheet>
  );
}
