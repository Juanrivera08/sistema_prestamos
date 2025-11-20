# 👤 Guía de Usuario

Guía completa para usuarios del Sistema de Gestión de Préstamos.

## 📋 Tabla de Contenidos

1. [Inicio de Sesión](#inicio-de-sesión)
2. [Dashboard](#dashboard)
3. [Gestión de Recursos](#gestión-de-recursos)
4. [Gestión de Préstamos](#gestión-de-préstamos)
5. [Reservas](#reservas)
6. [Multas](#multas)
7. [Reportes](#reportes)
8. [Perfil de Usuario](#perfil-de-usuario)

---

## 🔐 Inicio de Sesión

### Acceder al Sistema

1. Abre tu navegador y ve a la URL del sistema
2. Ingresa tu **email** y **contraseña**
3. Haz clic en **"Iniciar Sesión"**

### Credenciales por Defecto

**Administrador:**
- Email: `admin@sistema.com`
- Contraseña: `admin123`

⚠️ **IMPORTANTE:** Cambia la contraseña después del primer acceso.

---

## 📊 Dashboard

El Dashboard muestra un resumen general del sistema:

### Información Mostrada

- **Total de Recursos:** Cantidad total de recursos en el sistema
- **Recursos por Estado:** Gráfico de recursos disponibles, prestados y en mantenimiento
- **Total de Préstamos:** Cantidad total de préstamos
- **Préstamos Activos:** Préstamos actualmente activos
- **Préstamos Vencidos:** Préstamos que han vencido
- **Total de Usuarios:** Cantidad de usuarios registrados

### Gráficos

- **Gráfico de Recursos por Estado:** Muestra distribución de recursos
- **Gráfico de Préstamos por Estado:** Muestra distribución de préstamos

---

## 📦 Gestión de Recursos

### Ver Recursos

1. Haz clic en **"Recursos"** en el menú
2. Verás la lista de todos los recursos disponibles
3. Puedes filtrar por:
   - **Estado:** Disponible, Prestado, Mantenimiento
   - **Categoría:** Laptops, Tablets, Proyectores, etc.
   - **Búsqueda:** Por nombre, código o descripción

### Crear Recurso (Solo Admin/Trabajador)

1. Haz clic en **"Nuevo Recurso"**
2. Completa el formulario:
   - **Código:** Código único del recurso (ej: LAP-001)
   - **Nombre:** Nombre del recurso
   - **Descripción:** Descripción detallada
   - **Categoría:** Selecciona una categoría
   - **Estado:** Disponible, Prestado o Mantenimiento
   - **Imagen:** Sube una imagen del recurso (opcional)
3. Haz clic en **"Guardar"**

### Editar Recurso (Solo Admin/Trabajador)

1. En la lista de recursos, haz clic en **"Editar"** del recurso deseado
2. Modifica los campos necesarios
3. Haz clic en **"Guardar"**

### Eliminar Recurso (Solo Admin/Trabajador)

1. En la lista de recursos, haz clic en **"Eliminar"**
2. Confirma la eliminación
3. El recurso se eliminará (soft delete) y podrás restaurarlo después

### Restaurar Recurso (Solo Admin)

1. Marca la casilla **"Mostrar eliminados"**
2. Haz clic en **"Restaurar"** del recurso eliminado

### Ver Recursos Agrupados

- Haz clic en **"Ver Agrupados"** para ver recursos organizados por categoría

---

## 📚 Gestión de Préstamos

### Ver Préstamos

1. Haz clic en **"Préstamos"** en el menú
2. Verás la lista de préstamos
3. Puedes filtrar por:
   - **Estado:** Activo, Devuelto, Vencido
   - **Usuario:** Selecciona un usuario específico
   - **Recurso:** Selecciona un recurso específico
   - **Fechas:** Rango de fechas
   - **Búsqueda:** Por código de usuario, nombre, código de recurso

### Crear Préstamo (Solo Admin/Trabajador)

1. Haz clic en **"Nuevo Préstamo"**
2. Completa el formulario:
   - **Usuario:** Selecciona o busca el usuario
   - **Recurso:** Selecciona el recurso a prestar
   - **Fecha de Préstamo:** Fecha y hora del préstamo
   - **Fecha de Devolución Prevista:** Fecha esperada de devolución
   - **Observaciones:** Notas adicionales (opcional)
3. Haz clic en **"Crear Préstamo"**

### Devolver Préstamo (Solo Admin/Trabajador)

1. En la lista de préstamos activos, haz clic en **"Devolver"**
2. Ingresa la fecha de devolución real
3. Agrega observaciones si es necesario
4. Haz clic en **"Registrar Devolución"**

### Renovar Préstamo (Solo Admin/Trabajador)

1. En la lista de préstamos activos, haz clic en **"Renovar"**
2. Selecciona la nueva fecha de devolución prevista
3. Agrega observaciones si es necesario
4. Haz clic en **"Renovar"**

### Ver Código QR del Préstamo

1. Haz clic en el ícono de **QR** del préstamo
2. Se mostrará un código QR con la información del préstamo
3. Puedes escanearlo con cualquier lector de QR

---

## 📅 Reservas

### Ver Reservas

1. Haz clic en **"Reservas"** en el menú
2. Verás la lista de reservas
3. Puedes filtrar por estado, usuario, recurso o fechas

### Crear Reserva (Solo Admin/Trabajador)

1. Haz clic en **"Nueva Reserva"**
2. Completa el formulario:
   - **Usuario:** Selecciona el usuario
   - **Recurso:** Selecciona el recurso
   - **Fecha de Inicio Prevista:** Cuándo se usará el recurso
   - **Fecha de Fin Prevista:** Cuándo se devolverá
   - **Observaciones:** Notas adicionales
3. Haz clic en **"Crear Reserva"**

### Cancelar Reserva (Solo Admin/Trabajador)

1. En la lista de reservas, haz clic en **"Cancelar"**
2. Confirma la cancelación

---

## 💰 Multas

### Ver Multas

1. Haz clic en **"Multas"** en el menú
2. Verás la lista de multas
3. Puedes filtrar por estado

### Estadísticas de Multas

El sistema muestra:
- **Total de Multas:** Cantidad total
- **Pendientes:** Multas sin pagar
- **Pagadas:** Multas ya pagadas
- **Monto Total:** Suma de multas pendientes

### Pagar Multa

1. En la lista de multas pendientes, haz clic en **"Pagar"**
2. Confirma el pago
3. La multa se marcará como pagada

### Cancelar Multa (Solo Admin)

1. En la lista de multas, haz clic en **"Cancelar"**
2. Confirma la cancelación
3. La multa se cancelará permanentemente

---

## 📊 Reportes

### Ver Estadísticas

1. Haz clic en **"Informes"** en el menú
2. Verás estadísticas detalladas:
   - Recursos por estado
   - Préstamos por estado
   - Recursos más prestados
   - Usuarios por rol

### Exportar Reportes

1. En la página de Informes, aplica los filtros deseados
2. Haz clic en **"Exportar a Excel"** o **"Exportar a PDF"**
3. El archivo se descargará automáticamente

---

## 📜 Historial

### Ver Historial de Préstamos

1. Haz clic en **"Historial"** en el menú
2. Puedes ver:
   - **Historial por Recurso:** Todos los préstamos de un recurso
   - **Historial por Usuario:** Todos los préstamos de un usuario
   - **Historial Completo:** Todos los préstamos (solo admin/trabajador)

### Filtrar Historial

- Selecciona el tipo de historial
- Aplica filtros por fechas, estado, etc.
- Usa la búsqueda para encontrar préstamos específicos

---

## 📅 Calendario

### Ver Calendario de Préstamos

1. Haz clic en **"Calendario"** en el menú
2. Verás un calendario con todos los préstamos activos
3. Puedes navegar entre meses
4. Haz clic en un día para ver los préstamos de ese día

---

## 🔔 Notificaciones

### Ver Notificaciones

1. Haz clic en el ícono de **campana** en la barra superior
2. Verás tus notificaciones recientes
3. Las notificaciones incluyen:
   - Préstamos próximos a vencer
   - Préstamos vencidos
   - Multas generadas
   - Actualizaciones de estado

### Marcar como Leída

- Haz clic en una notificación para marcarla como leída
- O haz clic en **"Marcar todas como leídas"**

---

## 👤 Perfil de Usuario

### Ver Información del Usuario

- Tu información se muestra en la barra superior
- Puedes ver tu nombre, email y rol

### Cerrar Sesión

1. Haz clic en tu nombre en la barra superior
2. Selecciona **"Cerrar Sesión"**

---

## 🎯 Roles y Permisos

### Administrador
- Acceso completo a todas las funcionalidades
- Puede gestionar usuarios, recursos, préstamos y reservas
- Puede cancelar multas
- Acceso a todos los reportes

### Trabajador
- Puede crear y gestionar préstamos y reservas
- Puede gestionar recursos
- Puede ver todos los préstamos y reservas
- No puede gestionar usuarios

### Estudiante (Usuario)
- Solo puede ver sus propios préstamos, reservas y multas
- Solo puede ver recursos disponibles
- Acceso de solo lectura
- No puede crear, editar ni eliminar nada

---

## 💡 Consejos y Trucos

1. **Búsqueda Rápida:** Usa la barra de búsqueda para encontrar recursos o préstamos rápidamente
2. **Filtros:** Aplica filtros para ver solo la información que necesitas
3. **Códigos QR:** Usa los códigos QR para identificar recursos y préstamos rápidamente
4. **Notificaciones:** Revisa tus notificaciones regularmente para estar al día
5. **Exportar Datos:** Usa la función de exportar para generar reportes en Excel o PDF

---

## ❓ Preguntas Frecuentes

### ¿Cómo cambio mi contraseña?
Contacta a un administrador para cambiar tu contraseña.

### ¿Qué hago si un préstamo está vencido?
El sistema generará automáticamente una multa. Paga la multa cuando sea posible.

### ¿Puedo reservar un recurso?
Solo los administradores y trabajadores pueden crear reservas. Los estudiantes pueden ver sus reservas existentes.

### ¿Cómo veo mis préstamos?
Haz clic en "Préstamos" en el menú. Los estudiantes solo ven sus propios préstamos.

### ¿Qué pasa si elimino un recurso por error?
Los administradores pueden restaurar recursos eliminados marcando "Mostrar eliminados" y haciendo clic en "Restaurar".

---

## 🆘 Soporte

Si tienes problemas o preguntas:
1. Revisa esta guía
2. Contacta a un administrador del sistema
3. Consulta la documentación técnica

