import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

const Prestamos = () => {
  const { user, isAdmin } = useAuth();
  const [prestamos, setPrestamos] = useState([]);
  const [recursos, setRecursos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDevolucionModal, setShowDevolucionModal] = useState(false);
  const [selectedPrestamo, setSelectedPrestamo] = useState(null);
  const [filtros, setFiltros] = useState({
    estado: '',
    usuario_id: '',
    recurso_id: '',
    fecha_inicio: '',
    fecha_fin: ''
  });
  const [formData, setFormData] = useState({
    usuario_id: '',
    recurso_id: '',
    fecha_prestamo: new Date().toISOString().split('T')[0],
    fecha_devolucion_prevista: '',
    observaciones: ''
  });

  useEffect(() => {
    fetchPrestamos();
    fetchRecursos();
    if (isAdmin) {
      fetchUsuarios();
    }
  }, [isAdmin, filtros]);

  const fetchPrestamos = async () => {
    try {
      const params = new URLSearchParams();
      Object.keys(filtros).forEach(key => {
        if (filtros[key]) params.append(key, filtros[key]);
      });

      const response = await axios.get(`/api/prestamos?${params}`);
      setPrestamos(response.data);
    } catch (error) {
      console.error('Error al obtener préstamos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecursos = async () => {
    try {
      const response = await axios.get('/api/recursos?estado=disponible');
      setRecursos(response.data);
    } catch (error) {
      console.error('Error al obtener recursos:', error);
    }
  };

  const fetchUsuarios = async () => {
    try {
      const response = await axios.get('/api/usuarios');
      setUsuarios(response.data);
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/prestamos', formData);
      setShowModal(false);
      resetForm();
      fetchPrestamos();
      fetchRecursos();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al crear préstamo');
    }
  };

  const handleDevolver = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/prestamos/${selectedPrestamo.id}/devolver`, {
        fecha_devolucion_real: new Date().toISOString().split('T')[0],
        observaciones: formData.observaciones
      });
      setShowDevolucionModal(false);
      setSelectedPrestamo(null);
      resetForm();
      fetchPrestamos();
      fetchRecursos();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al registrar devolución');
    }
  };

  const resetForm = () => {
    setFormData({
      usuario_id: '',
      recurso_id: '',
      fecha_prestamo: new Date().toISOString().split('T')[0],
      fecha_devolucion_prevista: '',
      observaciones: ''
    });
  };

  const getEstadoColor = (estado) => {
    const colors = {
      activo: 'bg-blue-100 text-blue-800',
      devuelto: 'bg-green-100 text-green-800',
      vencido: 'bg-red-100 text-red-800'
    };
    return colors[estado] || 'bg-gray-100 text-gray-800';
  };

  const isVencido = (fecha) => {
    return new Date(fecha) < new Date() && fecha;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Préstamos</h1>
        <button
          onClick={() => {
            resetForm();
            setFormData(prev => ({ ...prev, usuario_id: isAdmin ? '' : user.id }));
            setShowModal(true);
          }}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
        >
          + Nuevo Préstamo
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {isAdmin && (
            <select
              value={filtros.usuario_id}
              onChange={(e) => setFiltros({ ...filtros, usuario_id: e.target.value })}
              className="border border-gray-300 rounded-lg px-4 py-2"
            >
              <option value="">Todos los usuarios</option>
              {usuarios.map(u => (
                <option key={u.id} value={u.id}>{u.nombre_completo}</option>
              ))}
            </select>
          )}
          <select
            value={filtros.estado}
            onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
            className="border border-gray-300 rounded-lg px-4 py-2"
          >
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="devuelto">Devuelto</option>
            <option value="vencido">Vencido</option>
          </select>
          <input
            type="date"
            placeholder="Fecha inicio"
            value={filtros.fecha_inicio}
            onChange={(e) => setFiltros({ ...filtros, fecha_inicio: e.target.value })}
            className="border border-gray-300 rounded-lg px-4 py-2"
          />
          <input
            type="date"
            placeholder="Fecha fin"
            value={filtros.fecha_fin}
            onChange={(e) => setFiltros({ ...filtros, fecha_fin: e.target.value })}
            className="border border-gray-300 rounded-lg px-4 py-2"
          />
          <button
            onClick={() => setFiltros({
              estado: '',
              usuario_id: '',
              recurso_id: '',
              fecha_inicio: '',
              fecha_fin: ''
            })}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Lista de préstamos */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Recurso
              </th>
              {isAdmin && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha Préstamo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha Devolución
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {prestamos.map((prestamo) => (
              <tr key={prestamo.id} className={isVencido(prestamo.fecha_devolucion_prevista) && prestamo.estado === 'activo' ? 'bg-red-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{prestamo.recurso_nombre}</div>
                  <div className="text-sm text-gray-500">{prestamo.recurso_codigo}</div>
                </td>
                {isAdmin && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{prestamo.usuario_nombre}</div>
                    <div className="text-sm text-gray-500">{prestamo.usuario_email}</div>
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(prestamo.fecha_prestamo), 'dd/MM/yyyy')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(prestamo.fecha_devolucion_prevista), 'dd/MM/yyyy')}
                    {prestamo.fecha_devolucion_real && (
                      <div className="text-xs text-green-600">
                        Devuelto: {format(new Date(prestamo.fecha_devolucion_real), 'dd/MM/yyyy')}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoColor(prestamo.estado)}`}>
                    {prestamo.estado}
                  </span>
                  {isVencido(prestamo.fecha_devolucion_prevista) && prestamo.estado === 'activo' && (
                    <div className="text-xs text-red-600 mt-1">⚠️ Vencido</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {prestamo.estado === 'activo' && (
                    <button
                      onClick={() => {
                        setSelectedPrestamo(prestamo);
                        setFormData({ observaciones: '' });
                        setShowDevolucionModal(true);
                      }}
                      className="text-green-600 hover:text-green-900"
                    >
                      Devolver
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {prestamos.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No se encontraron préstamos
        </div>
      )}

      {/* Modal nuevo préstamo */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Nuevo Préstamo</h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                {isAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Usuario *</label>
                    <select
                      required
                      value={formData.usuario_id}
                      onChange={(e) => setFormData({ ...formData, usuario_id: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="">Seleccionar usuario</option>
                      {usuarios.map(u => (
                        <option key={u.id} value={u.id}>{u.nombre_completo}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Recurso *</label>
                  <select
                    required
                    value={formData.recurso_id}
                    onChange={(e) => setFormData({ ...formData, recurso_id: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Seleccionar recurso</option>
                    {recursos.map(r => (
                      <option key={r.id} value={r.id}>{r.nombre} ({r.codigo})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha Préstamo *</label>
                  <input
                    type="date"
                    required
                    value={formData.fecha_prestamo}
                    onChange={(e) => setFormData({ ...formData, fecha_prestamo: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha Devolución Prevista *</label>
                  <input
                    type="date"
                    required
                    value={formData.fecha_devolucion_prevista}
                    onChange={(e) => setFormData({ ...formData, fecha_devolucion_prevista: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Observaciones</label>
                  <textarea
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2"
                    rows="3"
                  />
                </div>
              </div>
              <div className="mt-6 flex space-x-4">
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                >
                  Crear Préstamo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal devolución */}
      {showDevolucionModal && selectedPrestamo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Registrar Devolución</h2>
            <p className="mb-4 text-gray-600">
              Recurso: <strong>{selectedPrestamo.recurso_nombre}</strong>
            </p>
            <form onSubmit={handleDevolver}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Observaciones</label>
                  <textarea
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2"
                    rows="3"
                  />
                </div>
              </div>
              <div className="mt-6 flex space-x-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Registrar Devolución
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDevolucionModal(false);
                    setSelectedPrestamo(null);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
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

export default Prestamos;

