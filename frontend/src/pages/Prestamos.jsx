import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import QRCodeModal from '../components/QRCodeModal';

const Prestamos = () => {
  const { user, isAdmin, isTrabajador } = useAuth();
  const [prestamos, setPrestamos] = useState([]);
  const [recursos, setRecursos] = useState([]);
  const [recursosAgrupados, setRecursosAgrupados] = useState([]);
  const [categoriasExpandidas, setCategoriasExpandidas] = useState({});
  const [selectorRecursoAbierto, setSelectorRecursoAbierto] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [busquedaUsuario, setBusquedaUsuario] = useState('');
  const [usuariosFiltrados, setUsuariosFiltrados] = useState([]);
  const [selectorUsuarioAbierto, setSelectorUsuarioAbierto] = useState(false);
  const [codigoCarnetInput, setCodigoCarnetInput] = useState('');
  const [showCarnetInput, setShowCarnetInput] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDevolucionModal, setShowDevolucionModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQrData] = useState(null);
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
    recursos_ids: [],
    fecha_prestamo: new Date().toISOString().split('T')[0],
    fecha_devolucion_prevista: '',
    observaciones: ''
  });

  useEffect(() => {
    fetchPrestamos();
    fetchRecursos();
    if (isTrabajador) {
      fetchUsuarios();
    }
  }, [isTrabajador, filtros]);

  // Filtrar usuarios según búsqueda
  useEffect(() => {
    if (busquedaUsuario.trim() === '') {
      setUsuariosFiltrados(usuarios);
    } else {
      const filtrados = usuarios.filter(u => 
        u.nombre_completo.toLowerCase().includes(busquedaUsuario.toLowerCase()) ||
        u.email.toLowerCase().includes(busquedaUsuario.toLowerCase()) ||
        u.codigo.toLowerCase().includes(busquedaUsuario.toLowerCase())
      );
      setUsuariosFiltrados(filtrados);
    }
  }, [busquedaUsuario, usuarios]);

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
      // Obtener recursos agrupados para el selector
      const responseAgrupados = await axios.get('/api/recursos?estado=disponible&agrupado=true');
      setRecursosAgrupados(responseAgrupados.data);
      
      // Inicialmente todas las categorías colapsadas
      const expandidas = {};
      responseAgrupados.data.forEach(grupo => {
        expandidas[grupo.categoria] = false;
      });
      setCategoriasExpandidas(expandidas);
      
      // También obtener lista plana para compatibilidad
      const response = await axios.get('/api/recursos?estado=disponible');
      setRecursos(response.data);
    } catch (error) {
      console.error('Error al obtener recursos:', error);
    }
  };

  const toggleCategoria = (categoria) => {
    setCategoriasExpandidas(prev => ({
      ...prev,
      [categoria]: !prev[categoria]
    }));
  };

  const handleSelectRecurso = (recursoId) => {
    const recursosActuales = formData.recursos_ids || [];
    if (recursosActuales.includes(recursoId)) {
      // Si ya está seleccionado, quitarlo
      setFormData({ 
        ...formData, 
        recursos_ids: recursosActuales.filter(id => id !== recursoId) 
      });
    } else {
      // Agregar el recurso
      setFormData({ 
        ...formData, 
        recursos_ids: [...recursosActuales, recursoId] 
      });
    }
  };

  const handleRemoveRecurso = (recursoId) => {
    setFormData({ 
      ...formData, 
      recursos_ids: formData.recursos_ids.filter(id => id !== recursoId) 
    });
  };

  const abrirSelectorRecurso = () => {
    setSelectorRecursoAbierto(true);
  };

  const handleCarnetInputChange = (e) => {
    const valor = e.target.value;
    setCodigoCarnetInput(valor);
  };

  const handleCarnetInputKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const codigo = codigoCarnetInput.replace(/\r|\n|\t/g, '').trim();
      
      if (!codigo) {
        alert('No se pudo leer el código del carnet');
        return;
      }

      try {
        // Buscar o crear usuario por código
        const response = await axios.post('/api/usuarios/buscar-por-codigo', { codigo });
        
        if (response.data.usuario) {
          // Seleccionar el usuario encontrado/creado
          setFormData({ ...formData, usuario_id: response.data.usuario.id });
          setShowCarnetInput(false);
          setCodigoCarnetInput('');
          
          // Si fue creado automáticamente, mostrar mensaje y actualizar lista
          if (response.data.creado) {
            alert(`Usuario creado automáticamente con código ${codigo}. Por favor, actualiza el nombre y email en la sección de Usuarios si es necesario.`);
            fetchUsuarios(); // Actualizar lista de usuarios
          }
        }
      } catch (error) {
        console.error('Error al buscar/crear usuario:', error);
        alert(error.response?.data?.message || 'Error al procesar el carnet escaneado');
      }
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
    
    if (!formData.recursos_ids || formData.recursos_ids.length === 0) {
      alert('Por favor, selecciona al menos un recurso');
      return;
    }

    try {
      const dataToSend = {
        usuario_id: formData.usuario_id,
        recursos_ids: formData.recursos_ids,
        fecha_prestamo: formData.fecha_prestamo,
        fecha_devolucion_prevista: formData.fecha_devolucion_prevista,
        observaciones: formData.observaciones
      };

      const response = await axios.post('/api/prestamos', dataToSend);
      
      setShowModal(false);
      resetForm();
      fetchPrestamos();
      fetchRecursos();
      
      // Mostrar mensaje de éxito
      if (response.data.prestamos && response.data.prestamos.length > 1) {
        alert(`¡${response.data.prestamos.length} préstamos creados exitosamente!`);
      } else {
        alert('Préstamo creado exitosamente');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Error al crear préstamo(s)');
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
      recursos_ids: [],
      fecha_prestamo: new Date().toISOString().split('T')[0],
      fecha_devolucion_prevista: '',
      observaciones: ''
    });
    setSelectorRecursoAbierto(false);
    setSelectorUsuarioAbierto(false);
    setBusquedaUsuario('');
    setShowCarnetInput(false);
    setCodigoCarnetInput('');
  };

  const getEstadoColor = (estado) => {
    const colors = {
      activo: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
      devuelto: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      vencido: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
    };
    return colors[estado] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
  };

  const isVencido = (fecha) => {
    return new Date(fecha) < new Date() && fecha;
  };

  const handleShowQR = (prestamo) => {
    // Buscar información del recurso y usuario
    const recurso = recursos.find(r => r.id === prestamo.recurso_id);
    const usuario = usuarios.find(u => u.id === prestamo.usuario_id);
    
    const data = {
      tipo: 'prestamo',
      id: prestamo.id,
      codigo_prestamo: `PREST-${prestamo.id}`,
      recurso: recurso ? recurso.nombre : 'N/A',
      recurso_codigo: recurso ? recurso.codigo : 'N/A',
      usuario: usuario ? usuario.nombre_completo : 'N/A',
      fecha_prestamo: prestamo.fecha_prestamo,
      fecha_devolucion_prevista: prestamo.fecha_devolucion_prevista,
      estado: prestamo.estado,
      url: `${window.location.origin}/prestamos?id=${prestamo.id}`
    };
    setQrData(data);
    setShowQRModal(true);
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Préstamos</h1>
        <button
          onClick={() => {
            resetForm();
            setFormData(prev => ({ ...prev, usuario_id: isTrabajador ? '' : user.id }));
            fetchRecursos(); // Recargar recursos al abrir el modal
            setShowModal(true);
          }}
          className="bg-primary-600 dark:bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
        >
          + Nuevo Préstamo
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6 transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {isTrabajador && (
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
          <button
            onClick={() => setFiltros({
              estado: '',
              usuario_id: '',
              recurso_id: '',
              fecha_inicio: '',
              fecha_fin: ''
            })}
            className="bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-white px-4 py-2 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Lista de préstamos */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden transition-colors">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Recurso
              </th>
              {isTrabajador && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Usuario
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Trabajador
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Fecha Préstamo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Fecha Devolución
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {prestamos.map((prestamo) => (
              <tr key={prestamo.id} className={isVencido(prestamo.fecha_devolucion_prevista) && prestamo.estado === 'activo' ? 'bg-red-50 dark:bg-red-900/20' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{prestamo.recurso_nombre}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{prestamo.recurso_codigo}</div>
                </td>
                {isTrabajador && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">{prestamo.usuario_nombre}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{prestamo.usuario_email}</div>
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {prestamo.trabajador_nombre || 'N/A'}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {prestamo.trabajador_email || ''}
                  </div>
                </td>
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
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoColor(prestamo.estado)}`}>
                    {prestamo.estado}
                  </span>
                  {isVencido(prestamo.fecha_devolucion_prevista) && prestamo.estado === 'activo' && (
                    <div className="text-xs text-red-600 dark:text-red-400 mt-1">⚠️ Vencido</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleShowQR(prestamo)}
                    className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mr-4 transition-colors"
                    title="Ver código QR"
                  >
                    📱 QR
                  </button>
                  {prestamo.estado === 'activo' && (
                    <button
                      onClick={() => {
                        setSelectedPrestamo(prestamo);
                        setFormData({ observaciones: '' });
                        setShowDevolucionModal(true);
                      }}
                      className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 transition-colors"
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
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No se encontraron préstamos
        </div>
      )}

      {/* Modal nuevo préstamo */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto transition-colors">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Nuevo Préstamo</h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                {isTrabajador && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Usuario *
                    </label>
                    
                    {!formData.usuario_id ? (
                      <div className="space-y-2">
                        <div className="space-y-2">
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectorUsuarioAbierto(true);
                                setShowCarnetInput(false);
                              }}
                              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-between"
                            >
                              <span>Buscar usuario</span>
                              <span className="text-gray-400">🔍</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowCarnetInput(true);
                                setSelectorUsuarioAbierto(false);
                                // Enfocar el input después de un pequeño delay para que el DOM se actualice
                                setTimeout(() => {
                                  const input = document.getElementById('carnet-input');
                                  if (input) input.focus();
                                }, 100);
                              }}
                              className="px-4 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center space-x-2"
                              title="Escanear carnet del estudiante"
                            >
                              <span>📇</span>
                              <span className="hidden sm:inline">Escanear Carnet</span>
                            </button>
                          </div>
                          
                          {showCarnetInput && (
                            <div className="border-2 border-blue-300 dark:border-blue-600 rounded-lg p-3 bg-blue-50 dark:bg-blue-900/20">
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Pase la tarjeta por el escáner
                              </label>
                              <input
                                id="carnet-input"
                                type="text"
                                value={codigoCarnetInput}
                                onChange={handleCarnetInputChange}
                                onKeyDown={handleCarnetInputKeyDown}
                                placeholder="El código se leerá automáticamente..."
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                              />
                              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                                Pase la tarjeta del estudiante por el escáner físico
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowCarnetInput(false);
                                  setCodigoCarnetInput('');
                                }}
                                className="mt-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                              >
                                Cancelar
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {selectorUsuarioAbierto && (
                          <div className="border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 shadow-lg">
                            <div className="p-2 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Buscar usuario</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectorUsuarioAbierto(false);
                                  setBusquedaUsuario('');
                                }}
                                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm"
                              >
                                ✕ Cerrar
                              </button>
                            </div>
                            <div className="p-2">
                              <input
                                type="text"
                                placeholder="Buscar por nombre, email o código..."
                                value={busquedaUsuario}
                                onChange={(e) => setBusquedaUsuario(e.target.value)}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-800 dark:text-white mb-2"
                                autoFocus
                              />
                              <div className="max-h-60 overflow-y-auto">
                                {usuariosFiltrados.length === 0 ? (
                                  <p className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                                    {busquedaUsuario ? 'No se encontraron usuarios' : 'Escribe para buscar...'}
                                  </p>
                                ) : (
                                  usuariosFiltrados.map(u => (
                                    <div
                                      key={u.id}
                                      onClick={() => {
                                        setFormData({ ...formData, usuario_id: u.id });
                                        setSelectorUsuarioAbierto(false);
                                        setBusquedaUsuario('');
                                      }}
                                      className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                                        formData.usuario_id == u.id
                                          ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-500 dark:border-primary-500'
                                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                      }`}
                                    >
                                      <div className="font-medium text-gray-900 dark:text-white">
                                        {u.nombre_completo}
                                      </div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {u.email} • Código: {u.codigo}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-primary-900 dark:text-primary-100">
                              {usuarios.find(u => u.id == formData.usuario_id)?.nombre_completo}
                            </div>
                            <div className="text-xs text-primary-700 dark:text-primary-300">
                              {usuarios.find(u => u.id == formData.usuario_id)?.email} • 
                              Código: {usuarios.find(u => u.id == formData.usuario_id)?.codigo}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, usuario_id: '' });
                              setSelectorUsuarioAbierto(true);
                            }}
                            className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200 px-2 py-1"
                          >
                            Cambiar
                          </button>
                        </div>
                      </div>
                    )}
                    <input type="hidden" value={formData.usuario_id} required />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Recursos * (Puedes seleccionar múltiples)
                  </label>
                  
                  {/* Mostrar recursos seleccionados */}
                  {formData.recursos_ids && formData.recursos_ids.length > 0 && (
                    <div className="mb-2 space-y-2">
                      {formData.recursos_ids.map(recursoId => {
                        const recurso = recursos.find(r => r.id == recursoId);
                        if (!recurso) return null;
                        return (
                          <div key={recursoId} className="p-2 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg flex justify-between items-center">
                            <div>
                              <div className="font-medium text-primary-900 dark:text-primary-100 text-sm">
                                {recurso.nombre}
                              </div>
                              <div className="text-xs text-primary-700 dark:text-primary-300">
                                Código: {recurso.codigo}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveRecurso(recursoId)}
                              className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 px-2 py-1"
                            >
                              ✕ Quitar
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Botón para abrir selector */}
                  <button
                    type="button"
                    onClick={abrirSelectorRecurso}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-between"
                  >
                    <span>
                      {formData.recursos_ids && formData.recursos_ids.length > 0
                        ? `Agregar más recursos (${formData.recursos_ids.length} seleccionado${formData.recursos_ids.length > 1 ? 's' : ''})`
                        : 'Seleccionar recursos'}
                    </span>
                    <span className="text-gray-400">▼</span>
                  </button>
                  
                  {/* Selector de recursos agrupados (desplegable) */}
                  {selectorRecursoAbierto && (
                    <div className="mt-2 border border-gray-300 dark:border-gray-600 rounded-lg max-h-96 overflow-y-auto bg-white dark:bg-gray-700 shadow-lg">
                      <div className="p-2 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Selecciona recursos (múltiples)
                          </span>
                          {formData.recursos_ids && formData.recursos_ids.length > 0 && (
                            <span className="text-xs px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 rounded-full">
                              {formData.recursos_ids.length} seleccionado{formData.recursos_ids.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectorRecursoAbierto(false)}
                          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm"
                        >
                          ✕ Cerrar
                        </button>
                      </div>
                    {recursosAgrupados.map((grupo) => (
                      <div key={grupo.categoria} className="border-b border-gray-200 dark:border-gray-600 last:border-b-0">
                        {/* Encabezado de categoría */}
                        <div
                          className="p-3 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex justify-between items-center"
                          onClick={() => toggleCategoria(grupo.categoria)}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{categoriasExpandidas[grupo.categoria] ? '▼' : '▶'}</span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {grupo.categoria}
                            </span>
                          </div>
                          <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
                            {grupo.disponibles} disponible{grupo.disponibles !== 1 ? 's' : ''}
                          </span>
                        </div>

                        {/* Recursos de la categoría */}
                        {categoriasExpandidas[grupo.categoria] && (
                          <div className="p-2 space-y-1">
                            {grupo.recursos.length === 0 ? (
                              <p className="text-xs text-gray-500 dark:text-gray-400 p-2 text-center">
                                No hay recursos disponibles en esta categoría
                              </p>
                            ) : (
                              grupo.recursos.map((recurso) => (
                                <div
                                  key={recurso.id}
                                  onClick={() => handleSelectRecurso(recurso.id)}
                                  className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                                    formData.recursos_ids && formData.recursos_ids.includes(recurso.id)
                                      ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-500 dark:border-primary-500'
                                      : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                                  }`}
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex items-start space-x-2 flex-1">
                                      <input
                                        type="checkbox"
                                        checked={formData.recursos_ids && formData.recursos_ids.includes(recurso.id)}
                                        onChange={() => handleSelectRecurso(recurso.id)}
                                        className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                      <div className="flex-1">
                                        <div className="font-medium text-gray-900 dark:text-white">
                                          {recurso.nombre}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                          Código: {recurso.codigo}
                                        </div>
                                        {recurso.descripcion && (
                                          <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-1">
                                            {recurso.descripcion}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    {formData.recursos_ids && formData.recursos_ids.includes(recurso.id) && (
                                      <span className="ml-2 text-primary-600 dark:text-primary-400 text-lg">✓</span>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    </div>
                  )}
                  
                  {/* Validación oculta para el formulario */}
                  <input
                    type="hidden"
                    value={formData.recurso_id}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha Préstamo *</label>
                  <input
                    type="date"
                    required
                    value={formData.fecha_prestamo}
                    onChange={(e) => setFormData({ ...formData, fecha_prestamo: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha Devolución Prevista *</label>
                  <input
                    type="date"
                    required
                    value={formData.fecha_devolucion_prevista}
                    onChange={(e) => setFormData({ ...formData, fecha_devolucion_prevista: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2"
                  />
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
                  Crear Préstamo
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

      {/* Modal devolución */}
      {showDevolucionModal && selectedPrestamo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 transition-colors">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Registrar Devolución</h2>
            <p className="mb-4 text-gray-600 dark:text-gray-400">
              Recurso: <strong className="dark:text-white">{selectedPrestamo.recurso_nombre}</strong>
            </p>
            <form onSubmit={handleDevolver}>
              <div className="space-y-4">
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
                  className="flex-1 bg-green-600 dark:bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
                >
                  Registrar Devolución
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDevolucionModal(false);
                    setSelectedPrestamo(null);
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
        title="Código QR del Préstamo"
      />

    </div>
  );
};

export default Prestamos;

