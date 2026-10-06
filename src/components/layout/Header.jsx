

/**
 * Header Component
 * Incluye barra de búsqueda rápida y botón para descargar el reporte en Excel.
 */
export default function Header({ searchTerm, onSearchChange, onExportExcel }) {
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


