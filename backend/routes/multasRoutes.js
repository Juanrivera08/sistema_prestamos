import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Obtener todas las multas
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { estado, usuario_id, page = 1, limit = 10 } = req.query;
    
    let query = `
      SELECT 
        m.*,
        p.id as prestamo_id,
        p.fecha_prestamo,
        p.fecha_devolucion_prevista,
        p.fecha_devolucion_real,
        u.codigo as usuario_codigo,
        u.nombre_completo as usuario_nombre,
        u.email as usuario_email,
        r.nombre as recurso_nombre
      FROM multas m
      INNER JOIN prestamos p ON m.prestamo_id = p.id
      INNER JOIN usuarios u ON m.usuario_id = u.id
      INNER JOIN recursos r ON p.recurso_id = r.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.rol !== 'administrador' && req.user.rol !== 'trabajador') {
      query += ' AND m.usuario_id = ?';
      params.push(req.user.id);
    } else if (usuario_id) {
      query += ' AND m.usuario_id = ?';
      params.push(usuario_id);
    }

    if (estado) {
      query += ' AND m.estado = ?';
      params.push(estado);
    }

    query += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const [multas] = await pool.query(query, params);
    res.json(multas);
  } catch (error) {
    console.error('Error al obtener multas:', error);
    res.status(500).json({ message: 'Error al obtener multas' });
  }
});

// Calcular y crear multa por préstamo vencido
router.post('/calcular/:prestamo_id', authenticateToken, async (req, res) => {
  try {
    const { prestamo_id } = req.params;

    // Obtener préstamo
    const [prestamos] = await pool.query('SELECT * FROM prestamos WHERE id = ?', [prestamo_id]);
    if (prestamos.length === 0) {
      return res.status(404).json({ message: 'Préstamo no encontrado' });
    }

    const prestamo = prestamos[0];

    // Verificar si ya tiene multa
    const [multasExistentes] = await pool.query(
      'SELECT * FROM multas WHERE prestamo_id = ? AND estado != "cancelada"',
      [prestamo_id]
    );

    if (multasExistentes.length > 0) {
      return res.status(400).json({ message: 'Este préstamo ya tiene una multa activa' });
    }

    // Solo calcular multa si está vencido y no devuelto
    if (prestamo.estado !== 'vencido' && prestamo.estado !== 'activo') {
      return res.status(400).json({ message: 'Solo se pueden calcular multas para préstamos vencidos o activos' });
    }

    const fechaDevolucion = prestamo.fecha_devolucion_real 
      ? new Date(prestamo.fecha_devolucion_real.replace(' ', 'T'))
      : new Date();
    const fechaPrevista = new Date(prestamo.fecha_devolucion_prevista.replace(' ', 'T'));
    
    const diasRetraso = Math.max(0, Math.floor((fechaDevolucion - fechaPrevista) / (1000 * 60 * 60 * 24)));

    if (diasRetraso === 0) {
      return res.status(400).json({ message: 'No hay retraso en la devolución' });
    }

    // Obtener monto por día de configuración
    const [config] = await pool.query(
      "SELECT valor FROM configuraciones WHERE clave = 'monto_multa_por_dia'"
    );
    const montoPorDia = config.length > 0 ? parseFloat(config[0].valor) : 5000;
    const montoTotal = diasRetraso * montoPorDia;

    // Crear multa
    const [result] = await pool.query(`
      INSERT INTO multas (prestamo_id, usuario_id, monto, dias_retraso, estado)
      VALUES (?, ?, ?, ?, 'pendiente')
    `, [prestamo_id, prestamo.usuario_id, montoTotal, diasRetraso]);

    // Crear notificación
    const { crearNotificacion } = await import('./notificacionesRoutes.js');
    await crearNotificacion(
      prestamo.usuario_id,
      'multa_aplicada',
      'Multa aplicada',
      `Se ha aplicado una multa de $${montoTotal.toLocaleString()} por ${diasRetraso} día(s) de retraso en el préstamo #${prestamo_id}`,
      result.insertId,
      'multa'
    );

    res.status(201).json({
      message: 'Multa calculada y creada exitosamente',
      multa: {
        id: result.insertId,
        monto: montoTotal,
        dias_retraso: diasRetraso
      }
    });
  } catch (error) {
    console.error('Error al calcular multa:', error);
    res.status(500).json({ message: 'Error al calcular multa' });
  }
});

// Marcar multa como pagada
router.put('/:id/pagar', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { observaciones } = req.body;

    const [multas] = await pool.query('SELECT * FROM multas WHERE id = ?', [id]);
    if (multas.length === 0) {
      return res.status(404).json({ message: 'Multa no encontrada' });
    }

    const multa = multas[0];

    // Solo el dueño, admin o trabajador pueden pagar
    if (req.user.rol !== 'administrador' && req.user.rol !== 'trabajador' && multa.usuario_id !== req.user.id) {
      return res.status(403).json({ message: 'No tienes permiso para pagar esta multa' });
    }

    if (multa.estado === 'pagada') {
      return res.status(400).json({ message: 'La multa ya está pagada' });
    }

    await pool.query(
      'UPDATE multas SET estado = "pagada", fecha_pago = NOW(), observaciones = COALESCE(?, observaciones) WHERE id = ?',
      [observaciones || null, id]
    );

    res.json({ message: 'Multa marcada como pagada' });
  } catch (error) {
    console.error('Error al pagar multa:', error);
    res.status(500).json({ message: 'Error al pagar multa' });
  }
});

// Cancelar multa (solo admin)
router.put('/:id/cancelar', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { observaciones } = req.body;

    const [multas] = await pool.query('SELECT * FROM multas WHERE id = ?', [id]);
    if (multas.length === 0) {
      return res.status(404).json({ message: 'Multa no encontrada' });
    }

    await pool.query(
      'UPDATE multas SET estado = "cancelada", observaciones = COALESCE(?, observaciones) WHERE id = ?',
      [observaciones || null, id]
    );

    res.json({ message: 'Multa cancelada exitosamente' });
  } catch (error) {
    console.error('Error al cancelar multa:', error);
    res.status(500).json({ message: 'Error al cancelar multa' });
  }
});

export default router;

