import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Obtener historial de préstamos por recurso
router.get('/recurso/:recurso_id', authenticateToken, async (req, res) => {
  try {
    const { recurso_id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    let query = `
      SELECT 
        p.*,
        u.codigo as usuario_codigo,
        u.nombre_completo as usuario_nombre,
        u.email as usuario_email,
        r.codigo as recurso_codigo,
        r.nombre as recurso_nombre,
        p.trabajador_nombre,
        p.trabajador_email
      FROM prestamos p
      INNER JOIN usuarios u ON p.usuario_id = u.id
      INNER JOIN recursos r ON p.recurso_id = r.id
      WHERE p.recurso_id = ?
    `;
    const params = [recurso_id];

    // Si es estudiante, solo ver sus propios préstamos de ese recurso
    if (req.user.rol !== 'administrador' && req.user.rol !== 'trabajador') {
      query += ' AND p.usuario_id = ?';
      params.push(req.user.id);
    }

    query += ' ORDER BY p.fecha_prestamo DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const [prestamos] = await pool.query(query, params);

    // Contar total
    let countQuery = 'SELECT COUNT(*) as total FROM prestamos WHERE recurso_id = ?';
    const countParams = [recurso_id];
    
    // Si es estudiante, solo contar sus préstamos
    if (req.user.rol !== 'administrador' && req.user.rol !== 'trabajador') {
      countQuery += ' AND usuario_id = ?';
      countParams.push(req.user.id);
    }
    
    const [countResult] = await pool.query(countQuery, countParams);

    res.json({
      prestamos,
      total: countResult[0].total,
      pagina: parseInt(page),
      totalPaginas: Math.ceil(countResult[0].total / parseInt(limit))
    });
  } catch (error) {
    console.error('Error al obtener historial del recurso:', error);
    res.status(500).json({ message: 'Error al obtener historial' });
  }
});

// Obtener historial de préstamos por usuario
router.get('/usuario/:usuario_id', authenticateToken, async (req, res) => {
  try {
    const { usuario_id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Verificar permisos
    if (req.user.rol !== 'administrador' && req.user.rol !== 'trabajador' && req.user.id !== parseInt(usuario_id)) {
      return res.status(403).json({ message: 'No tienes permiso para ver este historial' });
    }

    let query = `
      SELECT 
        p.*,
        u.codigo as usuario_codigo,
        u.nombre_completo as usuario_nombre,
        u.email as usuario_email,
        r.codigo as recurso_codigo,
        r.nombre as recurso_nombre,
        r.categoria as recurso_categoria,
        p.trabajador_nombre,
        p.trabajador_email
      FROM prestamos p
      INNER JOIN usuarios u ON p.usuario_id = u.id
      INNER JOIN recursos r ON p.recurso_id = r.id
      WHERE p.usuario_id = ?
      ORDER BY p.fecha_prestamo DESC
      LIMIT ? OFFSET ?
    `;

    const [prestamos] = await pool.query(query, [
      usuario_id,
      parseInt(limit),
      (parseInt(page) - 1) * parseInt(limit)
    ]);

    // Contar total
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM prestamos WHERE usuario_id = ?',
      [usuario_id]
    );

    // Estadísticas del usuario
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_prestamos,
        SUM(CASE WHEN estado = 'activo' THEN 1 ELSE 0 END) as activos,
        SUM(CASE WHEN estado = 'devuelto' THEN 1 ELSE 0 END) as devueltos,
        SUM(CASE WHEN estado = 'vencido' THEN 1 ELSE 0 END) as vencidos
      FROM prestamos
      WHERE usuario_id = ?
    `, [usuario_id]);

    res.json({
      prestamos,
      estadisticas: stats[0],
      total: countResult[0].total,
      pagina: parseInt(page),
      totalPaginas: Math.ceil(countResult[0].total / parseInt(limit))
    });
  } catch (error) {
    console.error('Error al obtener historial del usuario:', error);
    res.status(500).json({ message: 'Error al obtener historial' });
  }
});

// Obtener historial completo (solo admin/trabajador)
router.get('/completo', authenticateToken, async (req, res) => {
  try {
    if (req.user.rol !== 'administrador' && req.user.rol !== 'trabajador') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { fecha_inicio, fecha_fin, estado, page = 1, limit = 50 } = req.query;

    let query = `
      SELECT 
        p.*,
        u.codigo as usuario_codigo,
        u.nombre_completo as usuario_nombre,
        u.email as usuario_email,
        r.codigo as recurso_codigo,
        r.nombre as recurso_nombre,
        r.categoria as recurso_categoria,
        p.trabajador_nombre,
        p.trabajador_email
      FROM prestamos p
      INNER JOIN usuarios u ON p.usuario_id = u.id
      INNER JOIN recursos r ON p.recurso_id = r.id
      WHERE 1=1
    `;
    const params = [];

    if (fecha_inicio) {
      query += ' AND p.fecha_prestamo >= ?';
      params.push(fecha_inicio);
    }

    if (fecha_fin) {
      query += ' AND p.fecha_prestamo <= ?';
      params.push(fecha_fin);
    }

    if (estado) {
      query += ' AND p.estado = ?';
      params.push(estado);
    }

    query += ' ORDER BY p.fecha_prestamo DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const [prestamos] = await pool.query(query, params);

    // Contar total
    let countQuery = 'SELECT COUNT(*) as total FROM prestamos WHERE 1=1';
    const countParams = [];
    if (fecha_inicio) {
      countQuery += ' AND fecha_prestamo >= ?';
      countParams.push(fecha_inicio);
    }
    if (fecha_fin) {
      countQuery += ' AND fecha_prestamo <= ?';
      countParams.push(fecha_fin);
    }
    if (estado) {
      countQuery += ' AND estado = ?';
      countParams.push(estado);
    }

    const [countResult] = await pool.query(countQuery, countParams);

    res.json({
      prestamos,
      total: countResult[0].total,
      pagina: parseInt(page),
      totalPaginas: Math.ceil(countResult[0].total / parseInt(limit))
    });
  } catch (error) {
    console.error('Error al obtener historial completo:', error);
    res.status(500).json({ message: 'Error al obtener historial' });
  }
});

export default router;

