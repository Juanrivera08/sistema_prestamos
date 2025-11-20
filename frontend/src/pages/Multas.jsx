import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

const Multas = () => {
  const { user, isAdmin, isTrabajador } = useAuth();
  const [multas, setMultas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    estado: ''
  });
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    pendientes: 0,
    pagadas: 0,
    montoTotal: 0
  });

  useEffect(() => {
    fetchMultas();
  }, [filtros]);

  const fetchMultas = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtros.estado) params.append('estado', filtros.estado);

      const response = await axios.get(`/api/multas?${params}`);
      setMultas(response.data);
      
      // Calcular estadísticas
      const total = response.data.length;
      const pendientes = response.data.filter(m => m.estado === 'pendiente').length;
      const pagadas = response.data.filter(m => m.estado === 'pagada').length;
      const montoTotal = response.data
        .filter(m => m.estado === 'pendiente')
        .reduce((sum, m) => sum + parseFloat(m.monto || 0), 0);

      setEstadisticas({ total, pendientes, pagadas, montoTotal });
    } catch (error) {
      console.error('Error al obtener multas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePagar = async (id) => {
    if (!confirm('¿Marcar esta multa como pagada?')) return;

    try {
      await axios.put(`/api/multas/${id}/pagar`);
      fetchMultas();
      alert('Multa marcada como pagada');
    } catch (error) {
      alert(error.response?.data?.message || 'Error al pagar multa');
    }
  };

  const handleCancelar = async (id) => {
    if (!confirm('¿Cancelar esta multa? Esta acción no se puede deshacer.')) return;

    try {
      await axios.put(`/api/multas/${id}/cancelar`);
      fetchMultas();
      alert('Multa cancelada exitosamente');
    } catch (error) {
      alert(error.response?.data?.message || 'Error al cancelar multa');
    }
  };

  const getEstadoColor = (estado) => {
    const colors = {
      pendiente: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
      pagada: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      cancelada: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
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
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Multas</h1>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 transition-colors">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Multas</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{estadisticas.total}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 transition-colors">
          <div className="text-sm text-gray-600 dark:text-gray-400">Pendientes</div>
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{estadisticas.pendientes}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 transition-colors">
          <div className="text-sm text-gray-600 dark:text-gray-400">Pagadas</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{estadisticas.pagadas}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 transition-colors">
          <div className="text-sm text-gray-600 dark:text-gray-400">Monto Pendiente</div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            ${estadisticas.montoTotal.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6 transition-colors">
        <div className="flex gap-4">
          <select
            value={filtros.estado}
            onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2"
          >
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="pagada">Pagada</option>
            <option value="cancelada">Cancelada</option>
          </select>
          <button
            onClick={() => setFiltros({ estado: '' })}
            className="bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-white px-4 py-2 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Tabla de multas */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto transition-colors">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Préstamo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Usuario</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Recurso</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Días Retraso</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Monto</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Fecha Pago</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {multas.map((multa) => (
              <tr key={multa.id}>
                <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                  #{multa.prestamo_id}
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-gray-900 dark:text-white">{multa.usuario_nombre}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{multa.usuario_email}</div>
                </td>
                <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                  {multa.recurso_nombre}
                </td>
                <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {multa.dias_retraso} día(s)
                </td>
                <td className="px-4 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                  ${parseFloat(multa.monto || 0).toLocaleString()}
                </td>
                <td className="px-4 py-4">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoColor(multa.estado)}`}>
                    {multa.estado}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {multa.fecha_pago ? (() => {
                    try {
                      const fecha = new Date(multa.fecha_pago.replace(' ', 'T'));
                      return format(fecha, 'dd/MM/yyyy HH:mm');
                    } catch {
                      return multa.fecha_pago;
                    }
                  })() : '-'}
                </td>
                <td className="px-4 py-4 text-sm font-medium">
                  <div className="flex space-x-2">
                    {multa.estado === 'pendiente' && (isTrabajador || multa.usuario_id === user.id) && (
                      <button
                        onClick={() => handlePagar(multa.id)}
                        className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                      >
                        Pagar
                      </button>
                    )}
                    {isAdmin && multa.estado !== 'cancelada' && (
                      <button
                        onClick={() => handleCancelar(multa.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {multas.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No se encontraron multas
        </div>
      )}
    </div>
  );
};

export default Multas;

