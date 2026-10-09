export function Toast({ msg, visible }) {
  return (
    <div className={`toast ${visible ? 'show' : ''}`} role="status" aria-live="polite">
      {msg}
    </div>
  );
}
