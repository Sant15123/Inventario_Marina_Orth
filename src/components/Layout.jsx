import { Link, NavLink, Outlet } from 'react-router-dom'

function Icon({ children }) {
  return (
    <svg
      className="nav-icon"
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

const navItems = [
  {
    label: 'Dashboard',
    to: '/dashboard',
    icon: <Icon><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" /></Icon>,
  },
  {
    label: 'Inventario',
    to: '/inventory',
    icon: <Icon><path d="M4 4h16v2H4zM6 8h12l1 13H5zM9 10v5h6v-5z" /></Icon>,
  },
  {
    label: 'Cotizaciones',
    to: '/quotes',
    icon: <Icon><path d="M12 2l4 4h-3v8h-2V6H8z" />
      <path d="M5 12h2v8H5zm15 0h2v8h-2zM5 6h2v2H5zm15 0h2v2h-2z" /></Icon>,
  },
  {
    label: 'Categorías',
    to: '/categories',
    icon: <Icon><path d="M3 22h18l-8-16-8 16z" />
      <path d="M9 6h6" /></Icon>,
  },
]

export default function Layout({ onToggleTheme, dark }) {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <Link to="/" className="logo">
            Marina Orth
          </Link>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `sidebar-link${isActive ? ' active' : ''}`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <Link to="/" className="btn btn-outline back-home-btn">
            ← Volver al inicio
          </Link>
          <button
            type="button"
            className="theme-toggle"
            onClick={onToggleTheme}
            aria-label="Cambiar tema"
          >
            {dark ? '☀️ Claro' : '🌙 Oscuro'}
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
