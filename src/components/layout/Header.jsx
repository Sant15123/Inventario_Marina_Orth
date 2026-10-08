

/**
 * Header Component
 * Incluye barra de búsqueda rápida, selector de tema (oscuro/claro) y descarga en Excel.
 */
export default function Header({
  searchTerm,
  onSearchChange,
  onExportExcel,
  theme = 'dark',
  onToggleTheme,
}) {
  const isDark = theme === 'dark';

  return (
    <header className="header-bar">
      <div className="header-search">
        <span className="header-search-icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </span>
        <input
          type="search"
          placeholder="Buscar equipo, consumible, código o responsable..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Buscar en el inventario"
        />
      </div>

      <div className="header-actions">
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            className="theme-toggle-btn"
            title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            aria-label={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
          >
            <span className="theme-toggle-icon" aria-hidden="true">
              {isDark ? (
                /* Ícono de Sol para cambiar a claro */
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ABDE16" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              ) : (
                /* Ícono de Luna para cambiar a oscuro */
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4d7c0f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              )}
            </span>
            <span>{isDark ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onExportExcel}
          className="btn secondary small"
          title="Descargar reporte consolidado en formato Excel"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Descargar reporte Excel
        </button>
      </div>
    </header>
  );
}


