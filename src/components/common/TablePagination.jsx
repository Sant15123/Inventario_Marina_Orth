import React from 'react';

/**
 * Reusable table pagination bar aligned with SIGA-FMO styling.
 */
export default function TablePagination({
  totalItems = 0,
  currentPage = 1,
  perPage = 5,
  onPageChange,
  onPerPageChange,
  itemLabel = 'registros',
  perPageOptions = [5, 10, 25, 50, 100],
  includeAll = true,
  className = '',
  style = {},
}) {
  const safePerPage = Math.max(1, Number(perPage) || 5);
  const totalPages = Math.max(1, Math.ceil(totalItems / safePerPage));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIdx = totalItems === 0 ? 0 : (safePage - 1) * safePerPage + 1;
  const endIdx = Math.min(safePage * safePerPage, totalItems);

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 16px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-surface)',
        fontSize: '12px',
        color: 'var(--text-dim)',
        flexWrap: 'wrap',
        gap: '8px',
        ...style,
      }}
    >
      <div>
        Mostrando <strong style={{ color: 'var(--text-h)' }}>{startIdx}</strong> -{' '}
        <strong style={{ color: 'var(--text-h)' }}>{endIdx}</strong> de{' '}
        <strong style={{ color: 'var(--text-h)' }}>{totalItems}</strong> {itemLabel}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-dim)' }}>
          <span>Filas:</span>
          <select
            value={perPage}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (onPerPageChange) onPerPageChange(val);
              if (onPageChange) onPageChange(1);
            }}
            style={{
              padding: '2px 8px',
              fontSize: '12px',
              borderRadius: '6px',
              border: '1px solid var(--line)',
              background: 'var(--bg-input, #fff)',
              color: 'var(--text)',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {perPageOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
            {includeAll && <option value={99999}>Todos</option>}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn small ghost"
            disabled={safePage <= 1}
            onClick={() => onPageChange && onPageChange(Math.max(1, safePage - 1))}
            style={{ padding: '3px 10px', fontSize: '12px', cursor: safePage <= 1 ? 'not-allowed' : 'pointer' }}
          >
            ← Anterior
          </button>

          <span style={{ fontWeight: 600, color: 'var(--text)', padding: '0 4px', fontSize: '12px' }}>
            Página {safePage} de {totalPages}
          </span>

          <button
            type="button"
            className="btn small ghost"
            disabled={safePage >= totalPages}
            onClick={() => onPageChange && onPageChange(Math.min(totalPages, safePage + 1))}
            style={{
              padding: '3px 10px',
              fontSize: '12px',
              cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
            }}
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  );
}
