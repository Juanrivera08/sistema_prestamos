import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import QRCodeModal from '../components/QRCodeModal';
import QRScanner from '../components/QRScanner';
import ConfirmModal from '../components/ConfirmModal';
import { API_ENDPOINTS } from '../config/api';

// Función helper para obtener la URL de la imagen
const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  // Si ya es una URL completa, retornarla
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  // Construir URL usando la base URL del backend
  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  return `${backendUrl}${imagePath}`;
};

const Recursos = () => {
  const { isAdmin, isTrabajador, isEstudiante } = useAuth();
  const [recursos, setRecursos] = useState([]);
  const [recursosAgrupados, setRecursosAgrupados] = useState([]);
  const [vistaAgrupada, setVistaAgrupada] = useState(true);
  const [categoriasExpandidas, setCategoriasExpandidas] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showDetallesModal, setShowDetallesModal] = useState(false);
  const [recursoDetalle, setRecursoDetalle] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [editingRecurso, setEditingRecurso] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [mostrarEliminados, setMostrarEliminados] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [mostrarNuevaCategoria, setMostrarNuevaCategoria] = useState(false);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deletingResourceId, setDeletingResourceId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    categoria: '',
    descripcion: '',
    estado: 'disponible',
    ubicacion: '',
    imagen: null
  });

  useEffect(() => {
    // Si es estudiante y no hay filtro, mostrar solo disponibles
    if (isEstudiante && !filtroEstado) {
      setFiltroEstado('disponible');
    }
    fetchRecursos();
  }, [busqueda, filtroEstado, vistaAgrupada, isEstudiante, mostrarEliminados]);

  const fetchCategorias = async () => {
    try {
      const response = await axios.get('/api/recursos/categorias');
      setCategorias(response.data);
    } catch (error) {
      console.error('Error al obtener categorías:', error);
    }
  };

  const fetchRecursos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtroEstado) params.append('estado', filtroEstado);
      if (busqueda) params.append('busqueda', busqueda);
      if (mostrarEliminados) params.append('incluir_eliminados', 'true');

      if (vistaAgrupada) {
        params.append('agrupado', 'true');
        const response = await axios.get(`/api/recursos?${params}`);
        setRecursosAgrupados(response.data);
        // Expandir todas las categorías por defecto
        const expandidas = {};
        response.data.forEach(grupo => {
          expandidas[grupo.categoria] = true;
        });
        setCategoriasExpandidas(expandidas);
      } else {
        const response = await axios.get(`/api/recursos?${params}`);
        setRecursos(response.data);
      }
    } catch (error) {
      console.error('Error al obtener recursos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        if (key !== 'imagen' && formData[key]) {
          formDataToSend.append(key, formData[key]);
        }
      });
      if (formData.imagen) {
        formDataToSend.append('imagen', formData.imagen);
      }

      if (editingRecurso) {
        await axios.put(`/api/recursos/${editingRecurso.id}`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await axios.post('/api/recursos', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      setShowModal(false);
      resetForm();
      fetchRecursos();
      fetchCategorias(); // Actualizar categorías después de guardar
    } catch (error) {
      console.error('Error al guardar recurso:', error);
      console.error('Respuesta del servidor:', error.response?.data);
      let errorMessage = error.response?.data?.message || error.response?.data?.error?.message || 'Error al guardar recurso';
      
      // Si hay información de debug, mostrarla
      if (error.response?.data?.debug) {
        const debug = error.response.data.debug;
        console.log('Información de depuración:', debug);
        if (debug.recursosActivos > 0) {
          errorMessage += `\n\nHay ${debug.recursosActivos} recurso(s) activo(s) con ese código.`;
          if (debug.detalles) {
            errorMessage += `\nDetalles: ${JSON.stringify(debug.detalles, null, 2)}`;
          }
        }
      }
      
      alert(errorMessage);
    }
  };

  const handleDelete = (id) => {
    setDeletingResourceId(id);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingResourceId) return;
    setIsDeleting(true);
    try {
      await axios.delete(API_ENDPOINTS.RECURSOS.DELETE(deletingResourceId));
      await fetchRecursos();
      setShowConfirmModal(false);
      setDeletingResourceId(null);
    } catch (error) {
      console.error('Error al eliminar:', error);
      alert(error.response?.data?.message || 'Error al eliminar recurso');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestaurar = async (id) => {
    if (!window.confirm('¿Restaurar este recurso eliminado?')) return;

    try {
      await axios.put(`/api/recursos/${id}/restaurar`);
      fetchRecursos();
      alert('Recurso restaurado exitosamente');
    } catch (error) {
      alert(error.response?.data?.message || 'Error al restaurar recurso');
    }
  };

  const handleEdit = (recurso) => {
    setEditingRecurso(recurso);
    setFormData({
      codigo: recurso.codigo,
      nombre: recurso.nombre,
      categoria: recurso.categoria || '',
      descripcion: recurso.descripcion || '',
      estado: recurso.estado,
      ubicacion: recurso.ubicacion || '',
      imagen: null
    });
    setMostrarNuevaCategoria(false);
    setNuevaCategoria('');
    fetchCategorias();
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      codigo: '',
      nombre: '',
      categoria: '',
      descripcion: '',
      estado: 'disponible',
      ubicacion: '',
      imagen: null
    });
    setEditingRecurso(null);
    setMostrarNuevaCategoria(false);
    setNuevaCategoria('');
    fetchCategorias();
  };

  const toggleCategoria = (categoria) => {
    setCategoriasExpandidas(prev => ({
      ...prev,
      [categoria]: !prev[categoria]
    }));
  };

  const getEstadoColor = (estado) => {
    const colors = {
      disponible: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      prestado: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
      mantenimiento: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
    };
    return colors[estado] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
  };

  const handleShowQR = (recurso) => {
    // Crear datos para el QR
    const data = {
      tipo: 'recurso',
      id: recurso.id,
      codigo: recurso.codigo,
      nombre: recurso.nombre,
      estado: recurso.estado,
      descripcion: recurso.descripcion || '',
      ubicacion: recurso.ubicacion || '',
      url: `${window.location.origin}/recursos?codigo=${recurso.codigo}`
    };
    setQrData(data);
    setShowQRModal(true);
  };

  const handleVerDetalles = (recurso) => {
    setRecursoDetalle(recurso);
    setShowDetallesModal(true);
  };

  const handleQRScan = (scannedData) => {
    setShowScanner(false);
    
    // Si es un objeto con tipo 'recurso', buscar por código
    if (scannedData && typeof scannedData === 'object' && scannedData.tipo === 'recurso') {
      if (scannedData.codigo) {
        setBusqueda(scannedData.codigo);
      }
    } else if (typeof scannedData === 'string') {
      // Si es un string, intentar buscar
      setBusqueda(scannedData);
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Recursos Tecnológicos</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setVistaAgrupada(!vistaAgrupada)}
            className="bg-gray-600 dark:bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors flex items-center space-x-2"
          >
            <span>{vistaAgrupada ? '📋' : '📦'}</span>
            <span>{vistaAgrupada ? 'Vista Individual' : 'Vista Agrupada'}</span>
          </button>
        {isTrabajador && !isEstudiante && (
          <button
            onClick={() => {
              resetForm();
              fetchCategorias();
              setShowModal(true);
            }}
            className="bg-primary-600 dark:bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
          >
            + Nuevo Recurso
          </button>
        )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6 transition-colors">
        {isEstudiante && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              ℹ️ Como estudiante, puedes ver los recursos disponibles. Para solicitar un préstamo, contacta con un trabajador o administrador.
            </p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Buscar por nombre, código o descripción..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 md:col-span-2"
          />
          <button
            onClick={() => setShowScanner(true)}
            className="bg-gray-600 dark:bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors flex items-center justify-center space-x-2"
            title="Escanear código QR"
          >
            <span>📷</span>
            <span>Escanear QR</span>
          </button>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2"
            disabled={isEstudiante}
          >
            <option value="">Todos los estados</option>
            <option value="disponible">Disponible</option>
            {!isEstudiante && (
              <>
                <option value="prestado">Prestado</option>
                <option value="mantenimiento">Mantenimiento</option>
              </>
            )}
          </select>
        </div>
        {isTrabajador && !isEstudiante && (
          <div className="mt-4 flex items-center">
            <input
              type="checkbox"
              id="mostrarEliminados"
              checked={mostrarEliminados}
              onChange={(e) => setMostrarEliminados(e.target.checked)}
              className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="mostrarEliminados" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Mostrar recursos eliminados
            </label>
          </div>
        )}
      </div>

      {/* Lista de recursos */}
      {vistaAgrupada ? (
        // Vista Agrupada por Categoría
        <div className="space-y-4">
          {recursosAgrupados.map((grupo) => (
            <div key={grupo.categoria} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden transition-colors">
              {/* Encabezado de categoría */}
              <div 
                className="p-4 bg-gray-100 dark:bg-gray-700 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                onClick={() => toggleCategoria(grupo.categoria)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <span className="text-2xl">{categoriasExpandidas[grupo.categoria] ? '▼' : '▶'}</span>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {grupo.categoria}
                    </h2>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full">
                      Total: {grupo.total}
                    </span>
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
                      Disponibles: {grupo.disponibles}
                    </span>
                    <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full">
                      Prestados: {grupo.prestados}
                    </span>
                    {grupo.mantenimiento > 0 && (
                      <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded-full">
                        Mantenimiento: {grupo.mantenimiento}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Recursos de la categoría */}
              {categoriasExpandidas[grupo.categoria] && (
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {grupo.recursos.map((recurso) => (
                      <div key={recurso.id} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        {recurso.imagen && (
                          <img
                            src={getImageUrl(recurso.imagen)}
                            alt={recurso.nombre}
                            className="w-full h-32 object-cover rounded mb-2"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        )}
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {recurso.nombre}
                            {recurso.deleted_at && (
                              <span className="ml-2 text-xs text-red-600 dark:text-red-400">(Eliminado)</span>
                            )}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(recurso.estado)}`}>
                            {recurso.estado}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Código: {recurso.codigo}</p>
                        {recurso.descripcion && (
                          <p className="text-xs text-gray-700 dark:text-gray-300 mb-2 line-clamp-2">{recurso.descripcion}</p>
                        )}
                        <div className="mt-3 flex space-x-2">
                          <button
                            onClick={() => handleVerDetalles(recurso)}
                            className="flex-1 bg-blue-600 dark:bg-blue-700 text-white px-3 py-1.5 rounded text-xs hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                            title="Ver detalles"
                          >
                            👁️ Detalles
                          </button>
                          <Link
                            to={`/historial/recurso/${recurso.id}`}
                            className="flex-1 bg-purple-600 dark:bg-purple-700 text-white px-3 py-1.5 rounded text-xs hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors text-center"
                            title="Ver historial"
                          >
                            📜 Historial
                          </Link>
                          <button
                            onClick={() => handleShowQR(recurso)}
                            className="flex-1 bg-gray-600 dark:bg-gray-700 text-white px-3 py-1.5 rounded text-xs hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                            title="Ver código QR"
                          >
                            📱 QR
                          </button>
                          {isTrabajador && !isEstudiante && (
                            <>
                              {recurso.deleted_at ? (
                                <button
                                  onClick={() => handleRestaurar(recurso.id)}
                                  className="flex-1 bg-green-600 dark:bg-green-700 text-white px-3 py-1.5 rounded text-xs hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
                                  title="Restaurar recurso eliminado"
                                >
                                  🔄 Restaurar
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEdit(recurso)}
                                    className="flex-1 bg-primary-600 dark:bg-primary-500 text-white px-3 py-1.5 rounded text-xs hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    onClick={() => handleDelete(recurso.id)}
                                    className="flex-1 bg-red-600 dark:bg-red-700 text-white px-3 py-1.5 rounded text-xs hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
                                  >
                                    Eliminar
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {grupo.recursos.length === 0 && (
                    <p className="text-center py-4 text-gray-500 dark:text-gray-400">
                      No hay recursos en esta categoría
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
          {recursosAgrupados.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No se encontraron recursos
            </div>
          )}
        </div>
      ) : (
        // Vista Individual
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recursos.map((recurso) => (
            <div key={recurso.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden transition-colors">
              {recurso.imagen && (
                <img
                  src={getImageUrl(recurso.imagen)}
                  alt={recurso.nombre}
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              )}
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {recurso.nombre}
                    {recurso.deleted_at && (
                      <span className="ml-2 text-xs text-red-600 dark:text-red-400">(Eliminado)</span>
                    )}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(recurso.estado)}`}>
                    {recurso.estado}
                  </span>
                </div>
                {recurso.categoria && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    📁 {recurso.categoria}
                  </p>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Código: {recurso.codigo}</p>
                {recurso.descripcion && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{recurso.descripcion}</p>
                )}
                {recurso.ubicacion && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">📍 {recurso.ubicacion}</p>
                )}
                
                {/* Botones de acción */}
                <div className="mt-3 mb-3 flex space-x-2">
                  <button
                    onClick={() => handleVerDetalles(recurso)}
                    className="flex-1 bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
                    title="Ver detalles"
                  >
                    <span>👁️</span>
                    <span>Ver Detalles</span>
                  </button>
                  <Link
                    to={`/historial/recurso/${recurso.id}`}
                    className="flex-1 bg-purple-600 dark:bg-purple-700 text-white px-4 py-2 rounded hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors flex items-center justify-center space-x-2"
                    title="Ver historial"
                  >
                    <span>📜</span>
                    <span>Historial</span>
                  </Link>
                  <button
                    onClick={() => handleShowQR(recurso)}
                    className="flex-1 bg-gray-600 dark:bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors flex items-center justify-center space-x-2"
                    title="Ver código QR"
                  >
                    <span>📱</span>
                    <span>QR</span>
                  </button>
                </div>

                {isTrabajador && !isEstudiante && (
                  <div className="mt-2 flex space-x-2">
                    {recurso.deleted_at ? (
                      <button
                        onClick={() => handleRestaurar(recurso.id)}
                        className="flex-1 bg-green-600 dark:bg-green-700 text-white px-4 py-2 rounded hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
                        title="Restaurar recurso eliminado"
                      >
                        🔄 Restaurar
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEdit(recurso)}
                          className="flex-1 bg-primary-600 dark:bg-primary-500 text-white px-4 py-2 rounded hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(recurso.id)}
                          className="flex-1 bg-red-600 dark:bg-red-700 text-white px-4 py-2 rounded hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
                        >
                          Eliminar
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {recursos.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No se encontraron recursos
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 transition-colors">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              {editingRecurso ? 'Editar Recurso' : 'Nuevo Recurso'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Código *</label>
                  <input
                    type="text"
                    required
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre *</label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Categoría</label>
                  {!mostrarNuevaCategoria ? (
                    <>
                      <select
                        value={formData.categoria}
                        onChange={(e) => {
                          if (e.target.value === '__nueva__') {
                            setMostrarNuevaCategoria(true);
                            setNuevaCategoria('');
                          } else {
                            setFormData({ ...formData, categoria: e.target.value });
                          }
                        }}
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2"
                      >
                        <option value="">Seleccionar categoría (opcional)</option>
                        {categorias.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                        <option value="__nueva__">+ Crear nueva categoría</option>
                      </select>
                      {formData.categoria && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Categoría seleccionada: <strong>{formData.categoria}</strong>
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="mt-1 space-y-2">
                      <input
                        type="text"
                        value={nuevaCategoria}
                        onChange={(e) => setNuevaCategoria(e.target.value)}
                        placeholder="Nombre de la nueva categoría..."
                        className="block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2"
                        autoFocus
                      />
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (nuevaCategoria.trim()) {
                              setFormData({ ...formData, categoria: nuevaCategoria.trim() });
                              setCategorias([...categorias, nuevaCategoria.trim()].sort());
                            }
                            setMostrarNuevaCategoria(false);
                            setNuevaCategoria('');
                          }}
                          className="flex-1 bg-green-600 dark:bg-green-700 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
                        >
                          Usar esta categoría
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMostrarNuevaCategoria(false);
                            setNuevaCategoria('');
                            if (!formData.categoria) {
                              setFormData({ ...formData, categoria: '' });
                            }
                          }}
                          className="flex-1 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-white px-3 py-1.5 rounded text-sm hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción</label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Estado</label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2"
                  >
                    <option value="disponible">Disponible</option>
                    <option value="prestado">Prestado</option>
                    <option value="mantenimiento">Mantenimiento</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Ubicación</label>
                  <input
                    type="text"
                    value={formData.ubicacion}
                    onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Imagen</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFormData({ ...formData, imagen: e.target.files[0] })}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2"
                  />
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

      {/* Modal QR */}
      <QRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        data={qrData}
        title="Código QR del Recurso"
      />

      {/* Scanner QR */}
      <QRScanner
        isOpen={showScanner}
        onScan={handleQRScan}
        onClose={() => setShowScanner(false)}
      />

      {/* Modal de Detalles */}
      {showDetallesModal && recursoDetalle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto transition-colors">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Detalles del Recurso</h2>
              <button
                onClick={() => {
                  setShowDetallesModal(false);
                  setRecursoDetalle(null);
                }}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {recursoDetalle.imagen && (
                <div>
                  <img
                    src={getImageUrl(recursoDetalle.imagen)}
                    alt={recursoDetalle.nombre}
                    className="w-full h-64 object-cover rounded-lg"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                  <p className="text-gray-900 dark:text-white font-semibold">{recursoDetalle.nombre}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Código</label>
                  <p className="text-gray-900 dark:text-white">{recursoDetalle.codigo}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoría</label>
                  <p className="text-gray-900 dark:text-white">
                    {recursoDetalle.categoria || <span className="text-gray-400 italic">Sin categoría</span>}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEstadoColor(recursoDetalle.estado)}`}>
                    {recursoDetalle.estado}
                  </span>
                </div>

                {recursoDetalle.ubicacion && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ubicación</label>
                    <p className="text-gray-900 dark:text-white">📍 {recursoDetalle.ubicacion}</p>
                  </div>
                )}

                {recursoDetalle.descripcion && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{recursoDetalle.descripcion}</p>
                  </div>
                )}
              </div>

              <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => handleShowQR(recursoDetalle)}
                  className="flex-1 bg-gray-600 dark:bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors flex items-center justify-center space-x-2"
                >
                  <span>📱</span>
                  <span>Ver Código QR</span>
                </button>
                {isTrabajador && !isEstudiante && (
                  <>
                    <button
                      onClick={() => {
                        setShowDetallesModal(false);
                        handleEdit(recursoDetalle);
                      }}
                      className="flex-1 bg-primary-600 dark:bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        setShowDetallesModal(false);
                        handleDelete(recursoDetalle.id);
                      }}
                      className="flex-1 bg-red-600 dark:bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
                    >
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Eliminar */}
      <ConfirmModal
        isOpen={showConfirmModal}
        title="Eliminar Recurso"
        message="¿Estás seguro de que deseas eliminar este recurso? Esta acción no se puede deshacer, pero el recurso podrá ser restaurado desde la sección de eliminados."
        confirmText="Eliminar"
        cancelText="Cancelar"
        isDangerous={true}
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowConfirmModal(false);
          setDeletingResourceId(null);
        }}
      />
    </div>
  );
};

export default Recursos;

