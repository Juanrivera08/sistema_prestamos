import pool from '../config/database.js';

// Función helper para convertir fecha a objeto Date
const convertirFecha = (fecha) => {
  if (!fecha) return null;
  // Si ya es un objeto Date, retornarlo
  if (fecha instanceof Date) return fecha;
  // Si es un string, convertirlo
  if (typeof fecha === 'string') {
    // Intentar diferentes formatos
    const fechaStr = fecha.replace(' ', 'T');
    return new Date(fechaStr);
  }
  return new Date(fecha);
};

// Función helper para crear notificaciones
const crearNotificacion = async (usuarioId, tipo, titulo, mensaje, relacionId = null, relacionTipo = null) => {
  try {
    await pool.query(`
      INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, relacion_id, relacion_tipo)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [usuarioId, tipo, titulo, mensaje, relacionId, relacionTipo]);
  } catch (error) {
    console.error('Error al crear notificación:', error);
  }
};

/**
 * Verificar y notificar préstamos próximos a vencer
 */
export const verificarPrestamosProximosAVencer = async () => {
  try {
    // Obtener días de anticipación desde configuración
    const [config] = await pool.query(
      "SELECT valor FROM configuraciones WHERE clave = 'dias_antes_notificacion'"
    );
    const diasAnticipacion = config.length > 0 ? parseInt(config[0].valor) : 1;

    // Calcular fecha límite
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + diasAnticipacion);
    fechaLimite.setHours(23, 59, 59, 999);

    // Buscar préstamos activos que vencen en los próximos días
    const [prestamos] = await pool.query(`
      SELECT 
        p.*,
        u.email as usuario_email,
        r.nombre as recurso_nombre
      FROM prestamos p
      INNER JOIN usuarios u ON p.usuario_id = u.id
      INNER JOIN recursos r ON p.recurso_id = r.id
      WHERE p.estado = 'activo'
      AND DATE(p.fecha_devolucion_prevista) = DATE(?)
      AND NOT EXISTS (
        SELECT 1 FROM notificaciones n 
        WHERE n.relacion_id = p.id 
        AND n.relacion_tipo = 'prestamo'
        AND n.tipo = 'prestamo_proximo_vencer'
        AND DATE(n.created_at) = CURDATE()
      )
    `, [fechaLimite]);

    for (const prestamo of prestamos) {
      const fechaVencimiento = convertirFecha(prestamo.fecha_devolucion_prevista);
      if (!fechaVencimiento || isNaN(fechaVencimiento.getTime())) {
        console.error('Fecha de vencimiento inválida para préstamo:', prestamo.id);
        continue;
      }
      const diasRestantes = Math.ceil((fechaVencimiento - new Date()) / (1000 * 60 * 60 * 24));

      await crearNotificacion(
        prestamo.usuario_id,
        'prestamo_proximo_vencer',
        'Préstamo próximo a vencer',
        `Tu préstamo del recurso "${prestamo.recurso_nombre}" vence en ${diasRestantes} día(s). Fecha de devolución: ${fechaVencimiento.toLocaleDateString()}`,
        prestamo.id,
        'prestamo'
      );
    }

    console.log(`Notificaciones de préstamos próximos a vencer enviadas: ${prestamos.length}`);
  } catch (error) {
    console.error('Error al verificar préstamos próximos a vencer:', error);
  }
};

/**
 * Verificar y notificar préstamos vencidos
 */
export const verificarPrestamosVencidos = async () => {
  try {
    // Buscar préstamos vencidos que aún no tienen notificación
    const [prestamos] = await pool.query(`
      SELECT 
        p.*,
        u.email as usuario_email,
        r.nombre as recurso_nombre
      FROM prestamos p
      INNER JOIN usuarios u ON p.usuario_id = u.id
      INNER JOIN recursos r ON p.recurso_id = r.id
      WHERE p.estado = 'vencido'
      AND NOT EXISTS (
        SELECT 1 FROM notificaciones n 
        WHERE n.relacion_id = p.id 
        AND n.relacion_tipo = 'prestamo'
        AND n.tipo = 'prestamo_vencido'
        AND DATE(n.created_at) = CURDATE()
      )
    `);

    for (const prestamo of prestamos) {
      const fechaVencimiento = convertirFecha(prestamo.fecha_devolucion_prevista);
      if (!fechaVencimiento || isNaN(fechaVencimiento.getTime())) {
        console.error('Fecha de vencimiento inválida para préstamo:', prestamo.id);
        continue;
      }
      const diasVencido = Math.floor((new Date() - fechaVencimiento) / (1000 * 60 * 60 * 24));

      await crearNotificacion(
        prestamo.usuario_id,
        'prestamo_vencido',
        'Préstamo vencido',
        `Tu préstamo del recurso "${prestamo.recurso_nombre}" está vencido desde hace ${diasVencido} día(s). Por favor, devuélvelo lo antes posible.`,
        prestamo.id,
        'prestamo'
      );
    }

    console.log(`Notificaciones de préstamos vencidos enviadas: ${prestamos.length}`);
  } catch (error) {
    console.error('Error al verificar préstamos vencidos:', error);
  }
};

/**
 * Calcular multas automáticamente para préstamos vencidos
 */
export const calcularMultasAutomaticas = async () => {
  try {
    // Obtener configuración
    const [configMultas] = await pool.query(
      "SELECT valor FROM configuraciones WHERE clave = 'habilitar_multas'"
    );
    const multasHabilitadas = configMultas.length > 0 ? configMultas[0].valor === 'true' : true;

    if (!multasHabilitadas) {
      return;
    }

    // Buscar préstamos vencidos sin multa
    const [prestamos] = await pool.query(`
      SELECT p.*
      FROM prestamos p
      WHERE p.estado = 'vencido'
      AND p.fecha_devolucion_real IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM multas m 
        WHERE m.prestamo_id = p.id 
        AND m.estado != 'cancelada'
      )
      AND DATE(p.fecha_devolucion_prevista) < CURDATE()
    `);

    for (const prestamo of prestamos) {
      const fechaPrevista = convertirFecha(prestamo.fecha_devolucion_prevista);
      if (!fechaPrevista || isNaN(fechaPrevista.getTime())) {
        console.error('Fecha de vencimiento inválida para préstamo:', prestamo.id);
        continue;
      }
      const diasRetraso = Math.floor((new Date() - fechaPrevista) / (1000 * 60 * 60 * 24));

      if (diasRetraso > 0) {
        const [configMonto] = await pool.query(
          "SELECT valor FROM configuraciones WHERE clave = 'monto_multa_por_dia'"
        );
        const montoPorDia = configMonto.length > 0 ? parseFloat(configMonto[0].valor) : 5000;
        const montoTotal = diasRetraso * montoPorDia;

        await pool.query(`
          INSERT INTO multas (prestamo_id, usuario_id, monto, dias_retraso, estado)
          VALUES (?, ?, ?, ?, 'pendiente')
        `, [prestamo.id, prestamo.usuario_id, montoTotal, diasRetraso]);

        await crearNotificacion(
          prestamo.usuario_id,
          'multa_aplicada',
          'Multa aplicada',
          `Se ha aplicado una multa de $${montoTotal.toLocaleString()} por ${diasRetraso} día(s) de retraso.`,
          prestamo.id,
          'prestamo'
        );
      }
    }

    console.log(`Multas automáticas calculadas: ${prestamos.length}`);
  } catch (error) {
    console.error('Error al calcular multas automáticas:', error);
  }
};

/**
 * Ejecutar todas las tareas programadas
 */
export const ejecutarTareasProgramadas = async () => {
  console.log('Ejecutando tareas programadas...');
  await verificarPrestamosProximosAVencer();
  await verificarPrestamosVencidos();
  await calcularMultasAutomaticas();
  console.log('Tareas programadas completadas');
};

