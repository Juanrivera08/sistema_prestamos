import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

const Calendario = () => {
  const { isTrabajador } = useAuth();
  const [prestamos, setPrestamos] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [prestamosDelDia, setPrestamosDelDia] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrestamos();
  }, [currentDate]);

  const fetchPrestamos = async () => {
    try {
      setLoading(true);
      const inicioMes = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const finMes = format(endOfMonth(currentDate), 'yyyy-MM-dd');
      
      const response = await axios.get(`/api/prestamos?fecha_inicio=${inicioMes}&fecha_fin=${finMes}`);
      const prestamosData = response.data.prestamos || response.data;
      setPrestamos(prestamosData);
    } catch (error) {
      console.error('Error al obtener préstamos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    const fechaStr = format(date, 'yyyy-MM-dd');
    const prestamosFecha = prestamos.filter(p => {
      try {
        const fechaPrestamo = new Date(p.fecha_prestamo.replace(' ', 'T'));
        const fechaDevolucion = new Date(p.fecha_devolucion_prevista.replace(' ', 'T'));
        return format(fechaPrestamo, 'yyyy-MM-dd') === fechaStr || 
               format(fechaDevolucion, 'yyyy-MM-dd') === fechaStr ||
               (fechaPrestamo <= date && fechaDevolucion >= date);
      } catch {
        return false;
      }
    });
    setPrestamosDelDia(prestamosFecha);
  };

  const getPrestamosForDate = (date) => {
    return prestamos.filter(p => {
      try {
        const fechaPrestamo = new Date(p.fecha_prestamo.replace(' ', 'T'));
        const fechaDevolucion = new Date(p.fecha_devolucion_prevista.replace(' ', 'T'));
        return format(fechaPrestamo, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd') || 
               format(fechaDevolucion, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd') ||
               (fechaPrestamo <= date && fechaDevolucion >= date && p.estado === 'activo');
      } catch {
        return false;
      }
    });
  };

  const getEstadoColor = (estado) => {
    const colors = {
      activo: 'bg-blue-500',
      devuelto: 'bg-green-500',
      vencido: 'bg-red-500'
    };
    return colors[estado] || 'bg-gray-500';
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Agregar días del mes anterior para completar la primera semana
  const firstDayOfWeek = monthStart.getDay();
  const daysBefore = [];
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(monthStart);
    date.setDate(date.getDate() - i - 1);
    daysBefore.push(date);
  }

  // Agregar días del mes siguiente para completar la última semana
  const lastDayOfWeek = monthEnd.getDay();
  const daysAfter = [];
  for (let i = 1; i <= 6 - lastDayOfWeek; i++) {
    const date = new Date(monthEnd);
    date.setDate(date.getDate() + i);
    daysAfter.push(date);
  }

  const allDays = [...daysBefore, ...daysInMonth, ...daysAfter];

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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Calendario de Préstamos</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-white px-4 py-2 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
          >
            ← Anterior
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="bg-primary-600 dark:bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
          >
            Hoy
          </button>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-white px-4 py-2 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
          >
            Siguiente →
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white text-center">
          {format(currentDate, 'MMMM yyyy', { locale: es })}
        </h2>

        {/* Días de la semana */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
            <div key={day} className="text-center font-semibold text-gray-700 dark:text-gray-300 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendario */}
        <div className="grid grid-cols-7 gap-2">
          {allDays.map((date, idx) => {
            const isCurrentMonth = isSameMonth(date, currentDate);
            const isToday = isSameDay(date, new Date());
            const isSelected = selectedDate && isSameDay(date, selectedDate);
            const prestamosFecha = getPrestamosForDate(date);
            const activos = prestamosFecha.filter(p => p.estado === 'activo').length;
            const vencidos = prestamosFecha.filter(p => p.estado === 'vencido').length;

            return (
              <div
                key={idx}
                onClick={() => handleDateClick(date)}
                className={`
                  min-h-[100px] p-2 border rounded-lg cursor-pointer transition-colors
                  ${!isCurrentMonth ? 'bg-gray-100 dark:bg-gray-900 text-gray-400' : 'bg-white dark:bg-gray-800'}
                  ${isToday ? 'border-primary-500 border-2' : 'border-gray-200 dark:border-gray-700'}
                  ${isSelected ? 'ring-2 ring-primary-500' : ''}
                  hover:bg-gray-50 dark:hover:bg-gray-700
                `}
              >
                <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-primary-600 dark:text-primary-400' : ''}`}>
                  {format(date, 'd')}
                </div>
                <div className="space-y-1">
                  {activos > 0 && (
                    <div className="text-xs bg-blue-500 text-white px-1 rounded">
                      {activos} activo{activos > 1 ? 's' : ''}
                    </div>
                  )}
                  {vencidos > 0 && (
                    <div className="text-xs bg-red-500 text-white px-1 rounded">
                      {vencidos} vencido{vencidos > 1 ? 's' : ''}
                    </div>
                  )}
                  {prestamosFecha.length > activos + vencidos && (
                    <div className="text-xs bg-green-500 text-white px-1 rounded">
                      {prestamosFecha.length - activos - vencidos} devuelto{prestamosFecha.length - activos - vencidos > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detalle del día seleccionado */}
      {selectedDate && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors">
          <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
            Préstamos del {format(selectedDate, 'dd/MM/yyyy')}
          </h3>
          {prestamosDelDia.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No hay préstamos para esta fecha</p>
          ) : (
            <div className="space-y-2">
              {prestamosDelDia.map(prestamo => (
                <div
                  key={prestamo.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {prestamo.recurso_nombre}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Usuario: {prestamo.usuario_nombre}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Préstamo: {(() => {
                          try {
                            const fecha = new Date(prestamo.fecha_prestamo.replace(' ', 'T'));
                            return format(fecha, 'dd/MM/yyyy HH:mm');
                          } catch {
                            return prestamo.fecha_prestamo;
                          }
                        })()}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        Devolución: {(() => {
                          try {
                            const fecha = new Date(prestamo.fecha_devolucion_prevista.replace(' ', 'T'));
                            return format(fecha, 'dd/MM/yyyy HH:mm');
                          } catch {
                            return prestamo.fecha_devolucion_prevista;
                          }
                        })()}
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(prestamo.estado)} text-white`}>
                      {prestamo.estado}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Calendario;

