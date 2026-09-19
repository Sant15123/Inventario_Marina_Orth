import { Link } from 'react-router-dom'

const navLinks = [
  { label: 'Inicio', to: '/' },
  { label: 'Funciones', to: '/#features' },
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Inventario', to: '/inventory' },
  { label: 'Cotizaciones', to: '/quotes' },
]

export default function Home() {
  return (
    <>
      <header>
        <nav>
          <Link to="/" className="logo">
            <span className="dot" />
            Marina Orth
          </Link>
          <div className="nav-links">
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to}>
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      <section id="hero" className="hero">
        <div>
          <div className="icon-stack">
            <svg className="stack-base" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 4h16v2H4z" />
              <path d="M6 8h12l1 13H5zM9 10v5h6v-5z" />
            </svg>
            <svg className="stack-top" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2l4 4h-3v8h-2V6H8z" />
            </svg>
          </div>
          <h1>Gestión de Inventario y Cotizaciones</h1>
          <p className="subtitle">
            Administra tu materia prima, controla entradas y salidas en tiempo
            real, y genera cotizaciones de compra con cálculo automático de
            totales.
          </p>
          <div className="hero-actions">
            <Link to="/dashboard" className="btn btn-primary">
              Ver Dashboard
            </Link>
            <Link to="/quotes" className="btn btn-orange">
              Calcular Cotización
            </Link>
          </div>
        </div>
      </section>

      <section id="features" className="section-title">
        <h2>Funciones</h2>
        <p className="subtitle">
          Todo lo que necesitas para operar tu negocio de forma ágil y precisa.
        </p>
      </section>
      <section className="features">
        <FeatureCard
          title="Inventario de Materia Prima"
          description="CRUD completo: crea, lee, actualiza y elimina materiales. Lleva el stock, proveedores y precios en un solo lugar."
          to="/inventory"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 4h16v2H4zM6 8h12l1 13H5zM9 10v5h6v-5z" />
          </svg>
        </FeatureCard>
        <FeatureCard
          title="Cálculo de Cotizaciones"
          description="Genera cotizaciones de compra con cálculo automático de subtotales, impuestos y totales según tu inventario."
          to="/quotes"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2l4 4h-3v8h-2V6H8z" />
            <path d="M5 12h2v8H5zm15 0h2v8h-2zM5 6h2v2H5zm15 0h2v2h-2z" />
          </svg>
        </FeatureCard>
        <FeatureCard
          title="Reportes y Dashboard"
          description="Visualiza el movimiento de stock y el histórico de cotizaciones con indicadores claros y filtros por fecha."
          to="/dashboard"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 18h2V8H4v10zm4 0h2V4H8v14zm4 0h2V10h-2v8zm4 0h2V14h-2v4z" />
          </svg>
        </FeatureCard>
      </section>

      <section className="stats">
        <div>
          <div className="stat-number">+500</div>
          <div className="stat-label">Materiales gestionados</div>
        </div>
        <div>
          <div className="stat-number">+200</div>
          <div className="stat-label">Cotizaciones creadas</div>
        </div>
        <div>
          <div className="stat-number">99%</div>
          <div className="stat-label">Tiempo de respuesta</div>
        </div>
      </section>

      <section className="cta">
        <h2>¿Listo para optimizar tu inventario?</h2>
        <p className="subtitle">
          Comienza hoy mismo y lleva tu negocio al siguiente nivel.
        </p>
        <div className="hero-actions">
          <Link to="/dashboard" className="btn btn-primary">
            Ver Dashboard
          </Link>
          <Link to="/quotes" className="btn btn-outline">
            Nueva Cotización
          </Link>
        </div>
      </section>

      <footer className="footer">
        <p>
          © {new Date().getFullYear()} Marina Orth. Todos los derechos
          reservados.
        </p>
      </footer>
    </>
  )
}

function FeatureCard({ title, description, to, children }) {
  return (
    <div className="card">
      <div className="card-icon">{children}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      <Link to={to} className="btn btn-outline feature-card-btn">
        Acceder
      </Link>
    </div>
  )
}
