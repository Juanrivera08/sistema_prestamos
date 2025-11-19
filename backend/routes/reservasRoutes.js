import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireAdmin, requireAdminOrTrabajador } from '../middleware/auth.js';
import { isValidDateTime } from '../utils/validators.js';

const router = express.Router();

// Obtener todas las reservas
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { estado, usuario_id, recurso_id, fecha_inicio, fecha_fin, page = 1, limit = 10 } = req.query;
    
    let query = `
      SELECT 
        r.*,
        u.codigo as usuario_codigo,
        u.nombre_completo as usuario_nombre,
        u.email as usuario_email,
        rec.codigo as recurso_codigo,
        rec.nombre as recurso_nombre
      FROM reservas r
      INNER JOIN usuarios u ON r.usuario_id = u.id
      INNER JOIN recursos rec ON r.recurso_id = rec.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.rol !== 'administrador' && req.user.rol !== 'trabajador') {
      query += ' AND r.usuario_id = ?';
      params.push(req.user.id);
    } else if (usuario_id) {
      query += ' AND r.usuario_id = ?';
      params.push(usuario_id);
    }

    if (estado) {
      query += ' AND r.estado = ?';
      params.push(estado);
    }

    if (recurso_id) {
      query += ' AND r.recurso_id = ?';
      params.push(recurso_id);
    }

    if (fecha_inicio) {
      query += ' AND r.fecha_inicio_prevista >= ?';
      params.push(fecha_inicio);
    }

    if (fecha_fin) {
      query += ' AND r.fecha_fin_prevista <= ?';
      params.push(fecha_fin);
    }

    query += ' ORDER BY r.fecha_reserva DESC';

    const [reservas] = await pool.query(query, params);
    res.json(reservas);
  } catch (error) {
    console.error('Error al obtener reservas:', error);
    res.status(500).json({ message: 'Error al obtener reservas' });
  }
});

// Crear reserva
// Crear reserva (solo trabajadores y admin)
router.post('/', authenticateToken, requireAdminOrTrabajador, async (req, res) => {
  try {
    const { usuario_id, recurso_id, fecha_inicio_prevista, fecha_fin_prevista, observaciones } = req.body;

    if (!recurso_id || !fecha_inicio_prevista || !fecha_fin_prevista) {
      return res.status(400).json({ message: 'Recurso, fecha inicio y fecha fin son requeridos' });
    }

    if (!usuario_id) {
      return res.status(400).json({ message: 'Usuario es requerido' });
    }

    const finalUsuarioId = usuario_id;

    // Validar fechas
    if (!isValidDateTime(fecha_inicio_prevista) || !isValidDateTime(fecha_fin_prevista)) {
      return res.status(400).json({ message: 'Formato de fecha inválido' });
    }

    const fechaInicio = new Date(fecha_inicio_prevista.replace(' ', 'T'));
    const fechaFin = new Date(fecha_fin_prevista.replace(' ', 'T'));

    if (fechaFin <= fechaInicio) {
      return res.status(400).json({ message: 'La fecha fin debe ser posterior a la fecha inicio' });
    }

    if (fechaInicio < new Date()) {
      return res.status(400).json({ message: 'La fecha inicio no puede ser en el pasado' });
    }

    // Verificar disponibilidad del recurso
    const [recursos] = await pool.query('SELECT * FROM recursos WHERE id = ? AND deleted_at IS NULL', [recurso_id]);
    if (recursos.length === 0) {
      return res.status(404).json({ message: 'Recurso no encontrado' });
    }

    // Verificar conflictos con préstamos activos
    const [prestamosConflictivos] = await pool.query(`
      SELECT id FROM prestamos 
      WHERE recurso_id = ? 
      AND estado = 'activo'
      AND (
        (fecha_prestamo <= ? AND fecha_devolucion_prevista >= ?) OR
        (fecha_prestamo <= ? AND fecha_devolucion_prevista >= ?) OR
        (fecha_prestamo >= ? AND fecha_devolucion_prevista <= ?)
      )
    `, [recurso_id, fechaInicio, fechaInicio, fechaFin, fechaFin, fechaInicio, fechaFin]);

    if (prestamosConflictivos.length > 0) {
      return res.status(400).json({ message: 'El recurso no está disponible en ese período' });
    }

    // Verificar conflictos con otras reservas confirmadas
    const [reservasConflictivas] = await pool.query(`
      SELECT id FROM reservas 
      WHERE recurso_id = ? 
      AND estado = 'confirmada'
      AND (
        (fecha_inicio_prevista <= ? AND fecha_fin_prevista >= ?) OR
        (fecha_inicio_prevista <= ? AND fecha_fin_prevista >= ?) OR
        (fecha_inicio_prevista >= ? AND fecha_fin_prevista <= ?)
      )
    `, [recurso_id, fechaInicio, fechaInicio, fechaFin, fechaFin, fechaInicio, fechaFin]);

    if (reservasConflictivas.length > 0) {
      return res.status(400).json({ message: 'Ya existe una reserva confirmada para ese período' });
    }

    const [result] = await pool.query(`
      INSERT INTO reservas (usuario_id, recurso_id, fecha_reserva, fecha_inicio_prevista, fecha_fin_prevista, observaciones)
      VALUES (?, ?, NOW(), ?, ?, ?)
    `, [finalUsuarioId, recurso_id, fecha_inicio_prevista, fecha_fin_prevista, observaciones || null]);

    res.status(201).json({
      message: 'Reserva creada exitosamente',
      reserva: { id: result.insertId, ...req.body }
    });
  } catch (error) {
    console.error('Error al crear reserva:', error);
    res.status(500).json({ message: 'Error al crear reserva' });
  }
});

// Confirmar reserva (convertir a préstamo)
router.post('/:id/confirmar', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [reservas] = await pool.query('SELECT * FROM reservas WHERE id = ?', [id]);
    if (reservas.length === 0) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    const reserva = reservas[0];
    if (reserva.estado !== 'pendiente') {
      return res.status(400).json({ message: 'Solo se pueden confirmar reservas pendientes' });
    }

    // Verificar que el recurso sigue disponible
    const [prestamosActivos] = await pool.query(`
      SELECT id FROM prestamos 
      WHERE recurso_id = ? AND estado = 'activo'
    `, [reserva.recurso_id]);

    if (prestamosActivos.length > 0) {
      return res.status(400).json({ message: 'El recurso ya está prestado' });
    }

    // Crear préstamo desde la reserva
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Obtener información del trabajador
      const [trabajadorInfo] = await connection.query(
        'SELECT id, nombre_completo, email FROM usuarios WHERE id = ?',
        [req.user.id]
      );

      if (trabajadorInfo.length === 0) {
        throw new Error('Trabajador no encontrado');
      }

      const trabajador = trabajadorInfo[0];

      // Crear préstamo
      const [prestamoResult] = await connection.query(`
        INSERT INTO prestamos (usuario_id, recurso_id, trabajador_id, trabajador_nombre, trabajador_email, fecha_prestamo, fecha_devolucion_prevista, observaciones)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        reserva.usuario_id,
        reserva.recurso_id,
        trabajador.id,
        trabajador.nombre_completo,
        trabajador.email,
        reserva.fecha_inicio_prevista,
        reserva.fecha_fin_prevista,
        reserva.observaciones
      ]);

      // Actualizar estado del recurso
      await connection.query('UPDATE recursos SET estado = "prestado" WHERE id = ?', [reserva.recurso_id]);

      // Marcar reserva como completada
      await connection.query('UPDATE reservas SET estado = "completada" WHERE id = ?', [id]);

      await connection.commit();

      res.json({
        message: 'Reserva confirmada y préstamo creado exitosamente',
        prestamo_id: prestamoResult.insertId
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al confirmar reserva:', error);
    res.status(500).json({ message: 'Error al confirmar reserva' });
  }
});

// Cancelar reserva
router.put('/:id/cancelar', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [reservas] = await pool.query('SELECT * FROM reservas WHERE id = ?', [id]);
    if (reservas.length === 0) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    const reserva = reservas[0];
    
    // Solo el dueño de la reserva, admin o trabajador pueden cancelar
    if (req.user.rol !== 'administrador' && req.user.rol !== 'trabajador' && reserva.usuario_id !== req.user.id) {
      return res.status(403).json({ message: 'No tienes permiso para cancelar esta reserva' });
    }

    if (reserva.estado === 'cancelada' || reserva.estado === 'completada') {
      return res.status(400).json({ message: 'La reserva ya está cancelada o completada' });
    }

    await pool.query('UPDATE reservas SET estado = "cancelada" WHERE id = ?', [id]);

    res.json({ message: 'Reserva cancelada exitosamente' });
  } catch (error) {
    console.error('Error al cancelar reserva:', error);
    res.status(500).json({ message: 'Error al cancelar reserva' });
  }
});

// Eliminar reserva (solo admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM reservas WHERE id = ?', [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    res.json({ message: 'Reserva eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar reserva:', error);
    res.status(500).json({ message: 'Error al eliminar reserva' });
  }
});

export default router;

