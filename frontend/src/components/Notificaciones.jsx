import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { API_ENDPOINTS } from '../config/api';

const Notificaciones = () => {
  const [notificaciones, setNotificaciones] = useState([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const pollingIntervalRef = useRef(null);

  useEffect(() => {
    fetchNotificaciones();
    
    // Polling cada 30 segundos
    pollingIntervalRef.current = setInterval(fetchNotificaciones, 30000);
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const fetchNotificaciones = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.NOTIFICACIONES.LIST + '?limit=10');
      const data = response.data.data || response.data;
      setNotificaciones(data.notificaciones || []);
      setNoLeidas(data.noLeidas || 0);
    } catch (error) {
      console.error('Error al obtener notificaciones:', error);
      // No mostrar error, solo continuar con polling
    } finally {
      setLoading(false);
    }
  };

  const marcarComoLeida = async (id) => {
    try {
      await axios.patch(API_ENDPOINTS.NOTIFICACIONES.MARCAR_LEIDA(id));
      await fetchNotificaciones();
    } catch (error) {
      console.error('Error al marcar notificación:', error);
    }
  };

  const marcarTodasLeidas = async () => {
    try {
      // Marcar todas como leídas
      for (const notif of notificaciones.filter(n => !n.leida)) {
        await axios.patch(API_ENDPOINTS.NOTIFICACIONES.MARCAR_LEIDA(notif.id));
      }
      await fetchNotificaciones();
    } catch (error) {
      console.error('Error al marcar notificaciones:', error);
    }
  };

  const eliminarNotificacion = async (id) => {
    try {
      // Nota: Este endpoint podría no existir, pero lo incluimos para cuando se implemente
      await axios.delete(`/api/notificaciones/${id}`);
      await fetchNotificaciones();
    } catch (error) {
      console.error('Error al eliminar notificación:', error);
    }
  };

  const getTipoIcono = (tipo) => {
    const iconos = {
      prestamo_vencido: '⚠️',
      prestamo_proximo_vencer: '⏰',
      devolucion_registrada: '✅',
      reserva_confirmada: '📅',
      reserva_cancelada: '❌',
      multa_aplicada: '💰',
      sistema: '🔔'
    };
    return iconos[tipo] || '📢';
  };

  const getTipoColor = (tipo) => {
    const colors = {
      prestamo_vencido: 'text-red-600 dark:text-red-400',
      prestamo_proximo_vencer: 'text-yellow-600 dark:text-yellow-400',
      devolucion_registrada: 'text-green-600 dark:text-green-400',
      reserva_confirmada: 'text-blue-600 dark:text-blue-400',
      reserva_cancelada: 'text-red-600 dark:text-red-400',
      multa_aplicada: 'text-orange-600 dark:text-orange-400',
      sistema: 'text-gray-600 dark:text-gray-400'
    };
    return colors[tipo] || 'text-gray-600 dark:text-gray-400';
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
        title="Notificaciones"
      >
        <span className="text-2xl">🔔</span>
        {noLeidas > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto transition-colors">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Notificaciones</h2>
              <div className="flex gap-2">
                {noLeidas > 0 && (
                  <button
                    onClick={marcarTodasLeidas}
                    className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300"
                  >
                    Marcar todas como leídas
                  </button>
                )}
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {notificaciones.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No hay notificaciones
                </div>
              ) : (
                notificaciones.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 rounded-lg border ${
                      !notif.leida
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl">{getTipoIcono(notif.tipo)}</span>
                          <h3 className={`font-semibold ${getTipoColor(notif.tipo)}`}>
                            {notif.titulo}
                          </h3>
                          {!notif.leida && (
                            <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                              Nueva
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                          {notif.mensaje}
                        </p>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {format(new Date(notif.created_at), 'dd/MM/yyyy HH:mm')}
                        </span>
                      </div>
                      <div className="flex gap-2 ml-4">
                        {!notif.leida && (
                          <button
                            onClick={() => marcarComoLeida(notif.id)}
                            className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800"
                            title="Marcar como leída"
                          >
                            ✓
                          </button>
                        )}
                        <button
                          onClick={() => eliminarNotificacion(notif.id)}
                          className="text-xs text-red-600 dark:text-red-400 hover:text-red-800"
                          title="Eliminar"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Notificaciones;

