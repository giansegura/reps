import { Component } from 'react';
import { downloadRawData } from '../lib/rescue.js';

export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error(error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="app">
        <div className="crash">
          <h1 className="title">Algo ha fallado</h1>
          <p className="data-text">
            Tus datos siguen en este dispositivo. Descárgalos antes de nada por si hay que recuperarlos.
          </p>
          <div className="data-actions">
            <button className="ghost-btn" onClick={downloadRawData}>Descargar datos</button>
            <button className="ghost-btn" onClick={() => location.reload()}>Recargar</button>
          </div>
        </div>
      </div>
    );
  }
}
