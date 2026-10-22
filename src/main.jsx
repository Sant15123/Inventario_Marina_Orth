import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/index.css'
import App from './App.jsx'
import { ToastProvider } from './context/ToastContext'
import { AuthProvider } from './context/AuthContext'
// Interceptor global para inyectar automáticamente Authorization: Bearer <token> en peticiones /api
if (typeof window !== 'undefined' && window.fetch) {
  const originalFetch = window.fetch;
  window.fetch = async function (resource, config = {}) {
    try {
      const token = localStorage.getItem('siga_token');
      const urlStr = typeof resource === 'string' ? resource : resource?.url || '';
      if (token && (urlStr.includes('/api') || urlStr.includes(':3000'))) {
        const headers = new Headers(config.headers || {});
        if (!headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        config = { ...config, headers };
      }
    } catch {
      // Ignorar si hay restricciones de entorno
    }
    return originalFetch.call(this, resource, config);
  };
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
