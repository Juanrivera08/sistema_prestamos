# 🔧 Documentación Técnica

Documentación técnica detallada del Sistema de Gestión de Préstamos.

## 📋 Tabla de Contenidos

1. [Arquitectura del Sistema](#arquitectura-del-sistema)
2. [Base de Datos](#base-de-datos)
3. [Backend](#backend)
4. [Frontend](#frontend)
5. [Seguridad](#seguridad)
6. [Tareas Programadas](#tareas-programadas)
7. [Validaciones](#validaciones)

---

## 🏗️ Arquitectura del Sistema

### Stack Tecnológico

**Backend:**
- Node.js 18+
- Express.js 4.18+
- MySQL 8.0+ (mysql2)
- JWT para autenticación
- Bcrypt para hash de contraseñas
- Multer para upload de archivos
- XLSX y PDFKit para reportes
- QRCode para generación de códigos QR

**Frontend:**
- React 18
- Vite como build tool
- React Router DOM para routing
- Axios para peticiones HTTP
- TailwindCSS para estilos
- Recharts para gráficos
- date-fns para manejo de fechas
- html5-qrcode para escaneo de QR

### Estructura del Proyecto

```
sistema_prestamos/
├── backend/
│   ├── config/
│   │   └── database.js          # Configuración de MySQL y migraciones
│   ├── middleware/
│   │   └── auth.js              # Middlewares de autenticación y autorización
│   ├── routes/
│   │   ├── authRoutes.js        # Autenticación y registro
│   │   ├── usuariosRoutes.js    # Gestión de usuarios
│   │   ├── recursosRoutes.js    # Gestión de recursos
│   │   ├── prestamosRoutes.js  # Gestión de préstamos
│   │   ├── reservasRoutes.js   # Gestión de reservas
│   │   ├── multasRoutes.js     # Gestión de multas
│   │   ├── notificacionesRoutes.js # Notificaciones
│   │   ├── informesRoutes.js   # Reportes y estadísticas
│   │   └── historialRoutes.js   # Historial de préstamos
│   └── utils/
│       ├── validators.js        # Validadores reutilizables
│       ├── auditoria.js         # Sistema de auditoría
│       └── cronJobs.js          # Tareas programadas
├── frontend/
│   ├── src/
│   │   ├── components/          # Componentes reutilizables
│   │   │   ├── Layout.jsx      # Layout principal
│   │   │   ├── PrivateRoute.jsx # Protección de rutas
│   │   │   ├── Notificaciones.jsx # Componente de notificaciones
│   │   │   ├── QRCodeModal.jsx  # Modal para mostrar QR
│   │   │   └── QRScanner.jsx    # Escáner de códigos QR
│   │   ├── context/
│   │   │   ├── AuthContext.jsx  # Contexto de autenticación
│   │   │   └── ThemeContext.jsx # Contexto de tema (dark/light)
│   │   ├── pages/               # Páginas principales
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Recursos.jsx
│   │   │   ├── Usuarios.jsx
│   │   │   ├── Prestamos.jsx
│   │   │   ├── Reservas.jsx
│   │   │   ├── Multas.jsx
│   │   │   ├── Historial.jsx
│   │   │   ├── Calendario.jsx
│   │   │   └── Informes.jsx
│   │   ├── App.jsx              # Componente raíz
│   │   ├── main.jsx             # Punto de entrada
│   │   └── index.css            # Estilos globales
│   └── dist/                    # Build de producción
├── uploads/                     # Imágenes de recursos
├── server.js                    # Servidor Express principal
├── package.json                 # Dependencias del backend
└── .env                         # Variables de entorno
```

---

## 🗄️ Base de Datos

### Esquema de Base de Datos

#### Tabla: `usuarios`
```sql
CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre_completo VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  rol ENUM('administrador', 'usuario', 'trabajador') DEFAULT 'usuario',
  limite_prestamos_simultaneos INT DEFAULT 3,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### Tabla: `recursos`
```sql
CREATE TABLE recursos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  categoria VARCHAR(100),
  estado ENUM('disponible', 'prestado', 'mantenimiento') DEFAULT 'disponible',
  imagen VARCHAR(255),
  deleted_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_estado (estado),
  INDEX idx_categoria (categoria),
  INDEX idx_deleted_at (deleted_at)
);
```

#### Tabla: `prestamos`
```sql
CREATE TABLE prestamos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  recurso_id INT NOT NULL,
  fecha_prestamo DATETIME NOT NULL,
  fecha_devolucion_prevista DATETIME NOT NULL,
  fecha_devolucion_real DATETIME NULL,
  estado ENUM('activo', 'devuelto', 'vencido') DEFAULT 'activo',
  observaciones TEXT,
  trabajador_id INT,
  trabajador_nombre VARCHAR(255),
  trabajador_email VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (recurso_id) REFERENCES recursos(id) ON DELETE CASCADE,
  INDEX idx_usuario (usuario_id),
  INDEX idx_recurso (recurso_id),
  INDEX idx_estado (estado),
  INDEX idx_fecha_prestamo (fecha_prestamo)
);
```

#### Tabla: `reservas`
```sql
CREATE TABLE reservas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  recurso_id INT NOT NULL,
  fecha_reserva DATETIME NOT NULL,
  fecha_inicio_prevista DATETIME NOT NULL,
  fecha_fin_prevista DATETIME NOT NULL,
  estado ENUM('pendiente', 'confirmada', 'cancelada', 'completada') DEFAULT 'pendiente',
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (recurso_id) REFERENCES recursos(id) ON DELETE CASCADE,
  INDEX idx_usuario (usuario_id),
  INDEX idx_recurso (recurso_id),
  INDEX idx_estado (estado)
);
```

#### Tabla: `multas`
```sql
CREATE TABLE multas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  prestamo_id INT NOT NULL,
  usuario_id INT NOT NULL,
  monto DECIMAL(10, 2) NOT NULL,
  dias_retraso INT NOT NULL,
  estado ENUM('pendiente', 'pagada', 'cancelada') DEFAULT 'pendiente',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (prestamo_id) REFERENCES prestamos(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_usuario (usuario_id),
  INDEX idx_estado (estado)
);
```

#### Tabla: `notificaciones`
```sql
CREATE TABLE notificaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  mensaje TEXT NOT NULL,
  leida BOOLEAN DEFAULT FALSE,
  relacion_id INT,
  relacion_tipo VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_usuario (usuario_id),
  INDEX idx_leida (leida)
);
```

#### Tabla: `auditoria`
```sql
CREATE TABLE auditoria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT,
  accion VARCHAR(100) NOT NULL,
  tabla VARCHAR(50) NOT NULL,
  registro_id INT,
  datos_antiguos JSON,
  datos_nuevos JSON,
  ip VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_usuario (usuario_id),
  INDEX idx_tabla (tabla),
  INDEX idx_created_at (created_at)
);
```

#### Tabla: `configuraciones`
```sql
CREATE TABLE configuraciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clave VARCHAR(100) UNIQUE NOT NULL,
  valor TEXT,
  descripcion TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Características de la Base de Datos

1. **Soft Delete:** La tabla `recursos` implementa soft delete con `deleted_at`
2. **Índices:** Todas las tablas tienen índices en campos frecuentemente consultados
3. **Foreign Keys:** Relaciones con `ON DELETE CASCADE` para mantener integridad
4. **Timestamps:** Todas las tablas tienen `created_at` y `updated_at` automáticos

---

## ⚙️ Backend

### Configuración del Servidor

**Archivo:** `server.js`

- Puerto: Configurable con `PORT` (default: 5000)
- CORS: Configurado para permitir `localhost:3000` y `FRONTEND_URL`
- Rate Limiting: 
  - General: 1000 requests/15min
  - Auth: 50 intentos/15min
- Helmet: Configurado para seguridad HTTP
- Static Files: Sirve `uploads/` y `frontend/dist/`

### Middlewares

#### `authenticateToken`
Verifica el token JWT en el header `Authorization: Bearer <token>`

#### `requireAdmin`
Verifica que el usuario tenga rol `administrador`

#### `requireAdminOrTrabajador`
Verifica que el usuario tenga rol `administrador` o `trabajador`

### Validadores

**Archivo:** `backend/utils/validators.js`

- `isValidEmail(email)`: Valida formato de email
- `isValidPassword(password)`: Valida que tenga al menos 6 caracteres
- `isValidDate(dateString)`: Valida formato YYYY-MM-DD
- `isValidDateTime(dateTimeString)`: Valida formato YYYY-MM-DD HH:MM
- `sanitizeString(str)`: Sanitiza strings para prevenir XSS básico

### Sistema de Auditoría

**Archivo:** `backend/utils/auditoria.js`

Registra todas las acciones importantes:
- Creación, actualización y eliminación de recursos
- Creación y devolución de préstamos
- Cambios en usuarios

### Tareas Programadas

**Archivo:** `backend/utils/cronJobs.js`

Se ejecutan cada hora:
1. **Verificar préstamos próximos a vencer:** Notifica 24h antes
2. **Verificar préstamos vencidos:** Notifica y actualiza estado
3. **Calcular multas automáticas:** Crea multas para préstamos vencidos

---

## 🎨 Frontend

### Routing

**Archivo:** `frontend/src/App.jsx`

Rutas protegidas con `PrivateRoute`:
- `/dashboard` - Dashboard principal
- `/recursos` - Gestión de recursos
- `/usuarios` - Gestión de usuarios (solo admin/trabajador)
- `/prestamos` - Gestión de préstamos
- `/reservas` - Gestión de reservas
- `/multas` - Gestión de multas
- `/historial` - Historial de préstamos
- `/calendario` - Vista de calendario
- `/informes` - Reportes y estadísticas

### Contextos

#### AuthContext
- Maneja autenticación del usuario
- Proporciona: `user`, `login`, `logout`, `register`, `isAdmin`, `isTrabajador`, `isEstudiante`

#### ThemeContext
- Maneja tema claro/oscuro
- Persiste preferencia en localStorage

### Componentes Principales

#### Layout
- Navbar con navegación
- Menú responsive
- Notificaciones en tiempo real

#### PrivateRoute
- Protege rutas que requieren autenticación
- Redirige a `/login` si no está autenticado

---

## 🔒 Seguridad

### Autenticación
- JWT con expiración de 24 horas
- Tokens almacenados en localStorage
- Headers `Authorization: Bearer <token>`

### Contraseñas
- Hash con bcrypt (10 rounds)
- Validación mínima de 6 caracteres

### Rate Limiting
- Previene ataques de fuerza bruta
- Límites diferentes para rutas de autenticación

### Validación
- Validación de datos en backend
- Sanitización de inputs
- Validación de tipos y formatos

### CORS
- Configurado para permitir solo orígenes específicos
- Credenciales habilitadas

---

## ⏰ Tareas Programadas

### Ejecución
- Se ejecutan cada hora automáticamente
- También se ejecutan al iniciar el servidor

### Funciones

1. **verificarPrestamosProximosAVencer**
   - Busca préstamos que vencen en las próximas 24 horas
   - Crea notificaciones para los usuarios

2. **verificarPrestamosVencidos**
   - Busca préstamos vencidos con estado `activo`
   - Actualiza estado a `vencido`
   - Crea notificaciones

3. **calcularMultasAutomaticas**
   - Calcula multas para préstamos vencidos sin multa
   - Monto: días de retraso × tarifa configurada
   - Crea registro en tabla `multas`

---

## ✅ Validaciones

### Backend
- Validación de email con regex
- Validación de contraseña (mínimo 6 caracteres)
- Validación de fechas y datetime
- Validación de tipos de archivo (solo imágenes)
- Validación de tamaño de archivo (máximo 5MB)

### Frontend
- Validación de formularios antes de enviar
- Mensajes de error claros
- Validación en tiempo real

---

## 📝 Notas de Desarrollo

### Variables de Entorno Requeridas

```env
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña
DB_NAME=sistema_prestamos
JWT_SECRET=secreto_seguro
FRONTEND_URL=http://localhost:3000
ADMIN_EMAIL=admin@sistema.com
ADMIN_PASSWORD=admin123
ADMIN_CODIGO=ADMIN001
```

### Scripts Disponibles

**Backend:**
- `npm start`: Inicia servidor en producción
- `npm run dev`: Inicia servidor con nodemon (desarrollo)

**Frontend:**
- `npm run dev`: Inicia servidor de desarrollo Vite
- `npm run build`: Construye para producción
- `npm run preview`: Previsualiza build de producción

---

## 🐛 Debugging

### Logs del Servidor
- Errores se registran en consola con `console.error`
- Información de debug con `console.log` (solo en desarrollo)

### Errores Comunes

1. **Error de conexión a BD:** Verificar variables de entorno
2. **Token inválido:** Verificar JWT_SECRET
3. **CORS error:** Verificar FRONTEND_URL
4. **Error de upload:** Verificar permisos de carpeta `uploads/`

---

## 📚 Referencias

- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [JWT.io](https://jwt.io/)

