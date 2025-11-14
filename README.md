# Sistema de Préstamos de Recursos Tecnológicos

Sistema completo de gestión de préstamos de recursos tecnológicos desarrollado con React, Node.js y MySQL.

## 🚀 Características

- **Gestión de Recursos**: CRUD completo de recursos tecnológicos con imágenes
- **Gestión de Usuarios**: Sistema de usuarios con roles (Administrador/Usuario)
- **Gestión de Préstamos**: Crear préstamos, registrar devoluciones y seguimiento
- **Informes y Estadísticas**: Dashboard con gráficos y exportación a PDF/Excel
- **Autenticación**: Sistema seguro con JWT
- **Interfaz Moderna**: Diseño responsive con TailwindCSS

## 📋 Requisitos Previos

- Node.js (v16 o superior)
- MySQL (v8 o superior)
- npm o yarn

## 🔧 Instalación

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd sistemaPrestamo
```

### 2. Configurar Base de Datos

1. Crear una base de datos MySQL:
```sql
CREATE DATABASE sistema_prestamos;
```

2. Configurar las variables de entorno en el archivo `.env` (crear desde `.env.example`):
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña
DB_NAME=sistema_prestamos
JWT_SECRET=tu_secreto_jwt_muy_seguro_aqui
NODE_ENV=development
```

### 3. Instalar dependencias del backend

```bash
npm install
```

### 4. Instalar dependencias del frontend

```bash
cd frontend
npm install
cd ..
```

### 5. Inicializar la base de datos

La base de datos se inicializará automáticamente al iniciar el servidor por primera vez. Se creará un usuario administrador por defecto:

- **Email**: admin@sistema.com
- **Contraseña**: admin123

## 🏃 Ejecutar la Aplicación

### Backend

```bash
npm run dev
```

El servidor se ejecutará en `http://localhost:5000`

### Frontend

En otra terminal:

```bash
cd frontend
npm run dev
```

La aplicación se abrirá en `http://localhost:3000`

## 📁 Estructura del Proyecto

```
sistemaPrestamo/
├── backend/
│   ├── config/
│   │   └── database.js          # Configuración de MySQL
│   ├── middleware/
│   │   └── auth.js              # Middleware de autenticación
│   └── routes/
│       ├── authRoutes.js        # Rutas de autenticación
│       ├── recursosRoutes.js    # Rutas de recursos
│       ├── usuariosRoutes.js    # Rutas de usuarios
│       ├── prestamosRoutes.js   # Rutas de préstamos
│       └── informesRoutes.js    # Rutas de informes
├── frontend/
│   ├── src/
│   │   ├── components/          # Componentes reutilizables
│   │   ├── context/             # Context API
│   │   ├── pages/               # Páginas principales
│   │   └── App.jsx              # Componente principal
│   └── package.json
├── uploads/                      # Carpeta para imágenes
├── server.js                     # Servidor Express
└── package.json
```

## 🔐 Roles de Usuario

### Administrador
- Gestionar recursos (crear, editar, eliminar)
- Gestionar usuarios
- Crear préstamos para cualquier usuario
- Ver todos los préstamos
- Acceso completo a informes

### Usuario Estándar
- Ver recursos disponibles
- Crear préstamos para sí mismo
- Ver sus propios préstamos
- Registrar devoluciones de sus préstamos
- Ver informes limitados

## 📊 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Inicio de sesión
- `GET /api/auth/me` - Obtener usuario actual

### Recursos
- `GET /api/recursos` - Listar recursos
- `GET /api/recursos/:id` - Obtener recurso
- `POST /api/recursos` - Crear recurso (Admin)
- `PUT /api/recursos/:id` - Actualizar recurso (Admin)
- `DELETE /api/recursos/:id` - Eliminar recurso (Admin)

### Usuarios
- `GET /api/usuarios` - Listar usuarios (Admin)
- `GET /api/usuarios/:id` - Obtener usuario
- `POST /api/usuarios` - Crear usuario (Admin)
- `PUT /api/usuarios/:id` - Actualizar usuario
- `DELETE /api/usuarios/:id` - Eliminar usuario (Admin)

### Préstamos
- `GET /api/prestamos` - Listar préstamos
- `GET /api/prestamos/:id` - Obtener préstamo
- `POST /api/prestamos` - Crear préstamo
- `PUT /api/prestamos/:id/devolver` - Registrar devolución
- `PUT /api/prestamos/:id` - Actualizar préstamo (Admin)
- `DELETE /api/prestamos/:id` - Eliminar préstamo (Admin)

### Informes
- `GET /api/informes/estadisticas` - Obtener estadísticas
- `GET /api/informes/prestamos` - Generar informe de préstamos
- `GET /api/informes/prestamos?formato=excel` - Exportar a Excel
- `GET /api/informes/prestamos?formato=pdf` - Exportar a PDF

## 🛠️ Tecnologías Utilizadas

### Backend
- Node.js
- Express.js
- MySQL2
- JWT (jsonwebtoken)
- bcryptjs
- Multer (subida de archivos)
- XLSX (exportación Excel)
- PDFKit (exportación PDF)

### Frontend
- React 18
- Vite
- React Router DOM
- Axios
- TailwindCSS
- Recharts (gráficos)
- date-fns

## 📝 Notas

- Las imágenes se guardan en la carpeta `uploads/`
- El sistema valida que no se puedan prestar recursos ya prestados
- Los préstamos vencidos se marcan automáticamente
- Las exportaciones se generan en tiempo real según los filtros aplicados

## 🐛 Solución de Problemas

### Error de conexión a la base de datos
- Verificar que MySQL esté corriendo
- Revisar las credenciales en `.env`
- Asegurarse de que la base de datos existe

### Error al subir imágenes
- Verificar que la carpeta `uploads/` existe
- Verificar permisos de escritura

### Error de autenticación
- Verificar que el token JWT sea válido
- Revisar el JWT_SECRET en `.env`

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

