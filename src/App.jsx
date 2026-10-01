import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Quotes from './pages/Quotes'
import Categories from './pages/Categories'
import Suppliers from './pages/Suppliers'
import MaterialDetail from './pages/MaterialDetail'

function App() {
  const [dark, setDark] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches,
  )
  const toggleTheme = () => setDark((v) => !v)

  // Efecto, no side-effect en render. Se marca explícitamente el tema elegido
  // para que la media query del sistema no lo sobrescriba.
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', dark)
    root.classList.toggle('light', !dark)
  }, [dark])

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        element={<Layout dark={dark} onToggleTheme={toggleTheme} />}
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/inventory/:id" element={<MaterialDetail />} />
        <Route path="/quotes" element={<Quotes />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/suppliers" element={<Suppliers />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App