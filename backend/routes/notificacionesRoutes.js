import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Obtener notificaciones del usuario
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { leida, tipo, page = 1, limit = 20 } = req.query;
    
    let query = 'SELECT * FROM notificaciones WHERE usuario_id = ?';
    const params = [req.user.id];

    if (leida !== undefined) {
      query += ' AND leida = ?';
      params.push(leida === 'true');
    }

    if (tipo) {
      query += ' AND tipo = ?';
      params.push(tipo);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const [notificaciones] = await pool.query(query, params);

    // Contar total
    let countQuery = 'SELECT COUNT(*) as total FROM notificaciones WHERE usuario_id = ?';
    const countParams = [req.user.id];
    if (leida !== undefined) {
      countQuery += ' AND leida = ?';
      countParams.push(leida === 'true');
    }
    if (tipo) {
      countQuery += ' AND tipo = ?';
      countParams.push(tipo);
    }
    const [countResult] = await pool.query(countQuery, countParams);

    res.json({
      notificaciones: notificaciones || [],
      total: countResult[0]?.total || 0,
      noLeidas: (notificaciones || []).filter(n => !n.leida).length
    });
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    console.error('Detalles del error:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    res.status(500).json({ 
      message: 'Error al obtener notificaciones',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Marcar notificación como leída
router.put('/:id/leer', authenticateToken, async (req, res) => {
  try {
    const [notificaciones] = await pool.query(
      'SELECT * FROM notificaciones WHERE id = ? AND usuario_id = ?',
      [req.params.id, req.user.id]
    );

    if (notificaciones.length === 0) {
      return res.status(404).json({ message: 'Notificación no encontrada' });
    }

    await pool.query('UPDATE notificaciones SET leida = true WHERE id = ?', [req.params.id]);

    res.json({ message: 'Notificación marcada como leída' });
  } catch (error) {
    console.error('Error al marcar notificación:', error);
    res.status(500).json({ message: 'Error al marcar notificación' });
  }
});

// Marcar todas como leídas
router.put('/marcar-todas-leidas', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notificaciones SET leida = true WHERE usuario_id = ? AND leida = false',
      [req.user.id]
    );

    res.json({ message: 'Todas las notificaciones marcadas como leídas' });
  } catch (error) {
    console.error('Error al marcar notificaciones:', error);
    res.status(500).json({ message: 'Error al marcar notificaciones' });
  }
});

// Eliminar notificación
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM notificaciones WHERE id = ? AND usuario_id = ?',
      [req.params.id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Notificación no encontrada' });
    }

    res.json({ message: 'Notificación eliminada' });
  } catch (error) {
    console.error('Error al eliminar notificación:', error);
    res.status(500).json({ message: 'Error al eliminar notificación' });
  }
});

// Función helper para crear notificaciones (usar desde otros módulos)
export const crearNotificacion = async (usuarioId, tipo, titulo, mensaje, relacionId = null, relacionTipo = null) => {
  try {
    await pool.query(`
      INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, relacion_id, relacion_tipo)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [usuarioId, tipo, titulo, mensaje, relacionId, relacionTipo]);
  } catch (error) {
    console.error('Error al crear notificación:', error);
  }
};

export default router;

