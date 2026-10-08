

/**
 * Sidebar Component
 * Proporciona el branding institucional "Marina Orth Foundation - Robótica"
 * y la navegación entre las 4 vistas principales (Resumen, Inventario, Préstamos y entregas, Historial).
 */
export default function Sidebar({ currentView, onViewChange }) {
  const navItems = [
    {
      id: 'resumen',
      label: 'Resumen',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
      )
    },
    {
      id: 'inventario',
      label: 'Inventario',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
      )
    },
    {
      id: 'prestamos',
      label: 'Préstamos y entregas',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <polyline points="16 11 18 13 22 9"></polyline>
        </svg>
      )
    },
    {
      id: 'historial',
      label: 'Historial',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      )
    }
  ];

  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-header">
          <div className="brand-badge">
            <img
              src="/logo-marina-orth.png"
              alt="Logo Fundación Marina Orth"
              className="brand-logo-img"
            />
            <div className="brand-text-wrap">
              <span className="brand-title">Marina Orth Foundation</span>
              <span className="brand-subtitle">Robótica & Innovación</span>
            </div>
          </div>
        </div>

        <nav aria-label="Navegación principal" style={{ marginTop: '20px' }}>
          <ul className="nav-menu">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onViewChange(item.id)}
                    className={`nav-item-btn ${isActive ? 'active' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="dot" aria-hidden="true"></span>
                    <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="sidebar-footer">
        <p>Sistema Interno de Inventario</p>
        <p style={{ marginTop: '2px', opacity: 0.7 }}>v2.0 • React + Vite</p>
      </div>
    </aside>
  );
}


