import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Usuarios = () => {
  const { isAdmin, isTrabajador } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  const [codigoInput, setCodigoInput] = useState('');
  const [formData, setFormData] = useState({
    codigo: '',
    nombre_completo: '',
    email: '',
    password: '',
    rol: isAdmin ? 'trabajador' : 'usuario'
  });

  useEffect(() => {
    if (isTrabajador) {
      fetchUsuarios();
    }
  }, [isTrabajador, busqueda, filtroRol]);

  if (!isTrabajador) {
    return (
      <div className="px-4 py-6">
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
          No tienes permisos para acceder a esta sección
        </div>
      </div>
    );
  }

  const fetchUsuarios = async () => {
    try {
      const params = new URLSearchParams();
      if (filtroRol) params.append('rol', filtroRol);
      if (busqueda) params.append('busqueda', busqueda);

      const response = await axios.get(`/api/usuarios?${params}`);
      setUsuarios(response.data);
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Los trabajadores no pueden editar usuarios
      if (editingUsuario && !isAdmin) {
        alert('Solo los administradores pueden editar usuarios');
        return;
      }

      // Asegurar que trabajadores solo creen usuarios con rol "usuario"
      const dataToSend = { ...formData };
      if (!isAdmin && !editingUsuario) {
        dataToSend.rol = 'usuario';
      }

      if (editingUsuario) {
        await axios.put(`/api/usuarios/${editingUsuario.id}`, dataToSend);
      } else {
        await axios.post('/api/usuarios', dataToSend);
      }

      setShowModal(false);
      resetForm();
      fetchUsuarios();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al guardar usuario');
    }
  };

  const handleDelete = async (id) => {
    if (!isAdmin) {
      alert('Solo los administradores pueden eliminar usuarios');
      return;
    }
    if (!window.confirm('¿Estás seguro de eliminar este usuario?')) return;

    try {
      await axios.delete(`/api/usuarios/${id}`);
      fetchUsuarios();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al eliminar usuario');
    }
  };

  const handleEdit = (usuario) => {
    if (!isAdmin) {
      alert('Solo los administradores pueden editar usuarios');
      return;
    }
    setEditingUsuario(usuario);
    setCodigoInput(usuario.codigo);
    setFormData({
      codigo: usuario.codigo,
      nombre_completo: usuario.nombre_completo,
      email: usuario.email,
      password: '',
      rol: usuario.rol
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      codigo: '',
      nombre_completo: '',
      email: '',
      password: '',
      rol: isAdmin ? 'trabajador' : 'usuario'
    });
    setCodigoInput('');
    setEditingUsuario(null);
  };

  // Detectar cuando se escanea un código (el escáner físico envía el código como texto)
  const handleCodigoChange = (e) => {
    const valor = e.target.value;
    setCodigoInput(valor);
    
    // Si el valor cambia rápidamente (típico de un escáner), procesarlo
    // Los escáneres suelen enviar el código seguido de Enter o Tab
    if (valor.length > 0) {
      // Limpiar caracteres especiales que algunos escáneres agregan (como Enter)
      const codigoLimpio = valor.replace(/\r|\n|\t/g, '').trim();
      setFormData({ ...formData, codigo: codigoLimpio });
    }
  };

  // Detectar cuando se presiona Enter (los escáneres suelen enviar Enter al final)
  const handleCodigoKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const codigoLimpio = codigoInput.replace(/\r|\n|\t/g, '').trim();
      if (codigoLimpio) {
        setFormData({ ...formData, codigo: codigoLimpio });
        // Mover al siguiente campo
        const siguienteCampo = e.target.form?.querySelector('input[name="nombre_completo"]');
        if (siguienteCampo) {
          siguienteCampo.focus();
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Usuarios</h1>
          {!isAdmin && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Puedes crear usuarios de estudiantes para realizar préstamos
            </p>
          )}
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-primary-600 dark:bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
        >
          + Nuevo Usuario
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6 transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Buscar por nombre, email o código..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2"
          />
          <select
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2"
          >
            <option value="">Todos los roles</option>
            <option value="administrador">Administrador</option>
            <option value="trabajador">Trabajador</option>
            <option value="usuario">Usuario</option>
          </select>
        </div>
      </div>

      {/* Tabla de usuarios */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden transition-colors">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Código
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Rol
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {usuarios.map((usuario) => (
              <tr key={usuario.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {usuario.codigo}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {usuario.nombre_completo}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {usuario.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    usuario.rol === 'administrador'
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                      : usuario.rol === 'trabajador'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                  }`}>
                    {usuario.rol}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Link
                    to={`/historial/usuario/${usuario.id}`}
                    className="text-purple-600 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 mr-4 transition-colors"
                    title="Ver historial de préstamos"
                  >
                    📜 Historial
                  </Link>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => handleEdit(usuario)}
                        className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300 mr-4 transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(usuario.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors"
                      >
                        Eliminar
                      </button>
                    </>
                  )}
                  {!isAdmin && (
                    <span className="text-gray-400 dark:text-gray-500 text-xs">
                      Solo lectura
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {usuarios.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No se encontraron usuarios
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 transition-colors">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              {editingUsuario ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Código (Carnet) *
                  </label>
                  <input
                    type="text"
                    name="codigo"
                    required
                    value={codigoInput}
                    onChange={handleCodigoChange}
                    onKeyDown={handleCodigoKeyDown}
                    onBlur={() => {
                      // Cuando pierde el foco, asegurar que el código esté en formData
                      const codigoLimpio = codigoInput.replace(/\r|\n|\t/g, '').trim();
                      if (codigoLimpio) {
                        setFormData({ ...formData, codigo: codigoLimpio });
                      }
                    }}
                    placeholder="Pase la tarjeta por el escáner o ingrese el código manualmente"
                    className="w-full border-2 border-blue-300 dark:border-blue-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none"
                    autoFocus={!editingUsuario}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                    <span>📇</span>
                    <span>Pase la tarjeta del estudiante por el escáner o escriba el código manualmente</span>
                  </p>
                  {formData.codigo && (
                    <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                      ✓ Código detectado: <strong>{formData.codigo}</strong>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    value={formData.nombre_completo}
                    onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {editingUsuario ? 'Nueva Contraseña (dejar vacío para mantener)' : 'Contraseña *'}
                  </label>
                  <input
                    type="password"
                    required={!editingUsuario}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rol</label>
                  {isAdmin ? (
                    <>
                      <select
                        value={formData.rol}
                        onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2"
                      >
                        <option value="trabajador">Trabajador</option>
                        <option value="usuario">Usuario</option>
                        <option value="administrador">Administrador</option>
                      </select>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <strong>Trabajador:</strong> Puede crear préstamos y gestionar recursos en su turno
                      </p>
                    </>
                  ) : (
                    <>
                      <select
                        value="usuario"
                        disabled
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 bg-gray-100 dark:bg-gray-600"
                      >
                        <option value="usuario">Usuario (Estudiante)</option>
                      </select>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Los trabajadores solo pueden crear usuarios con rol "Usuario" (estudiantes)
                      </p>
                    </>
                  )}
                </div>
              </div>
              <div className="mt-6 flex space-x-4">
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 dark:bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-white px-4 py-2 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Usuarios;

