import { Icon } from './Icon.jsx';

const TABS = [
  { view: 'home', label: 'Hoy', icon: 'home' },
  { view: 'progress', label: 'Progreso', icon: 'chart' },
  { view: 'plans', label: 'Planes', icon: 'list' },
];

export function TabBar({ view, onChange }) {
  return (
    <nav className="tabbar" aria-label="Secciones">
      <div className="tabbar-inner">
        {TABS.map(tab => (
          <button
            key={tab.view}
            className={`tab${tab.view === view ? ' on' : ''}`}
            aria-current={tab.view === view ? 'page' : undefined}
            onClick={() => onChange(tab.view)}
          >
            <Icon name={tab.icon} size={24} strokeWidth={2.2} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
