# Frontend - Sistema de Control Eclesiástico

Sistema de gestión para iglesias construido con React, Vite y Tailwind CSS.

## 🚀 Stack Tecnológico

- **Framework**: React 18
- **Build Tool**: Vite 5
- **Estilos**: Tailwind CSS
- **Componentes UI**: Custom (inspirados en shadcn/ui)
- **Iconos**: Lucide React
- **Routing**: React Router DOM v6
- **HTTP Client**: Axios
- **Gestión de Estado**: React Context API

## 📁 Estructura del Proyecto

```
src/
├── components/          # Componentes reutilizables
│   ├── ui/             # Componentes de UI base (Button, Input, Card, Table)
│   └── ProtectedRoute.jsx
├── contexts/           # Context API providers
│   └── AuthContext.jsx
├── hooks/              # Custom React hooks
├── layouts/            # Layout components
│   └── DashboardLayout.jsx
├── lib/                # Utilidades y helpers
│   └── utils.js
├── pages/              # Páginas de la aplicación
│   ├── LoginPage.jsx
│   ├── DashboardPage.jsx
│   ├── MembersPage.jsx
│   ├── GroupsPage.jsx
│   ├── FinancesPage.jsx
│   └── SettingsPage.jsx
├── services/           # Servicios de API
│   └── api.js
├── App.jsx             # Componente raíz con rutas
├── main.jsx            # Entry point
└── index.css           # Estilos globales
```

## 🎨 Características de Diseño

- **Mobile-First**: Diseño completamente responsivo
- **Clean & Minimal**: Estética SaaS moderna
- **Accesible**: Componentes accesibles y semánticos
- **Modo Claro**: Paleta de colores profesional

## 🔐 Autenticación

- JWT almacenado en localStorage
- Context API para gestión de estado de autenticación
- Rutas protegidas con ProtectedRoute component
- Interceptores de Axios para incluir token automáticamente

## 🛠️ Instalación y Desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build

# Vista previa de producción
npm run preview
```

## 🌐 Conexión con Backend

El frontend se conecta automáticamente con el backend en `http://localhost:3000/api` mediante proxy de Vite.

## 📱 Responsive Design

- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

El sidebar se colapsa en un menú hamburguesa en dispositivos móviles.

## 🎯 Próximas Funcionalidades

- [ ] Implementar módulo de Miembros completo
- [ ] Tabla con paginación y búsqueda
- [ ] Formularios de creación/edición
- [ ] Módulo de Grupos
- [ ] Módulo de Finanzas con gráficas
- [ ] Dashboard con estadísticas en tiempo real
- [ ] Sistema de notificaciones
- [ ] Exportación de reportes (PDF)

## 📝 Notas Importantes

- El token JWT se guarda en localStorage
- Las credenciales de prueba dependen del backend
- El proxy de Vite redirige `/api/*` a `http://localhost:3000/api/*`
