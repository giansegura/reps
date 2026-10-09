import { useState } from 'react';
import { dismissInstallHint, isInstallHintDismissed } from '../lib/storage.js';

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

export const InstallHint = () => {
  const [visible, setVisible] = useState(() => !isStandalone() && !isInstallHintDismissed());

  if (!visible) return null;

  const dismiss = () => {
    dismissInstallHint();
    setVisible(false);
  };

  return (
    <aside className="install-hint">
      <p className="install-hint-text">Instálala para usarla sin conexión y que tus datos no se borren.</p>
      <p className="install-hint-how">iPhone: Compartir → Añadir a pantalla de inicio · Android: menú ⋮ → Instalar app</p>
      <button className="install-hint-btn" onClick={dismiss}>Entendido</button>
    </aside>
  );
};
