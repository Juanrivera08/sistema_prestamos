import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Documentacion = () => {
  const { isAdmin, isTrabajador } = useAuth();
  const [activeTab, setActiveTab] = useState('usuario');

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        📚 Documentación del Sistema
      </h1>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('usuario')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'usuario'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            👤 Guía de Usuario
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'api'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            📡 Documentación API
          </button>
          {(isAdmin || isTrabajador) && (
            <button
              onClick={() => setActiveTab('tecnica')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tecnica'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              🔧 Documentación Técnica
            </button>
          )}
        </nav>
      </div>

      {/* Contenido de las tabs */}
      <div className="prose prose-lg dark:prose-invert max-w-none">
        {activeTab === 'usuario' && <GuiaUsuario />}
        {activeTab === 'api' && <DocumentacionAPI />}
        {activeTab === 'tecnica' && (isAdmin || isTrabajador) && <DocumentacionTecnica />}
      </div>
    </div>
  );
};

// Componente Guía de Usuario
const GuiaUsuario = () => {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-bold mb-4">🔐 Inicio de Sesión</h2>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-3">Acceder al Sistema</h3>
          <ol className="list-decimal list-inside space-y-2">
            <li>Ingresa tu <strong>email</strong> y <strong>contraseña</strong></li>
            <li>Haz clic en <strong>"Iniciar Sesión"</strong></li>
          </ol>
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded">
            <p className="text-sm"><strong>⚠️ IMPORTANTE:</strong> Cambia la contraseña después del primer acceso.</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">📊 Dashboard</h2>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <p>El Dashboard muestra un resumen general del sistema:</p>
          <ul className="list-disc list-inside space-y-2 mt-4">
            <li><strong>Total de Recursos:</strong> Cantidad total de recursos</li>
            <li><strong>Recursos por Estado:</strong> Gráfico de distribución</li>
            <li><strong>Total de Préstamos:</strong> Cantidad total</li>
            <li><strong>Préstamos Activos:</strong> Préstamos actualmente activos</li>
            <li><strong>Préstamos Vencidos:</strong> Préstamos que han vencido</li>
            <li><strong>Total de Usuarios:</strong> Cantidad de usuarios</li>
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">📦 Gestión de Recursos</h2>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-4">
          <div>
            <h3 className="text-xl font-semibold mb-2">Ver Recursos</h3>
            <p>Haz clic en <strong>"Recursos"</strong> en el menú para ver todos los recursos disponibles.</p>
            <p className="mt-2">Puedes filtrar por estado, categoría o usar la búsqueda.</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Crear Recurso</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Solo para Administradores y Trabajadores</p>
            <ol className="list-decimal list-inside space-y-1 mt-2">
              <li>Haz clic en <strong>"Nuevo Recurso"</strong></li>
              <li>Completa el formulario con código, nombre, descripción, categoría y estado</li>
              <li>Sube una imagen del recurso (opcional)</li>
              <li>Haz clic en <strong>"Guardar"</strong></li>
            </ol>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">📚 Gestión de Préstamos</h2>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-4">
          <div>
            <h3 className="text-xl font-semibold mb-2">Ver Préstamos</h3>
            <p>Haz clic en <strong>"Préstamos"</strong> para ver todos tus préstamos.</p>
            <p className="mt-2">Puedes filtrar por estado, usuario, recurso, fechas o usar la búsqueda.</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Crear Préstamo</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Solo para Administradores y Trabajadores</p>
            <ol className="list-decimal list-inside space-y-1 mt-2">
              <li>Haz clic en <strong>"Nuevo Préstamo"</strong></li>
              <li>Selecciona el usuario y el recurso</li>
              <li>Ingresa las fechas de préstamo y devolución prevista</li>
              <li>Agrega observaciones si es necesario</li>
              <li>Haz clic en <strong>"Crear Préstamo"</strong></li>
            </ol>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Devolver Préstamo</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Solo para Administradores y Trabajadores</p>
            <p>Haz clic en <strong>"Devolver"</strong> en un préstamo activo e ingresa la fecha de devolución real.</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">🎯 Roles y Permisos</h2>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded">
              <h3 className="font-bold text-lg mb-2">👑 Administrador</h3>
              <ul className="text-sm space-y-1">
                <li>✓ Acceso completo</li>
                <li>✓ Gestionar usuarios</li>
                <li>✓ Gestionar recursos</li>
                <li>✓ Gestionar préstamos</li>
                <li>✓ Cancelar multas</li>
              </ul>
            </div>
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded">
              <h3 className="font-bold text-lg mb-2">👷 Trabajador</h3>
              <ul className="text-sm space-y-1">
                <li>✓ Crear préstamos</li>
                <li>✓ Gestionar recursos</li>
                <li>✓ Ver todos los préstamos</li>
                <li>✗ No gestionar usuarios</li>
                <li>✗ No cancelar multas</li>
              </ul>
            </div>
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded">
              <h3 className="font-bold text-lg mb-2">👤 Estudiante</h3>
              <ul className="text-sm space-y-1">
                <li>✓ Ver sus préstamos</li>
                <li>✓ Ver recursos disponibles</li>
                <li>✓ Ver sus multas</li>
                <li>✗ Solo lectura</li>
                <li>✗ No puede crear/editar</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

// Componente Documentación API
const DocumentacionAPI = () => {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-bold mb-4">🔐 Autenticación</h2>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <p className="mb-4">Todas las rutas (excepto login y register) requieren un token JWT:</p>
          <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded font-mono text-sm">
            Authorization: Bearer {'<token>'}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">🔑 Endpoints de Autenticación</h2>
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-2">POST /api/auth/register</h3>
            <p className="mb-2">Registra un nuevo usuario</p>
            <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded font-mono text-sm mb-2">
              {`{
  "codigo": "USU001",
  "nombre_completo": "Juan Pérez",
  "email": "juan@example.com",
  "password": "password123",
  "rol": "usuario"
}`}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-2">POST /api/auth/login</h3>
            <p className="mb-2">Inicia sesión</p>
            <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded font-mono text-sm mb-2">
              {`{
  "email": "juan@example.com",
  "password": "password123"
}`}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-2">GET /api/auth/me</h3>
            <p>Obtiene la información del usuario autenticado</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">📦 Endpoints de Recursos</h2>
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-2">GET /api/recursos</h3>
            <p className="mb-2">Obtiene la lista de recursos</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Query params: estado, busqueda, categoria, agrupado</p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-2">POST /api/recursos</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Solo Admin/Trabajador - Crea un nuevo recurso</p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-2">PUT /api/recursos/:id</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Solo Admin/Trabajador - Actualiza un recurso</p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-2">DELETE /api/recursos/:id</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Solo Admin/Trabajador - Elimina un recurso (soft delete)</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">📚 Endpoints de Préstamos</h2>
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-2">GET /api/prestamos</h3>
            <p className="mb-2">Obtiene la lista de préstamos</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Query params: estado, usuario_id, recurso_id, fecha_inicio, fecha_fin, search, page, limit</p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-2">POST /api/prestamos</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Solo Admin/Trabajador - Crea un nuevo préstamo</p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-2">PUT /api/prestamos/:id/devolver</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Solo Admin/Trabajador - Registra la devolución</p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-2">PUT /api/prestamos/:id/renovar</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Solo Admin/Trabajador - Renueva un préstamo</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">⚡ Códigos de Estado HTTP</h2>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <ul className="space-y-2">
            <li><strong>200:</strong> Solicitud exitosa</li>
            <li><strong>201:</strong> Recurso creado exitosamente</li>
            <li><strong>400:</strong> Error en la solicitud (datos inválidos)</li>
            <li><strong>401:</strong> No autenticado (token faltante o inválido)</li>
            <li><strong>403:</strong> Acceso denegado (permisos insuficientes)</li>
            <li><strong>404:</strong> Recurso no encontrado</li>
            <li><strong>500:</strong> Error interno del servidor</li>
          </ul>
        </div>
      </section>
    </div>
  );
};

// Componente Documentación Técnica
const DocumentacionTecnica = () => {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-bold mb-4">🏗️ Arquitectura del Sistema</h2>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-3">Stack Tecnológico</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Backend:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Node.js 18+</li>
                <li>Express.js 4.18+</li>
                <li>MySQL 8.0+</li>
                <li>JWT para autenticación</li>
                <li>Bcrypt para contraseñas</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Frontend:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>React 18</li>
                <li>Vite</li>
                <li>React Router DOM</li>
                <li>TailwindCSS</li>
                <li>Axios</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">🗄️ Base de Datos</h2>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-3">Tablas Principales</h3>
          <ul className="space-y-2">
            <li><strong>usuarios:</strong> Información de usuarios y roles</li>
            <li><strong>recursos:</strong> Recursos tecnológicos con soft delete</li>
            <li><strong>prestamos:</strong> Registro de préstamos</li>
            <li><strong>reservas:</strong> Reservas de recursos</li>
            <li><strong>multas:</strong> Multas por retrasos</li>
            <li><strong>notificaciones:</strong> Notificaciones del sistema</li>
            <li><strong>auditoria:</strong> Registro de acciones importantes</li>
            <li><strong>configuraciones:</strong> Configuraciones del sistema</li>
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">🔒 Seguridad</h2>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <ul className="space-y-2">
            <li><strong>Autenticación:</strong> JWT con expiración de 24 horas</li>
            <li><strong>Contraseñas:</strong> Hash con bcrypt (10 rounds)</li>
            <li><strong>Rate Limiting:</strong> 1000 requests/15min general, 50 intentos/15min para auth</li>
            <li><strong>Validación:</strong> Validación de datos en backend y frontend</li>
            <li><strong>CORS:</strong> Configurado para orígenes específicos</li>
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">⏰ Tareas Programadas</h2>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <p className="mb-3">Se ejecutan cada hora automáticamente:</p>
          <ul className="space-y-2">
            <li><strong>Verificar préstamos próximos a vencer:</strong> Notifica 24h antes</li>
            <li><strong>Verificar préstamos vencidos:</strong> Actualiza estado y notifica</li>
            <li><strong>Calcular multas automáticas:</strong> Crea multas para préstamos vencidos</li>
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">📝 Variables de Entorno</h2>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded font-mono text-sm">
            {`NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña
DB_NAME=sistema_prestamos
JWT_SECRET=secreto_seguro
FRONTEND_URL=http://localhost:3000
ADMIN_EMAIL=admin@sistema.com
ADMIN_PASSWORD=admin123
ADMIN_CODIGO=ADMIN001`}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Documentacion;

