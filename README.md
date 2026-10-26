# SIGA-FMO Client (Single Page Application)

> **Sistema de Información y Gestión de Activos (SIGA)**  
> **Fundación Marina Orth (FMO)** — Plataforma web responsive para el control y radicación de solicitudes pedagógicas, gestión de inventario tecnológico y mobiliario en sedes formativas y laboratorios STEAM.

---

## 🌟 1. Visión General del Sistema

**SIGA-FMO Client** es una aplicación de página única (*Single Page Application*) moderna, rápida y altamente intuitiva diseñada para apoyar la operación pedagógica y logística de la **Fundación Marina Orth**.

El sistema centraliza:
- **Gestión Integral de Activos**: Registro y trazabilidad de ciclo de vida de equipos de cómputo, tablets, proyectores, kits de robótica e insumos didácticos.
- **Control Especializado de Mobiliario y Enseres**: Registro modular e independiente de mesas, sillas, archivadores y dotación física por sede, desvinculado de la ficha técnica de hardware.
- **Radicación y Aprobación de Solicitudes Pedagógicas**: Flujo integral para docentes y custodios con asignación de placas físicas y trazabilidad vinculada a Proyectos STEAM.
- **Sincronización Reactiva en Tiempo Real**: Notificaciones instantáneas para administradores y supervisores ante nuevas solicitudes o cambios de estado sin necesidad de refrescar la página.
- **Identidad Visual Corporativa**: Paleta institucional basada en Verde Lima FMO (`#84CC16`) y superficies oscuras de alto contraste (`#0F172A` / `#1E293B`), con soporte armónico para Modo Oscuro y Modo Claro.

---

## 🛠️ 2. Stack Tecnológico y Librerías

| Categoría | Tecnologías / Librerías | Propósito |
| :--- | :--- | :--- |
| **Framework & Core** | **React 18 / 19**, **Vite** | Arquitectura reactiva declarativa basada en componentes y empaquetador ultrarrápido con Rolldown/ESBuild. |
| **Enrutamiento** | **React Router DOM v7** | Navegación SPA por roles (Administrador, Supervisor, Usuario/Docente) y rutas públicas para lectura QR. |
| **Estilos & Diseño** | **Tailwind CSS**, Vanilla CSS Custom Properties | Sistema de diseño coherente, utilidades responsivas y variables CSS institucionales (`--surface`, `--bg`, `--line`). |
| **Iconografía** | **Lucide React** | Conjunto uniforme de iconos vectoriales optimizados para interfaces modernas. |
| **Conexión & Estado** | **Fetch API / Axios**, **@supabase/supabase-js** | Consumo de la API REST del backend en Render y cliente WebSocket para eventos en tiempo real. |
| **Notificaciones & Feedback** | **ToastContext** personalizado, SweetAlert2 / Toast | Sistema de alertas no bloqueantes con animaciones fluidas, chips identificadores y diálogos de confirmación de baja. |
| **Reportes & Exportación** | **ExcelJS**, **File-Saver** | Generación descargable del Libro Maestro de inventario con formato y estilos corporativos. |
| **Identificación & QR** | **QRCode.react** | Renderizado e impresión de códigos QR para placas físicas institucionales. |
| **Hosting & CI/CD** | **Vercel** | Despliegue continuo automatizado enlazado a la rama `main` con certificados SSL y CDN global. |

---

## ⚡ 3. Módulos y Flujos Implementados Recientemente

### 🔔 Campanita Reactiva en Tiempo Real (`NotificationBell`)
- **Suscripción WebSocket Supabase Realtime**: Escucha eventos directos sobre la tabla PostgreSQL `public:solicitudes_inventario` a través del canal `solicitudes_bell_realtime`.
- **Incremento y Decremento Automático**:
  - Ante un evento `INSERT` con estado `PENDIENTE`: incrementa inmediatamente el contador del badge numérico en la barra de navegación sin requerir recarga.
  - Ante un evento `UPDATE` (cuando la solicitud pasa a `APROBADA` o `RECHAZADA`): decrementa el badge reactivamente en vivo.
- **Filtrado por Roles**: El componente oculta automáticamente la campanita si el usuario autenticado tiene rol de `usuario` o `supervisor`, mostrándose exclusivamente para el personal directivo y administradores de inventario.

### 📋 Bandeja de Aprobación y Gestión de Solicitudes (`ModalGestionSolicitud`)
- **Validación Segura de Fechas**: Normalizador de fechas para evitar errores de renderizado (`Invalid Date`) en entornos de visualización locales e internacionales.
- **Asignación de Placas Físicas**: Permite seleccionar y vincular placas reales del catálogo (`ACT-FMO-XXX`) o seriales de consumibles al despachar el material.
- **Vinculación a Proyectos STEAM**: Asociación opcional con proyectos pedagógicos registrados en la fundación (ej. *Robótica Educativa Medellín*, *Semilleros STEAM*).
- **Acciones Directas**: Botones integrados **"Aprobar y Despachar"** (despacha a `POST /api/prestamos` y actualiza estado) y **"Rechazar Solicitud"** (con captura de motivo y notificación toast).

### 🪑 Gestión Especializada de Mobiliario (`ModalRegistroMobiliario`)
- **Desacople Completo de Ficha Técnica de Cómputo**: Formulario wizard adaptativo de 3 pasos enfocado en enseres físicos (sin procesador, RAM ni seriales informáticos).
  1. *Paso 1: Identificación y Ubicación*: Nombre del enser, código/placa, categoría (Mesas, Sillas, Lockers, Estanterías, Tableros), sede y cantidad.
  2. *Paso 2: Atributos Físicos*: Material principal (Madera/MDF, Metal/Acero, Polipropileno, Malla), color, dimensiones (`Largo x Ancho x Alto cm`) y estado de conservación.
  3. *Paso 3: Adquisición y Observaciones*: Fecha de adquisición, origen/proveedor y notas adicionales (ruedas con freno, cerraduras, etc.).
- **Consecutivo Institucional Propio**: Autocompletado del consecutivo `MOB-XXXX` consultando `GET /api/mobiliario/siguiente-placa`.
- **Tarjeta "Resumen Previo a Guardar" con Alto Contraste**: Contenedor claro (`bg-slate-50 border-slate-200`) estructurado en cuadrícula (`grid grid-cols-2 sm:grid-cols-4`) con badge esmeralda para la placa y píldora de estado, garantizando legibilidad total.
- **Acceso Rápido**: Botón dedicado `🪑 + Nuevo Mobiliario` en la barra superior junto al botón de equipos y en la pestaña de Mobiliario.

### 👥 Módulo de Usuarios y Modales Optimizados (`ModalEditarUsuario`, `ModalNuevoUsuario`)
- **Control de Scroll y Viewport**: Estructura `max-h-[90vh]` con cuerpo scrolleable (`overflow-y-auto`) y footer fijo que garantiza la visibilidad permanente de los botones de acción (*"Guardar Cambios"* y *"Cancelar"*).
- **Armonización de Paletas en Modo Oscuro**: Eliminación de bloques desentonantes y textos de bajo contraste en formularios de solicitudes y gestión de usuarios.

---

## 🔐 4. Variables de Entorno (`.env` y Vercel)

El proyecto utiliza **Vite**, por lo que **todas las variables de entorno expuestas al cliente deben iniciar obligatoriamente con el prefijo `VITE_`**.

### Archivo `.env` Local

Crea o edita tu archivo `.env` en la raíz del proyecto:

```env
# URL de la API Backend (Express en Render o localhost)
VITE_API_URL=https://inventario-marina-back.onrender.com/api

# Configuración de Supabase Realtime & DB
VITE_SUPABASE_URL=https://maaggiefwtdtwhzmazau.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### ⚠️ Configuración Crítica en Vercel
1. Ingresa a tu panel en **Vercel > Project Settings > Environment Variables**.
2. Añade las tres variables anteriores para los entornos de **Production**, **Preview** y **Development**.
3. **Importante**: La variable `VITE_SUPABASE_ANON_KEY` debe ser registrada como variable segura (*Config / Mark as Safe*).
4. Debido a cómo Vite empaqueta las variables de entorno en tiempo de compilación (*build time*), **cualquier cambio o adición de variables de entorno en Vercel requiere disparar un nuevo despliegue (Redeploy)** para que surtan efecto en el cliente web.

---

## 📂 5. Estructura de Carpetas del Proyecto

```text
src/
├── assets/                  # Recursos gráficos, logotipos de la Fundación Marina Orth e iconos
├── components/              # Componentes de interfaz modulares y reutilizables
│   ├── auth/                # Formularios y guards de autenticación
│   ├── common/              # Botones estándar, inputs, spinners y badges institucionales
│   ├── layout/              # Estructura visual de la aplicación
│   │   ├── Header.jsx       # Barra superior con selector de perfil y estado de conexión
│   │   ├── NotificationBell.jsx # Campanita reactiva con suscripción Realtime a Supabase
│   │   └── Sidebar.jsx      # Menú lateral responsive con navegación por roles
│   └── modals/              # Ventanas modulares de captura y edición
│       ├── ModalGestionSolicitud.jsx    # Aprobación y rechazo de requerimientos
│       ├── ModalSolicitudMaterial.jsx   # Radicación de préstamos y consumibles
│       ├── ModalRegistroMobiliario.jsx  # Asistente de 3 pasos exclusivo para muebles/enseres
│       ├── ModalDetalleActivo.jsx       # Ficha técnica institucional de equipos
│       ├── ModalEditarActivo.jsx        # Edición integral de activos
│       ├── ModalEditarUsuario.jsx       # Gestión de credenciales y roles con scroll optimizado
│       ├── ModalNuevoUsuario.jsx        # Creación administrativa de usuarios
│       ├── ModalConfirmarRetorno.jsx    # Recepción y retorno a bodega
│       └── ModalQR.jsx                  # Generador e impresión de stickers con código QR
├── context/                 # Proveedores de estado global (Context API)
│   ├── AuthContext.jsx      # Sesión de usuario, almacenamiento de token JWT y permisos
│   └── ToastContext.jsx     # Sistema institucional de alertas, confirmaciones y modales de baja
├── data/                    # Catálogos estáticos y semillas (catalogoPapeleriaFMO.json)
├── hooks/                   # Custom Hooks para encapsular lógica reactiva
├── pages/                   # Enrutamiento y vistas públicas (escaneo QR público)
├── services/                # Conexiones con servicios externos
│   ├── inventoryApi.js      # Cliente HTTP unificado para equipos, insumos y mobiliario
│   ├── supabase.js          # Inicialización del cliente Supabase Realtime
│   ├── excelExportService.js# Generador de reportes en formato Excel institucional
│   └── mockData.js          # Listado inicial de sedes formativas y proyectos STEAM
├── styles/                  # Hojas de estilo y configuraciones de diseño
│   └── index.css            # Tokens CSS, variables de modo oscuro/claro y utilidades Tailwind
└── views/                   # Pantallas y vistas principales de la aplicación
    ├── ResumenView.jsx          # Panel de control (Dashboard) con métricas y alertas
    ├── InventarioView.jsx       # Catálogo maestro (Equipos, Robótica, Papelería y Mobiliario)
    ├── PrestamosView.jsx        # Préstamos retornables, salidas por canasta y actas
    ├── MiPanelUsuarioView.jsx   # Vista simplificada para docentes y custodios de sede
    ├── UsuariosView.jsx         # Administración y auditoría de cuentas de usuario
    ├── HistorialView.jsx        # Trazabilidad completa de auditoría de movimientos
    └── LoginView.jsx            # Autenticación segura de usuarios
```

---

## 🚀 6. Instalación y Ejecución Local

### Prerrequisitos
- **Node.js**: Versión `18.0.0` o superior (se recomienda Node 20 LTS).
- **npm**: Versión `9.x` o superior.

### Pasos de Instalación

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/Sant15123/Inventario_Marina_Orth.git
   cd Inventario_Marina_Orth
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Configurar el entorno**:
   ```bash
   cp .env.example .env
   # Asegúrate de verificar las variables VITE_API_URL y VITE_SUPABASE_*
   ```

4. **Iniciar el servidor de desarrollo**:
   ```bash
   npm run dev
   ```
   Para acceder desde dispositivos móviles, tabletas o lectores QR en la misma red Wi-Fi:
   ```bash
   npm run dev -- --host
   ```
   > La aplicación se ejecutará por defecto en `http://localhost:5173`.

5. **Construir para producción**:
   ```bash
   npm run build
   ```

6. **Previsualizar compilación local**:
   ```bash
   npm run preview
   ```

---

## 🤝 7. Convenciones y Despliegue en Producción

- **Estrategia de Ramas**: La rama `main` está enlazada directamente con Vercel. Cada `push` a `main` desencadena automáticamente una nueva compilación y despliegue a producción.
- **Estándar de Commits**: Se utiliza la convención de *Conventional Commits* (`feat:`, `fix:`, `style:`, `docs:`, `refactor:`).
- **Alineación con el Backend**: Las rutas del frontend consumen los endpoints estándar documentados en el backend (`/api/activos`, `/api/solicitudes`, `/api/mobiliario`, `/api/prestamos`, `/api/usuarios`).

---

## 📄 8. Créditos y Licencia

Desarrollado con dedicación para la **Fundación Marina Orth**, fortaleciendo la educación con tecnología, robótica e innovación STEAM en Colombia.  
*Todos los derechos reservados.*
