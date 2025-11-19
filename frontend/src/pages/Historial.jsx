import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';

const Historial = () => {
  const { user, isAdmin, isTrabajador } = useAuth();
  const { tipo, id } = useParams();
  const [prestamos, setPrestamos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [estadisticas, setEstadisticas] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    fetchHistorial();
  }, [tipo, id, pagination.page]);

  const fetchHistorial = async () => {
    try {
      setLoading(true);
      let url = '';
      
      if (tipo === 'recurso' && id) {
        url = `/api/historial/recurso/${id}?page=${pagination.page}&limit=${pagination.limit}`;
      } else if (tipo === 'usuario' && id) {
        url = `/api/historial/usuario/${id}?page=${pagination.page}&limit=${pagination.limit}`;
      } else if (isTrabajador) {
        url = `/api/historial/completo?page=${pagination.page}&limit=${pagination.limit}`;
      } else {
        url = `/api/historial/usuario/${user.id}?page=${pagination.page}&limit=${pagination.limit}`;
      }

      const response = await axios.get(url);
      setPrestamos(response.data.prestamos || []);
      if (response.data.estadisticas) {
        setEstadisticas(response.data.estadisticas);
      }
      if (response.data.total !== undefined) {
        setPagination(prev => ({
          ...prev,
          total: response.data.total,
          totalPages: response.data.totalPaginas || Math.ceil(response.data.total / prev.limit)
        }));
      }
    } catch (error) {
      console.error('Error al obtener historial:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEstadoColor = (estado) => {
    const colors = {
      activo: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
      devuelto: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      vencido: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
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
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Historial de Préstamos</h1>

      {/* Estadísticas del usuario */}
      {estadisticas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 transition-colors">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Préstamos</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{estadisticas.total_prestamos}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 transition-colors">
            <div className="text-sm text-gray-600 dark:text-gray-400">Activos</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{estadisticas.activos}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 transition-colors">
            <div className="text-sm text-gray-600 dark:text-gray-400">Devueltos</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{estadisticas.devueltos}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 transition-colors">
            <div className="text-sm text-gray-600 dark:text-gray-400">Vencidos</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{estadisticas.vencidos}</div>
          </div>
        </div>
      )}

      {/* Tabla de historial */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto transition-colors">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Recurso</th>
              {!tipo && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Usuario</th>}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Fecha Préstamo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Fecha Devolución</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Estado</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {prestamos.map((prestamo) => (
              <tr key={prestamo.id}>
                <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                  #{prestamo.id}
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{prestamo.recurso_nombre}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Código: {prestamo.recurso_codigo}</div>
                </td>
                {!tipo && (
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">{prestamo.usuario_nombre}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{prestamo.usuario_email}</div>
                  </td>
                )}
                <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {(() => {
                    try {
                      const fecha = new Date(prestamo.fecha_prestamo.replace(' ', 'T'));
                      return format(fecha, 'dd/MM/yyyy HH:mm');
                    } catch {
                      return prestamo.fecha_prestamo;
                    }
                  })()}
                </td>
                <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {(() => {
                    try {
                      const fecha = new Date(prestamo.fecha_devolucion_prevista.replace(' ', 'T'));
                      return format(fecha, 'dd/MM/yyyy HH:mm');
                    } catch {
                      return prestamo.fecha_devolucion_prevista;
                    }
                  })()}
                  {prestamo.fecha_devolucion_real && (
                    <div className="text-xs text-green-600 dark:text-green-400">
                      Devuelto: {(() => {
                        try {
                          const fecha = new Date(prestamo.fecha_devolucion_real.replace(' ', 'T'));
                          return format(fecha, 'dd/MM/yyyy HH:mm');
                        } catch {
                          return prestamo.fecha_devolucion_real;
                        }
                      })()}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoColor(prestamo.estado)}`}>
                    {prestamo.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {prestamos.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No se encontraron préstamos en el historial
        </div>
      )}

      {/* Paginación */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex justify-between items-center bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Mostrando {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} préstamos
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              disabled={pagination.page === 1}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <span className="px-4 py-2 text-gray-700 dark:text-gray-300">
              Página {pagination.page} de {pagination.totalPages}
            </span>
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              disabled={pagination.page >= pagination.totalPages}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Historial;

