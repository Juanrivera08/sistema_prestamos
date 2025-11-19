import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

const Reservas = () => {
  const { user, isAdmin, isTrabajador, isEstudiante } = useAuth();
  const [reservas, setReservas] = useState([]);
  const [recursos, setRecursos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedReserva, setSelectedReserva] = useState(null);
  const [filtros, setFiltros] = useState({
    estado: '',
    recurso_id: ''
  });
  const [formData, setFormData] = useState({
    usuario_id: '',
    recurso_id: '',
    fecha_inicio_prevista: '',
    hora_inicio_prevista: '',
    fecha_fin_prevista: '',
    hora_fin_prevista: '',
    observaciones: ''
  });

  useEffect(() => {
    fetchReservas();
    fetchRecursos();
    if (isTrabajador) {
      fetchUsuarios();
    }
  }, [isTrabajador, filtros]);

  const fetchReservas = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.keys(filtros).forEach(key => {
        if (filtros[key]) params.append(key, filtros[key]);
      });

      const response = await axios.get(`/api/reservas?${params}`);
      setReservas(response.data);
    } catch (error) {
      console.error('Error al obtener reservas:', error);
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
      const fechaInicioCompleta = `${formData.fecha_inicio_prevista} ${formData.hora_inicio_prevista}`;
      const fechaFinCompleta = `${formData.fecha_fin_prevista} ${formData.hora_fin_prevista}`;

      await axios.post('/api/reservas', {
        usuario_id: isTrabajador ? formData.usuario_id : user.id,
        recurso_id: formData.recurso_id,
        fecha_inicio_prevista: fechaInicioCompleta,
        fecha_fin_prevista: fechaFinCompleta,
        observaciones: formData.observaciones
      });

      setShowModal(false);
      resetForm();
      fetchReservas();
      alert('Reserva creada exitosamente');
    } catch (error) {
      alert(error.response?.data?.message || 'Error al crear reserva');
    }
  };

  const handleConfirmar = async (id) => {
    if (!confirm('¿Confirmar esta reserva y crear el préstamo?')) return;

    try {
      await axios.post(`/api/reservas/${id}/confirmar`);
      fetchReservas();
      fetchRecursos();
      alert('Reserva confirmada y préstamo creado exitosamente');
    } catch (error) {
      alert(error.response?.data?.message || 'Error al confirmar reserva');
    }
  };

  const handleCancelar = async (id) => {
    if (!confirm('¿Cancelar esta reserva?')) return;

    try {
      await axios.put(`/api/reservas/${id}/cancelar`);
      fetchReservas();
      alert('Reserva cancelada exitosamente');
    } catch (error) {
      alert(error.response?.data?.message || 'Error al cancelar reserva');
    }
  };

  const resetForm = () => {
    setFormData({
      usuario_id: '',
      recurso_id: '',
      fecha_inicio_prevista: '',
      hora_inicio_prevista: '',
      fecha_fin_prevista: '',
      hora_fin_prevista: '',
      observaciones: ''
    });
  };

  const getEstadoColor = (estado) => {
    const colors = {
      pendiente: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
      confirmada: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
      cancelada: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
      completada: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
    };
    return colors[estado] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reservas</h1>
        {!isEstudiante && (
          <button
            onClick={() => {
              resetForm();
              setFormData(prev => ({ ...prev, usuario_id: isTrabajador ? '' : user.id }));
              setShowModal(true);
            }}
            className="bg-primary-600 dark:bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
          >
            + Nueva Reserva
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6 transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            value={filtros.estado}
            onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2"
          >
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="confirmada">Confirmada</option>
            <option value="cancelada">Cancelada</option>
            <option value="completada">Completada</option>
          </select>
          <button
            onClick={() => setFiltros({ estado: '', recurso_id: '' })}
            className="bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-white px-4 py-2 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Tabla de reservas */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto transition-colors">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Recurso</th>
              {isTrabajador && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Usuario</th>}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Fecha Reserva</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Fecha Inicio</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Fecha Fin</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {reservas.map((reserva) => (
              <tr key={reserva.id}>
                <td className="px-4 py-4">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{reserva.recurso_nombre}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Código: {reserva.recurso_codigo}</div>
                </td>
                {isTrabajador && (
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">{reserva.usuario_nombre}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{reserva.usuario_email}</div>
                  </td>
                )}
                <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {(() => {
                    try {
                      const fecha = new Date(reserva.fecha_reserva.replace(' ', 'T'));
                      return format(fecha, 'dd/MM/yyyy HH:mm');
                    } catch {
                      return reserva.fecha_reserva;
                    }
                  })()}
                </td>
                <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {(() => {
                    try {
                      const fecha = new Date(reserva.fecha_inicio_prevista.replace(' ', 'T'));
                      return format(fecha, 'dd/MM/yyyy HH:mm');
                    } catch {
                      return reserva.fecha_inicio_prevista;
                    }
                  })()}
                </td>
                <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {(() => {
                    try {
                      const fecha = new Date(reserva.fecha_fin_prevista.replace(' ', 'T'));
                      return format(fecha, 'dd/MM/yyyy HH:mm');
                    } catch {
                      return reserva.fecha_fin_prevista;
                    }
                  })()}
                </td>
                <td className="px-4 py-4">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoColor(reserva.estado)}`}>
                    {reserva.estado}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm font-medium">
                  {reserva.estado === 'pendiente' && (isTrabajador || reserva.usuario_id === user.id) && (
                    <>
                      {isTrabajador && (
                        <button
                          onClick={() => handleConfirmar(reserva.id)}
                          className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 mr-4"
                        >
                          Confirmar
                        </button>
                      )}
                      <button
                        onClick={() => handleCancelar(reserva.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                      >
                        Cancelar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {reservas.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No se encontraron reservas
        </div>
      )}

      {/* Modal nueva reserva */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto transition-colors">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Nueva Reserva</h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                {isTrabajador && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Usuario *
                    </label>
                    <select
                      required
                      value={formData.usuario_id}
                      onChange={(e) => setFormData({ ...formData, usuario_id: e.target.value })}
                      className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2"
                    >
                      <option value="">Seleccionar usuario</option>
                      {usuarios.map(u => (
                        <option key={u.id} value={u.id}>{u.nombre_completo} - {u.email}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Recurso *
                  </label>
                  <select
                    required
                    value={formData.recurso_id}
                    onChange={(e) => setFormData({ ...formData, recurso_id: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2"
                  >
                    <option value="">Seleccionar recurso</option>
                    {recursos.map(r => (
                      <option key={r.id} value={r.id}>{r.nombre} - {r.codigo}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha Inicio *</label>
                    <input
                      type="date"
                      required
                      value={formData.fecha_inicio_prevista}
                      onChange={(e) => setFormData({ ...formData, fecha_inicio_prevista: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Hora Inicio *</label>
                    <input
                      type="time"
                      required
                      value={formData.hora_inicio_prevista}
                      onChange={(e) => setFormData({ ...formData, hora_inicio_prevista: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha Fin *</label>
                    <input
                      type="date"
                      required
                      value={formData.fecha_fin_prevista}
                      onChange={(e) => setFormData({ ...formData, fecha_fin_prevista: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Hora Fin *</label>
                    <input
                      type="time"
                      required
                      value={formData.hora_fin_prevista}
                      onChange={(e) => setFormData({ ...formData, hora_fin_prevista: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Observaciones</label>
                  <textarea
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2"
                    rows="3"
                  />
                </div>
              </div>
              <div className="mt-6 flex space-x-4">
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 dark:bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
                >
                  Crear Reserva
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

export default Reservas;

