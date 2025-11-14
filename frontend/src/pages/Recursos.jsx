import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Recursos = () => {
  const { isAdmin } = useAuth();
  const [recursos, setRecursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRecurso, setEditingRecurso] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    estado: 'disponible',
    ubicacion: '',
    imagen: null
  });

  useEffect(() => {
    fetchRecursos();
  }, [busqueda, filtroEstado]);

  const fetchRecursos = async () => {
    try {
      const params = new URLSearchParams();
      if (filtroEstado) params.append('estado', filtroEstado);
      if (busqueda) params.append('busqueda', busqueda);

      const response = await axios.get(`/api/recursos?${params}`);
      setRecursos(response.data);
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
    } catch (error) {
      alert(error.response?.data?.message || 'Error al guardar recurso');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este recurso?')) return;

    try {
      await axios.delete(`/api/recursos/${id}`);
      fetchRecursos();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al eliminar recurso');
    }
  };

  const handleEdit = (recurso) => {
    setEditingRecurso(recurso);
    setFormData({
      codigo: recurso.codigo,
      nombre: recurso.nombre,
      descripcion: recurso.descripcion || '',
      estado: recurso.estado,
      ubicacion: recurso.ubicacion || '',
      imagen: null
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      codigo: '',
      nombre: '',
      descripcion: '',
      estado: 'disponible',
      ubicacion: '',
      imagen: null
    });
    setEditingRecurso(null);
  };

  const getEstadoColor = (estado) => {
    const colors = {
      disponible: 'bg-green-100 text-green-800',
      prestado: 'bg-blue-100 text-blue-800',
      mantenimiento: 'bg-yellow-100 text-yellow-800'
    };
    return colors[estado] || 'bg-gray-100 text-gray-800';
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
        <h1 className="text-3xl font-bold text-gray-900">Recursos Tecnológicos</h1>
        {isAdmin && (
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            + Nuevo Recurso
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Buscar por nombre, código o descripción..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2"
          />
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2"
          >
            <option value="">Todos los estados</option>
            <option value="disponible">Disponible</option>
            <option value="prestado">Prestado</option>
            <option value="mantenimiento">Mantenimiento</option>
          </select>
        </div>
      </div>

      {/* Lista de recursos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recursos.map((recurso) => (
          <div key={recurso.id} className="bg-white rounded-lg shadow overflow-hidden">
            {recurso.imagen && (
              <img
                src={`http://localhost:5000${recurso.imagen}`}
                alt={recurso.nombre}
                className="w-full h-48 object-cover"
              />
            )}
            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-semibold text-gray-900">{recurso.nombre}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(recurso.estado)}`}>
                  {recurso.estado}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">Código: {recurso.codigo}</p>
              {recurso.descripcion && (
                <p className="text-sm text-gray-700 mb-2">{recurso.descripcion}</p>
              )}
              {recurso.ubicacion && (
                <p className="text-sm text-gray-500">📍 {recurso.ubicacion}</p>
              )}
              {isAdmin && (
                <div className="mt-4 flex space-x-2">
                  <button
                    onClick={() => handleEdit(recurso)}
                    className="flex-1 bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(recurso.id)}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {recursos.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No se encontraron recursos
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">
              {editingRecurso ? 'Editar Recurso' : 'Nuevo Recurso'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Código *</label>
                  <input
                    type="text"
                    required
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nombre *</label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Descripción</label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Estado</label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="disponible">Disponible</option>
                    <option value="prestado">Prestado</option>
                    <option value="mantenimiento">Mantenimiento</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ubicación</label>
                  <input
                    type="text"
                    value={formData.ubicacion}
                    onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Imagen</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFormData({ ...formData, imagen: e.target.files[0] })}
                    className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div className="mt-6 flex space-x-4">
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                >
                  Guardar
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
    </div>
  );
};

export default Recursos;

