# 📡 Documentación de la API

Documentación completa de todos los endpoints disponibles en el Sistema de Gestión de Préstamos.

## 🔐 Autenticación

Todas las rutas (excepto `/api/auth/login` y `/api/auth/register`) requieren un token JWT en el header:

```
Authorization: Bearer <token>
```

---

## 🔑 Autenticación y Registro

### POST `/api/auth/register`
Registra un nuevo usuario.

**Body:**
```json
{
  "codigo": "USU001",
  "nombre_completo": "Juan Pérez",
  "email": "juan@example.com",
  "password": "password123",
  "rol": "usuario"
}
```

**Respuesta exitosa (201):**
```json
{
  "message": "Usuario registrado exitosamente",
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "codigo": "USU001",
    "nombre_completo": "Juan Pérez",
    "email": "juan@example.com",
    "rol": "usuario"
  }
}
```

**Errores:**
- `400`: Campos requeridos faltantes, email inválido, contraseña muy corta, email/código ya registrado

---

### POST `/api/auth/login`
Inicia sesión con email y contraseña.

**Body:**
```json
{
  "email": "juan@example.com",
  "password": "password123"
}
```

**Respuesta exitosa (200):**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "codigo": "USU001",
    "nombre_completo": "Juan Pérez",
    "email": "juan@example.com",
    "rol": "usuario"
  }
}
```

**Errores:**
- `400`: Email o contraseña incorrectos
- `401`: Credenciales inválidas

---

### GET `/api/auth/me`
Obtiene la información del usuario autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

**Respuesta exitosa (200):**
```json
{
  "user": {
    "id": 1,
    "codigo": "USU001",
    "nombre_completo": "Juan Pérez",
    "email": "juan@example.com",
    "rol": "usuario"
  }
}
```

---

## 👥 Usuarios

### GET `/api/usuarios`
Obtiene la lista de usuarios. Solo para administradores y trabajadores.

**Query Parameters:**
- `rol` (opcional): Filtrar por rol (`administrador`, `trabajador`, `usuario`)
- `busqueda` (opcional): Buscar por nombre, email o código

**Respuesta exitosa (200):**
```json
[
  {
    "id": 1,
    "codigo": "USU001",
    "nombre_completo": "Juan Pérez",
    "email": "juan@example.com",
    "rol": "usuario",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### GET `/api/usuarios/:id`
Obtiene un usuario específico por ID.

**Respuesta exitosa (200):**
```json
{
  "id": 1,
  "codigo": "USU001",
  "nombre_completo": "Juan Pérez",
  "email": "juan@example.com",
  "rol": "usuario",
  "limite_prestamos_simultaneos": 3,
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

---

### POST `/api/usuarios`
Crea un nuevo usuario. Solo para administradores.

**Body:**
```json
{
  "codigo": "USU002",
  "nombre_completo": "María García",
  "email": "maria@example.com",
  "password": "password123",
  "rol": "usuario",
  "limite_prestamos_simultaneos": 5
}
```

---

### PUT `/api/usuarios/:id`
Actualiza un usuario existente. Solo para administradores.

**Body:**
```json
{
  "nombre_completo": "María García López",
  "email": "maria.nueva@example.com",
  "rol": "trabajador",
  "limite_prestamos_simultaneos": 10
}
```

---

### DELETE `/api/usuarios/:id`
Elimina un usuario. Solo para administradores.

---

## 📦 Recursos

### GET `/api/recursos`
Obtiene la lista de recursos.

**Query Parameters:**
- `estado` (opcional): Filtrar por estado (`disponible`, `prestado`, `mantenimiento`)
- `busqueda` (opcional): Buscar por nombre, código, descripción o categoría
- `categoria` (opcional): Filtrar por categoría
- `agrupado` (opcional): `true` para obtener recursos agrupados por categoría
- `incluir_eliminados` (opcional): `true` para incluir recursos eliminados (soft delete)

**Respuesta exitosa (200):**
```json
[
  {
    "id": 1,
    "codigo": "LAP-001",
    "nombre": "Laptop Dell",
    "descripcion": "Laptop Dell Inspiron 15",
    "categoria": "Laptops",
    "estado": "disponible",
    "imagen": "/uploads/recurso-1234567890.png",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
]
```

**Nota:** Los estudiantes solo ven recursos con estado `disponible`.

---

### GET `/api/recursos/:id`
Obtiene un recurso específico por ID.

---

### POST `/api/recursos`
Crea un nuevo recurso. Solo para administradores y trabajadores.

**Body (FormData):**
```
codigo: "LAP-001"
nombre: "Laptop Dell"
descripcion: "Laptop Dell Inspiron 15"
categoria: "Laptops"
estado: "disponible"
imagen: [archivo]
```

---

### PUT `/api/recursos/:id`
Actualiza un recurso existente. Solo para administradores y trabajadores.

**Body (FormData):**
```
nombre: "Laptop Dell Actualizada"
descripcion: "Nueva descripción"
categoria: "Laptops"
estado: "disponible"
imagen: [archivo opcional]
```

---

### DELETE `/api/recursos/:id`
Elimina un recurso (soft delete). Solo para administradores y trabajadores.

**Respuesta exitosa (200):**
```json
{
  "message": "Recurso eliminado correctamente"
}
```

---

### PUT `/api/recursos/:id/restaurar`
Restaura un recurso eliminado (soft delete). Solo para administradores.

---

### GET `/api/recursos/categorias`
Obtiene la lista de categorías disponibles.

**Respuesta exitosa (200):**
```json
["Laptops", "Tablets", "Proyectores", "Cámaras"]
```

---

## 📚 Préstamos

### GET `/api/prestamos`
Obtiene la lista de préstamos.

**Query Parameters:**
- `estado` (opcional): Filtrar por estado (`activo`, `devuelto`, `vencido`)
- `usuario_id` (opcional): Filtrar por usuario
- `recurso_id` (opcional): Filtrar por recurso
- `fecha_inicio` (opcional): Filtrar desde fecha (YYYY-MM-DD)
- `fecha_fin` (opcional): Filtrar hasta fecha (YYYY-MM-DD)
- `search` (opcional): Buscar en código de usuario, nombre de usuario, código de recurso o nombre de recurso
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Elementos por página (default: 10)
- `sortBy` (opcional): Campo para ordenar (default: `created_at`)
- `sortOrder` (opcional): Orden (`ASC` o `DESC`, default: `DESC`)

**Respuesta exitosa (200):**
```json
{
  "prestamos": [
    {
      "id": 1,
      "usuario_id": 1,
      "recurso_id": 1,
      "fecha_prestamo": "2024-01-01T10:00:00.000Z",
      "fecha_devolucion_prevista": "2024-01-08T10:00:00.000Z",
      "fecha_devolucion_real": null,
      "estado": "activo",
      "observaciones": "Préstamo de prueba",
      "usuario_codigo": "USU001",
      "usuario_nombre": "Juan Pérez",
      "recurso_codigo": "LAP-001",
      "recurso_nombre": "Laptop Dell"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

**Nota:** Los estudiantes solo ven sus propios préstamos.

---

### GET `/api/prestamos/:id`
Obtiene un préstamo específico por ID.

---

### POST `/api/prestamos`
Crea un nuevo préstamo. Solo para administradores y trabajadores.

**Body:**
```json
{
  "usuario_id": 1,
  "recurso_id": 1,
  "fecha_prestamo": "2024-01-01 10:00",
  "fecha_devolucion_prevista": "2024-01-08 10:00",
  "observaciones": "Préstamo de prueba"
}
```

**Formato de fecha:** `YYYY-MM-DD HH:MM` o `YYYY-MM-DDTHH:MM`

---

### PUT `/api/prestamos/:id/devolver`
Registra la devolución de un préstamo. Solo para administradores y trabajadores.

**Body:**
```json
{
  "fecha_devolucion": "2024-01-08 15:30",
  "observaciones": "Recurso devuelto en buen estado"
}
```

---

### PUT `/api/prestamos/:id/renovar`
Renueva un préstamo activo. Solo para administradores y trabajadores.

**Body:**
```json
{
  "fecha_devolucion_prevista": "2024-01-15 10:00",
  "observaciones": "Préstamo renovado por 7 días más"
}
```

---

### PUT `/api/prestamos/:id`
Actualiza un préstamo existente. Solo para administradores y trabajadores.

---

### DELETE `/api/prestamos/:id`
Elimina un préstamo. Solo para administradores.

---

## 📅 Reservas

### GET `/api/reservas`
Obtiene la lista de reservas.

**Query Parameters:**
- `estado` (opcional): Filtrar por estado (`pendiente`, `confirmada`, `cancelada`, `completada`)
- `usuario_id` (opcional): Filtrar por usuario
- `recurso_id` (opcional): Filtrar por recurso
- `fecha_inicio` (opcional): Filtrar desde fecha
- `fecha_fin` (opcional): Filtrar hasta fecha
- `page` (opcional): Número de página
- `limit` (opcional): Elementos por página

**Nota:** Los estudiantes solo ven sus propias reservas.

---

### POST `/api/reservas`
Crea una nueva reserva. Solo para administradores y trabajadores.

**Body:**
```json
{
  "usuario_id": 1,
  "recurso_id": 1,
  "fecha_inicio_prevista": "2024-01-10 10:00",
  "fecha_fin_prevista": "2024-01-17 10:00",
  "observaciones": "Reserva para proyecto"
}
```

---

### PUT `/api/reservas/:id`
Actualiza una reserva existente. Solo para administradores y trabajadores.

---

### DELETE `/api/reservas/:id`
Cancela una reserva. Solo para administradores y trabajadores.

---

##  Notificaciones

### GET `/api/notificaciones`
Obtiene las notificaciones del usuario autenticado.

**Query Parameters:**
- `limit` (opcional): Número de notificaciones (default: 10)
- `leida` (opcional): Filtrar por estado (`true` o `false`)

---

### PUT `/api/notificaciones/:id/leer`
Marca una notificación como leída.

---

### DELETE `/api/notificaciones/:id`
Elimina una notificación.

---

## 📊 Informes y Estadísticas

### GET `/api/informes/estadisticas`
Obtiene estadísticas generales del sistema.

**Respuesta exitosa (200):**
```json
{
  "recursos": {
    "total": 100,
    "porEstado": [
      { "estado": "disponible", "cantidad": 60 },
      { "estado": "prestado", "cantidad": 30 },
      { "estado": "mantenimiento", "cantidad": 10 }
    ],
    "masPrestados": [
      {
        "recurso_id": 1,
        "nombre": "Laptop Dell",
        "total_prestamos": 25
      }
    ]
  },
  "prestamos": {
    "total": 500,
    "activos": 30,
    "devueltos": 450,
    "vencidos": 20,
    "porEstado": [
      { "estado": "activo", "cantidad": 30 },
      { "estado": "devuelto", "cantidad": 450 },
      { "estado": "vencido", "cantidad": 20 }
    ]
  },
  "usuarios": {
    "total": 50,
    "porRol": [
      { "rol": "usuario", "cantidad": 40 },
      { "rol": "trabajador", "cantidad": 5 },
      { "rol": "administrador", "cantidad": 5 }
    ]
  }
}
```

---

### GET `/api/informes/prestamos`
Obtiene préstamos con filtros para informes.

**Query Parameters:**
- `usuario_id` (opcional)
- `recurso_id` (opcional)
- `estado` (opcional)
- `fecha_inicio` (opcional)
- `fecha_fin` (opcional)

---

### GET `/api/informes/exportar/excel`
Exporta préstamos a Excel.

**Query Parameters:** Mismos que `/api/informes/prestamos`

**Respuesta:** Archivo Excel descargable

---

### GET `/api/informes/exportar/pdf`
Exporta préstamos a PDF.

**Query Parameters:** Mismos que `/api/informes/prestamos`

**Respuesta:** Archivo PDF descargable

---

## 📜 Historial

### GET `/api/historial/recurso/:recurso_id`
Obtiene el historial de préstamos de un recurso específico.

**Nota:** Los estudiantes solo ven sus propios préstamos del recurso.

---

### GET `/api/historial/usuario/:usuario_id`
Obtiene el historial de préstamos de un usuario específico.

**Nota:** Los estudiantes solo pueden ver su propio historial.

---

### GET `/api/historial/completo`
Obtiene el historial completo de préstamos. Solo para administradores y trabajadores.

**Query Parameters:**
- `page` (opcional)
- `limit` (opcional)

---

## ⚠️ Códigos de Estado HTTP

- `200`: Solicitud exitosa
- `201`: Recurso creado exitosamente
- `400`: Error en la solicitud (datos inválidos)
- `401`: No autenticado (token faltante o inválido)
- `403`: Acceso denegado (permisos insuficientes)
- `404`: Recurso no encontrado
- `500`: Error interno del servidor

---

## 🔒 Permisos por Rol

### Administrador
- Acceso completo a todas las funcionalidades
- Puede crear, editar y eliminar usuarios, recursos, préstamos y reservas
- Acceso a informes completos

### Trabajador
- Puede crear, editar préstamos y reservas
- Puede gestionar recursos
- Puede ver todos los préstamos y reservas
- No puede gestionar usuarios

### Estudiante (Usuario)
- Solo puede ver sus propios préstamos y reservas
- Solo puede ver recursos disponibles
- No puede crear, editar ni eliminar nada
- Acceso de solo lectura

---

## 📝 Notas Importantes

1. **Formato de Fechas:** Todas las fechas deben estar en formato `YYYY-MM-DD HH:MM` o `YYYY-MM-DDTHH:MM`
2. **Tamaño de Archivos:** Las imágenes de recursos tienen un límite de 5MB
3. **Rate Limiting:** 
   - 1000 requests por 15 minutos para rutas generales
   - 50 intentos de login/registro por 15 minutos
4. **Paginación:** La mayoría de endpoints soportan paginación con `page` y `limit`
5. **Búsqueda:** Muchos endpoints soportan búsqueda con el parámetro `search` o `busqueda`

