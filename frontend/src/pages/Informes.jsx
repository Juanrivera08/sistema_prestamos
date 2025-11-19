import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { format } from 'date-fns';

const Informes = () => {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [prestamos, setPrestamos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    usuario_id: '',
    recurso_id: '',
    estado: '',
    fecha_inicio: '',
    fecha_fin: ''
  });
  const [usuarios, setUsuarios] = useState([]);
  const [recursos, setRecursos] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchPrestamos();
    if (isAdmin) {
      fetchUsuarios();
    }
    fetchRecursos();
  }, [isAdmin, filtros]);

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/informes/estadisticas');
      setStats(response.data);
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
    }
  };

  const fetchPrestamos = async () => {
    try {
      const params = new URLSearchParams();
      Object.keys(filtros).forEach(key => {
        if (filtros[key]) params.append(key, filtros[key]);
      });

      const response = await axios.get(`/api/informes/prestamos?${params}`);
      setPrestamos(response.data);
    } catch (error) {
      console.error('Error al obtener préstamos:', error);
    } finally {
      setLoading(false);
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

  const fetchRecursos = async () => {
    try {
      const response = await axios.get('/api/recursos');
      setRecursos(response.data);
    } catch (error) {
      console.error('Error al obtener recursos:', error);
    }
  };

  const handleExport = async (formato) => {
    try {
      const params = new URLSearchParams();
      Object.keys(filtros).forEach(key => {
        if (filtros[key]) params.append(key, filtros[key]);
      });
      params.append('formato', formato);

      const response = await axios.get(`/api/informes/prestamos?${params}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `prestamos.${formato === 'excel' ? 'xlsx' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Error al exportar informe');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400"></div>
      </div>
    );
  }

  const recursosEstadoData = stats?.recursos.porEstado.map(item => ({
    name: item.estado.charAt(0).toUpperCase() + item.estado.slice(1),
    value: item.cantidad
  })) || [];

  const prestamosEstadoData = stats?.prestamos.porEstado.map(item => ({
    name: item.estado.charAt(0).toUpperCase() + item.estado.slice(1),
    value: item.cantidad
  })) || [];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Informes y Estadísticas</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => handleExport('excel')}
            className="bg-green-600 dark:bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
          >
            📊 Exportar Excel
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="bg-red-600 dark:bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
          >
            📄 Exportar PDF
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6 transition-colors">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {isAdmin && (
            <select
              value={filtros.usuario_id}
              onChange={(e) => setFiltros({ ...filtros, usuario_id: e.target.value })}
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2"
            >
              <option value="">Todos los usuarios</option>
              {usuarios.map(u => (
                <option key={u.id} value={u.id}>{u.nombre_completo}</option>
              ))}
            </select>
          )}
          <select
            value={filtros.recurso_id}
            onChange={(e) => setFiltros({ ...filtros, recurso_id: e.target.value })}
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2"
          >
            <option value="">Todos los recursos</option>
            {recursos.map(r => (
              <option key={r.id} value={r.id}>{r.nombre}</option>
            ))}
          </select>
          <select
            value={filtros.estado}
            onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2"
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
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2"
          />
          <input
            type="date"
            placeholder="Fecha fin"
            value={filtros.fecha_fin}
            onChange={(e) => setFiltros({ ...filtros, fecha_fin: e.target.value })}
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2"
          />
        </div>
        <button
          onClick={() => setFiltros({
            usuario_id: '',
            recurso_id: '',
            estado: '',
            fecha_inicio: '',
            fecha_fin: ''
          })}
          className="mt-4 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-white px-4 py-2 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
        >
          Limpiar Filtros
        </button>
      </div>

      {/* Estadísticas generales */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 transition-colors">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Recursos</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.recursos.total}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 transition-colors">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Préstamos</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.prestamos.total}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 transition-colors">
            <div className="text-sm text-gray-600 dark:text-gray-400">Préstamos Vencidos</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.prestamos.vencidos}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 transition-colors">
            <div className="text-sm text-gray-600 dark:text-gray-400">Recursos Más Prestados</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.recursosMasPrestados?.[0]?.veces_prestado || 0}
            </div>
          </div>
        </div>
      )}

      {/* Gráficos */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Recursos por Estado</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={recursosEstadoData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {recursosEstadoData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Préstamos por Estado</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={prestamosEstadoData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recursos más prestados */}
          {stats.recursosMasPrestados && stats.recursosMasPrestados.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Top 10 Recursos Más Prestados</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={stats.recursosMasPrestados.map(r => ({
                    name: r.nombre.length > 15 ? r.nombre.substring(0, 15) + '...' : r.nombre,
                    veces: r.veces_prestado
                  }))}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip />
                  <Bar dataKey="veces" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Usuarios con más préstamos */}
          {stats.usuariosMasPrestamos && stats.usuariosMasPrestamos.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Top 10 Usuarios con Más Préstamos</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={stats.usuariosMasPrestamos.map(u => ({
                    name: u.nombre_completo.length > 15 ? u.nombre_completo.substring(0, 15) + '...' : u.nombre_completo,
                    prestamos: u.total_prestamos
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="prestamos" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Tabla de préstamos */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden transition-colors">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Préstamos ({prestamos.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Recurso
                </th>
                {isAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Usuario
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Fecha Préstamo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Fecha Devolución
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {prestamos.map((prestamo) => (
                <tr key={prestamo.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{prestamo.recurso_nombre}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{prestamo.recurso_codigo}</div>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{prestamo.usuario_nombre}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{prestamo.usuario_email}</div>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {format(new Date(prestamo.fecha_prestamo), 'dd/MM/yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {format(new Date(prestamo.fecha_devolucion_prevista), 'dd/MM/yyyy')}
                    {prestamo.fecha_devolucion_real && (
                      <div className="text-xs text-green-600 dark:text-green-400">
                        Devuelto: {format(new Date(prestamo.fecha_devolucion_real), 'dd/MM/yyyy')}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      prestamo.estado === 'activo' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                      prestamo.estado === 'devuelto' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                      'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                    }`}>
                      {prestamo.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {prestamos.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No se encontraron préstamos con los filtros seleccionados
        </div>
      )}
    </div>
  );
};

export default Informes;

