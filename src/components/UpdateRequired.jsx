import { downloadRawData } from '../lib/rescue.js';

export function UpdateRequired() {
  return (
    <div className="app">
      <div className="crash">
        <h1 className="title">Actualiza Reps</h1>
        <p className="data-text">Tus datos son de una versión más nueva de Reps. Recarga para actualizar la app.</p>
        <div className="data-actions">
          <button className="ghost-btn" onClick={() => location.reload()}>Recargar</button>
          <button className="ghost-btn" onClick={downloadRawData}>Descargar datos</button>
        </div>
      </div>
    </div>
  );
}
