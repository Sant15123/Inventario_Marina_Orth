import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, Search, Plus, Check, ChevronDown, X } from 'lucide-react';

export default function SearchableUserSelect({
  usuarios = [],
  value = '',
  onSelectUser,
  onOpenNewUserModal,
  label = 'Custodio / Responsable *',
  placeholder = 'Buscar por nombre, cédula o rol...',
  required = true,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter users
  const filteredUsers = useMemo(() => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return usuarios;
    return usuarios.filter((u) => {
      const nombre = (u.nombre || u.nombre_completo || '').toLowerCase();
      const doc = String(u.documento || u.cedula || '').toLowerCase();
      const rol = (u.rol || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const cargo = (u.cargo || '').toLowerCase();
      return nombre.includes(term) || doc.includes(term) || rol.includes(term) || email.includes(term) || cargo.includes(term);
    });
  }, [usuarios, searchQuery]);

  // Find currently selected user object if any
  const selectedUser = useMemo(() => {
    if (!value) return null;
    return (
      usuarios.find(
        (u) =>
          (u.nombre && u.nombre.toLowerCase() === value.toLowerCase()) ||
          (u.nombre_completo && u.nombre_completo.toLowerCase() === value.toLowerCase()) ||
          (u.id && String(u.id) === String(value))
      ) || null
    );
  }, [usuarios, value]);

  const handleSelect = (user) => {
    if (onSelectUser) {
      onSelectUser(user);
    }
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onSelectUser) {
      onSelectUser({
        nombre: '',
        documento: '',
        email: '',
        sede: 'Medellín',
      });
    }
    setSearchQuery('');
  };

  return (
    <div className="searchable-user-select-container" ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Label and + Nuevo Button Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '6px',
        }}
      >
        <label
          style={{
            margin: 0,
            fontSize: '12.5px',
            fontWeight: 600,
            color: 'var(--text-dim, #475569)',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <User size={13} style={{ color: 'var(--copper, #84CC16)' }} />
          <span>{label}</span>
        </label>

        {onOpenNewUserModal && (
          <button
            type="button"
            onClick={onOpenNewUserModal}
            title="Registrar nuevo custodio o formador en el sistema"
            style={{
              background: 'var(--green-bg, rgba(132, 204, 22, 0.12))',
              border: '1px solid var(--green-border, rgba(132, 204, 22, 0.45))',
              color: 'var(--green, #4d7c0f)',
              borderRadius: '6px',
              padding: '3px 9px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease',
            }}
          >
            <Plus size={12} />
            <span>+ Nuevo Custodio</span>
          </button>
        )}
      </div>

      {/* Trigger / Display Box */}
      <div
        className="searchable-user-trigger"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          minHeight: '38px',
          padding: '8px 12px',
          background: 'var(--bg, #ffffff)',
          border: isOpen
            ? '1px solid var(--copper, #84CC16)'
            : '1px solid var(--line-strong, var(--line, #cbd5e1))',
          borderRadius: 'var(--radius, 8px)',
          cursor: 'pointer',
          boxShadow: isOpen ? '0 0 0 2px var(--copper-glow, rgba(132, 204, 22, 0.2))' : 'none',
          transition: 'all 0.15s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
          {selectedUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text, #0f172a)' }}>
                {selectedUser.nombre || selectedUser.nombre_completo}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono, monospace)',
                  color: 'var(--text-dim, #64748b)',
                  background: 'var(--surface-2, #f1f5f9)',
                  border: '1px solid var(--line, #e2e8f0)',
                  padding: '1px 5px',
                  borderRadius: '4px',
                }}
              >
                C.C. {selectedUser.documento || selectedUser.cedula || '—'}
              </span>
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--green, #4d7c0f)',
                  background: 'var(--green-bg, #ecfccb)',
                  border: '1px solid var(--green-border, #bef264)',
                  padding: '1px 6px',
                  borderRadius: '4px',
                }}
              >
                {selectedUser.rol || 'usuario'}
              </span>
            </div>
          ) : value ? (
            <span style={{ fontSize: '13px', color: 'var(--text, #0f172a)', fontWeight: 600 }}>{value}</span>
          ) : (
            <span style={{ fontSize: '13px', color: 'var(--text-muted, #94a3b8)' }}>{placeholder}</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {value && (
            <span
              onClick={handleClear}
              title="Borrar selección"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: 'var(--surface-hover, #e2e8f0)',
                color: 'var(--text-dim, #64748b)',
                cursor: 'pointer',
              }}
            >
              <X size={11} />
            </span>
          )}
          <ChevronDown
            size={16}
            style={{
              color: 'var(--text-dim, #64748b)',
              transform: isOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s ease',
            }}
          />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="searchable-user-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            backgroundColor: 'var(--surface, #ffffff)',
            border: '1px solid var(--line-strong, var(--line, #cbd5e1))',
            borderRadius: '10px',
            boxShadow: 'var(--shadow-lg, 0 15px 35px -5px rgba(0, 0, 0, 0.15))',
            zIndex: 10000,
            overflow: 'hidden',
            maxHeight: '280px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Search Input Header */}
          <div
            className="search-box-header"
            style={{
              padding: '8px 10px',
              borderBottom: '1px solid var(--line, #e2e8f0)',
              background: 'var(--surface-2, #f8fafc)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Search size={14} style={{ color: 'var(--copper, #84CC16)', flexShrink: 0 }} />
            <input
              autoFocus
              type="text"
              placeholder="Escribe nombre o cédula para filtrar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: 'var(--text, #0f172a)',
                fontSize: '12.5px',
                outline: 'none',
              }}
            />
          </div>

          {/* Users List */}
          <div
            style={{
              overflowY: 'auto',
              maxHeight: '220px',
              padding: '4px',
            }}
          >
            {filteredUsers.length === 0 ? (
              <div
                style={{
                  padding: '16px 12px',
                  textAlign: 'center',
                  color: 'var(--text-muted, #94a3b8)',
                  fontSize: '12.5px',
                }}
              >
                No se encontraron usuarios coincidentes.
                {onOpenNewUserModal && (
                  <div style={{ marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onOpenNewUserModal();
                      }}
                      style={{
                        background: 'var(--copper, #84CC16)',
                        color: 'var(--copper-ink, #0f172a)',
                        border: 'none',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      + Registrar "{searchQuery}"
                    </button>
                  </div>
                )}
              </div>
            ) : (
              filteredUsers.map((u) => {
                const userName = u.nombre || u.nombre_completo || 'Usuario';
                const userDoc = u.documento || u.cedula || 'Sin cédula';
                const userRole = u.rol || 'usuario';
                const userSede = u.sede || 'Medellín';
                const isSelected = selectedUser && (selectedUser.id === u.id || selectedUser.nombre === userName);

                return (
                  <div
                    key={u.id || u.documento || userName}
                    className="user-item-row"
                    onClick={() => handleSelect(u)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: isSelected ? 'var(--green-bg, rgba(171, 222, 22, 0.16))' : 'transparent',
                      transition: 'background 0.15s ease',
                      borderLeft: isSelected ? '3px solid var(--copper, #84CC16)' : '3px solid transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--surface-hover, #f1f5f9)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text, #0f172a)' }}>
                          {userName}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontFamily: 'var(--font-mono, monospace)',
                            color: 'var(--text-dim, #64748b)',
                          }}
                        >
                          ({userDoc})
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            color: 'var(--green, #4d7c0f)',
                            background: 'var(--green-bg, #ecfccb)',
                            border: '1px solid var(--green-border, #bef264)',
                            padding: '1px 5px',
                            borderRadius: '3px',
                          }}
                        >
                          {userRole}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', display: 'flex', gap: '8px' }}>
                        <span>📍 {userSede}</span>
                        {u.email && <span>✉️ {u.email}</span>}
                      </div>
                    </div>

                    {isSelected && <Check size={14} style={{ color: 'var(--copper, #84CC16)', flexShrink: 0 }} />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Hidden input to support required form validation natively */}
      <input
        type="text"
        required={required}
        value={value}
        onChange={() => {}}
        style={{
          opacity: 0,
          height: 0,
          position: 'absolute',
          pointerEvents: 'none',
          bottom: 0,
          left: '50%',
        }}
      />
    </div>
  );
}
