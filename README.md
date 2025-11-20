# 📚 Sistema de Gestión de Préstamos

Sistema completo de gestión de préstamos de recursos tecnológicos con autenticación, roles de usuario, notificaciones, multas, reservas y reportes.

## 🚀 Características

- ✅ Gestión de recursos tecnológicos (CRUD completo)
- ✅ Sistema de préstamos con renovación y devolución
- ✅ Reservas de recursos
- ✅ Sistema de multas por retrasos
- ✅ Notificaciones en tiempo real
- ✅ Historial completo de préstamos
- ✅ Reportes y estadísticas (Excel, PDF)
- ✅ Códigos QR para recursos y préstamos
- ✅ Calendario de préstamos
- ✅ Roles: Administrador, Trabajador, Estudiante
- ✅ Soft delete para recursos
- ✅ Auditoría de acciones

## 📋 Requisitos

- Node.js 18+
- MySQL 8.0+
- npm o yarn

## 🔧 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/Juanrivera08/sistema_prestamos.git
cd sistema_prestamos
```

### 2. Instalar dependencias

```bash
# Backend
npm install

# Frontend
cd frontend
npm install
cd ..
```

### 3. Configurar Base de Datos

```sql
CREATE DATABASE sistema_prestamos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña_mysql
DB_NAME=sistema_prestamos
JWT_SECRET=tu_secreto_jwt_muy_seguro_aqui
FRONTEND_URL=http://localhost:3000
ADMIN_EMAIL=admin@sistema.com
ADMIN_PASSWORD=admin123
ADMIN_CODIGO=ADMIN001
```

**Generar JWT_SECRET seguro:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

⚠️ **IMPORTANTE:** 
- Reemplaza `tu_contraseña_mysql` con tu contraseña de MySQL
- Genera un `JWT_SECRET` seguro y único

### 5. Construir Frontend

```bash
cd frontend
npm run build
cd ..
```

### 6. Iniciar Servidor

```bash
npm run dev  # Backend
cd frontend && npm run dev  # Frontend (en otra terminal)
```

## 🌐 Acceso

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **Email:** admin@sistema.com
- **Contraseña:** admin123

⚠️ **IMPORTANTE:** Cambia la contraseña del administrador después del primer login.


## 📁 Estructura del Proyecto

```
sistema_prestamos/
├── backend/
│   ├── config/          # Configuración de base de datos
│   ├── middleware/      # Middlewares de autenticación
│   ├── routes/          # Rutas de la API
│   └── utils/           # Utilidades (validadores, cron jobs)
├── frontend/
│   ├── src/
│   │   ├── components/  # Componentes React
│   │   ├── context/     # Contextos (Auth, Theme)
│   │   └── pages/       # Páginas principales
│   └── dist/            # Build de producción
├── uploads/             # Imágenes de recursos
├── server.js            # Servidor Express
└── .env                 # Variables de entorno (no subir a Git)
```

## 🔐 Seguridad

- Autenticación JWT
- Bcrypt para contraseñas
- Rate limiting
- Helmet para seguridad HTTP
- Validación de datos
- Sanitización de inputs

## 📝 Scripts Disponibles

```bash
npm run dev              # Backend con nodemon
cd frontend && npm run dev  # Frontend con Vite
```

## 🛠️ Tecnologías

### Backend
- Node.js + Express
- MySQL2
- JWT (jsonwebtoken)
- Bcryptjs
- Multer (upload de archivos)
- XLSX, PDFKit (reportes)
- QRCode

### Frontend
- React 18
- Vite
- React Router DOM
- Axios
- TailwindCSS
- Recharts (gráficos)
- date-fns
- html5-qrcode


## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia ISC.

## 👤 Autor

Juan Rivera - [GitHub](https://github.com/Juanrivera08)

## 🙏 Agradecimientos

- Todos los contribuidores que han ayudado a mejorar este proyecto
