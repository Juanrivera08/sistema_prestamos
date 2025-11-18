import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { isValidDate } from '../utils/validators.js';

const router = express.Router();

// Obtener todos los préstamos
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Actualizar préstamos vencidos automáticamente
    await pool.query(
      `UPDATE prestamos 
       SET estado = 'vencido' 
       WHERE estado = 'activo' 
       AND fecha_devolucion_prevista < CURDATE()`
    );

    const { estado, usuario_id, recurso_id, fecha_inicio, fecha_fin } = req.query;
    
    let query = `
      SELECT 
        p.*,
        u.codigo as usuario_codigo,
        u.nombre_completo as usuario_nombre,
        u.email as usuario_email,
        r.codigo as recurso_codigo,
        r.nombre as recurso_nombre,
        r.descripcion as recurso_descripcion,
        r.imagen as recurso_imagen,
        p.trabajador_id,
        p.trabajador_nombre,
        p.trabajador_email
      FROM prestamos p
      INNER JOIN usuarios u ON p.usuario_id = u.id
      INNER JOIN recursos r ON p.recurso_id = r.id
      WHERE 1=1
    `;
    const params = [];

    // Si es usuario estándar, solo ver sus préstamos. Admin y trabajadores ven todos
    if (req.user.rol !== 'administrador' && req.user.rol !== 'trabajador') {
      query += ' AND p.usuario_id = ?';
      params.push(req.user.id);
    } else if (usuario_id) {
      query += ' AND p.usuario_id = ?';
      params.push(usuario_id);
    }

    if (estado) {
      query += ' AND p.estado = ?';
      params.push(estado);
    }

    if (recurso_id) {
      query += ' AND p.recurso_id = ?';
      params.push(recurso_id);
    }

    if (fecha_inicio) {
      query += ' AND p.fecha_prestamo >= ?';
      params.push(fecha_inicio);
    }

    if (fecha_fin) {
      query += ' AND p.fecha_prestamo <= ?';
      params.push(fecha_fin);
    }

    query += ' ORDER BY p.created_at DESC';

    const [prestamos] = await pool.query(query, params);
    res.json(prestamos);
  } catch (error) {
    console.error('Error al obtener préstamos:', error);
    res.status(500).json({ message: 'Error al obtener préstamos' });
  }
});

// Obtener un préstamo por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    let query = `
      SELECT 
        p.*,
        u.codigo as usuario_codigo,
        u.nombre_completo as usuario_nombre,
        u.email as usuario_email,
        r.codigo as recurso_codigo,
        r.nombre as recurso_nombre,
        r.descripcion as recurso_descripcion,
        r.imagen as recurso_imagen,
        p.trabajador_id,
        p.trabajador_nombre,
        p.trabajador_email
      FROM prestamos p
      INNER JOIN usuarios u ON p.usuario_id = u.id
      INNER JOIN recursos r ON p.recurso_id = r.id
      WHERE p.id = ?
    `;
    const params = [req.params.id];

    // Si es usuario estándar, solo ver sus préstamos. Admin y trabajadores ven todos
    if (req.user.rol !== 'administrador' && req.user.rol !== 'trabajador') {
      query += ' AND p.usuario_id = ?';
      params.push(req.user.id);
    }

    const [prestamos] = await pool.query(query, params);

    if (prestamos.length === 0) {
      return res.status(404).json({ message: 'Préstamo no encontrado' });
    }

    res.json(prestamos[0]);
  } catch (error) {
    console.error('Error al obtener préstamo:', error);
    res.status(500).json({ message: 'Error al obtener préstamo' });
  }
});

// Crear préstamo(s) - soporta uno o múltiples recursos
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { usuario_id, recurso_id, recursos_ids, fecha_prestamo, fecha_devolucion_prevista, observaciones } = req.body;

    // Determinar si es un solo recurso o múltiples
    let recursosIds = [];
    if (recursos_ids && Array.isArray(recursos_ids) && recursos_ids.length > 0) {
      recursosIds = recursos_ids;
    } else if (recurso_id) {
      recursosIds = [recurso_id];
    }

    if (!usuario_id || recursosIds.length === 0 || !fecha_prestamo || !fecha_devolucion_prevista) {
      return res.status(400).json({ 
        message: 'Usuario, al menos un recurso, fecha de préstamo y fecha de devolución son requeridos' 
      });
    }

    // Admin y trabajadores pueden crear préstamos para otros usuarios
    const finalUsuarioId = (req.user.rol === 'administrador' || req.user.rol === 'trabajador') 
      ? usuario_id 
      : req.user.id;

    // Obtener información del trabajador autenticado (quien hace el préstamo)
    const [trabajadorInfo] = await pool.query(
      'SELECT id, nombre_completo, email FROM usuarios WHERE id = ?',
      [req.user.id]
    );

    if (trabajadorInfo.length === 0) {
      return res.status(404).json({ message: 'Trabajador no encontrado' });
    }

    const trabajador = trabajadorInfo[0];

    // Verificar que el usuario existe
    const [usuarios] = await pool.query(
      'SELECT id FROM usuarios WHERE id = ?',
      [finalUsuarioId]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Validar formato de fechas
    if (!isValidDate(fecha_prestamo)) {
      return res.status(400).json({ message: 'Formato de fecha de préstamo inválido (debe ser YYYY-MM-DD)' });
    }

    if (!isValidDate(fecha_devolucion_prevista)) {
      return res.status(400).json({ message: 'Formato de fecha de devolución inválido (debe ser YYYY-MM-DD)' });
    }

    // Validar fechas
    const fechaPrestamo = new Date(fecha_prestamo);
    const fechaDevolucion = new Date(fecha_devolucion_prevista);

    if (fechaDevolucion <= fechaPrestamo) {
      return res.status(400).json({ 
        message: 'La fecha de devolución debe ser posterior a la fecha de préstamo' 
      });
    }

    // Verificar todos los recursos antes de crear préstamos
    const recursosNoDisponibles = [];
    const recursosConPrestamos = [];
    const recursosNoEncontrados = [];

    for (const recursoId of recursosIds) {
      const [recursos] = await pool.query(
        'SELECT * FROM recursos WHERE id = ?',
        [recursoId]
      );

      if (recursos.length === 0) {
        recursosNoEncontrados.push(recursoId);
        continue;
      }

      if (recursos[0].estado !== 'disponible') {
        recursosNoDisponibles.push({ id: recursoId, nombre: recursos[0].nombre, estado: recursos[0].estado });
        continue;
      }

      const [activeLoans] = await pool.query(
        'SELECT id FROM prestamos WHERE recurso_id = ? AND estado = "activo"',
        [recursoId]
      );

      if (activeLoans.length > 0) {
        recursosConPrestamos.push({ id: recursoId, nombre: recursos[0].nombre });
      }
    }

    // Si hay errores, retornarlos
    if (recursosNoEncontrados.length > 0 || recursosNoDisponibles.length > 0 || recursosConPrestamos.length > 0) {
      let mensaje = 'Error al crear préstamos:\n';
      if (recursosNoEncontrados.length > 0) {
        mensaje += `- Recursos no encontrados: ${recursosNoEncontrados.join(', ')}\n`;
      }
      if (recursosNoDisponibles.length > 0) {
        mensaje += `- Recursos no disponibles: ${recursosNoDisponibles.map(r => `${r.nombre} (${r.estado})`).join(', ')}\n`;
      }
      if (recursosConPrestamos.length > 0) {
        mensaje += `- Recursos con préstamos activos: ${recursosConPrestamos.map(r => r.nombre).join(', ')}\n`;
      }
      return res.status(400).json({ message: mensaje.trim() });
    }

    // Crear préstamos para cada recurso
    const prestamosCreados = [];
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      for (const recursoId of recursosIds) {
        // Crear préstamo
        const [result] = await connection.query(
          `INSERT INTO prestamos (usuario_id, recurso_id, trabajador_id, trabajador_nombre, trabajador_email, fecha_prestamo, fecha_devolucion_prevista, observaciones) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            finalUsuarioId, 
            recursoId, 
            trabajador.id,
            trabajador.nombre_completo,
            trabajador.email,
            fecha_prestamo, 
            fecha_devolucion_prevista, 
            observaciones || null
          ]
        );

        // Actualizar estado del recurso
        await connection.query(
          'UPDATE recursos SET estado = "prestado" WHERE id = ?',
          [recursoId]
        );

        // Obtener préstamo creado
        const [newLoan] = await connection.query(
          `SELECT 
            p.*,
            u.codigo as usuario_codigo,
            u.nombre_completo as usuario_nombre,
            u.email as usuario_email,
            r.codigo as recurso_codigo,
            r.nombre as recurso_nombre,
            p.trabajador_id,
            p.trabajador_nombre,
            p.trabajador_email
          FROM prestamos p
          INNER JOIN usuarios u ON p.usuario_id = u.id
          INNER JOIN recursos r ON p.recurso_id = r.id
          WHERE p.id = ?`,
          [result.insertId]
        );

        prestamosCreados.push(newLoan[0]);
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    res.status(201).json({
      message: recursosIds.length === 1 
        ? 'Préstamo creado exitosamente' 
        : `${recursosIds.length} préstamos creados exitosamente`,
      prestamos: prestamosCreados
    });
  } catch (error) {
    console.error('Error al crear préstamo:', error);
    res.status(500).json({ message: 'Error al crear préstamo' });
  }
});

// Registrar devolución
router.put('/:id/devolver', authenticateToken, async (req, res) => {
  try {
    const { fecha_devolucion_real, observaciones } = req.body;

    // Obtener préstamo
    const [prestamos] = await pool.query(
      'SELECT * FROM prestamos WHERE id = ?',
      [req.params.id]
    );

    if (prestamos.length === 0) {
      return res.status(404).json({ message: 'Préstamo no encontrado' });
    }

    const prestamo = prestamos[0];

    // Solo admin o el usuario dueño del préstamo puede devolver
    if (req.user.rol !== 'administrador' && prestamo.usuario_id !== req.user.id) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    if (prestamo.estado === 'devuelto') {
      return res.status(400).json({ message: 'El préstamo ya fue devuelto' });
    }

    const fechaDevolucion = fecha_devolucion_real || new Date().toISOString().split('T')[0];

    // Actualizar préstamo
    await pool.query(
      `UPDATE prestamos 
       SET estado = "devuelto", 
           fecha_devolucion_real = ?,
           observaciones = COALESCE(?, observaciones)
       WHERE id = ?`,
      [fechaDevolucion, observaciones || null, req.params.id]
    );

    // Actualizar estado del recurso
    await pool.query(
      'UPDATE recursos SET estado = "disponible" WHERE id = ?',
      [prestamo.recurso_id]
    );

    // Obtener préstamo actualizado
    const [updated] = await pool.query(
      `SELECT 
        p.*,
        u.codigo as usuario_codigo,
        u.nombre_completo as usuario_nombre,
        u.email as usuario_email,
        r.codigo as recurso_codigo,
        r.nombre as recurso_nombre,
        p.trabajador_id,
        p.trabajador_nombre,
        p.trabajador_email
      FROM prestamos p
      INNER JOIN usuarios u ON p.usuario_id = u.id
      INNER JOIN recursos r ON p.recurso_id = r.id
      WHERE p.id = ?`,
      [req.params.id]
    );

    res.json({
      message: 'Devolución registrada exitosamente',
      prestamo: updated[0]
    });
  } catch (error) {
    console.error('Error al registrar devolución:', error);
    res.status(500).json({ message: 'Error al registrar devolución' });
  }
});

// Actualizar préstamo (solo admin)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { fecha_prestamo, fecha_devolucion_prevista, observaciones } = req.body;

    const [prestamos] = await pool.query(
      'SELECT * FROM prestamos WHERE id = ?',
      [req.params.id]
    );

    if (prestamos.length === 0) {
      return res.status(404).json({ message: 'Préstamo no encontrado' });
    }

    const prestamo = prestamos[0];

    if (prestamo.estado === 'devuelto') {
      return res.status(400).json({ message: 'No se puede modificar un préstamo devuelto' });
    }

    await pool.query(
      `UPDATE prestamos 
       SET fecha_prestamo = COALESCE(?, fecha_prestamo),
           fecha_devolucion_prevista = COALESCE(?, fecha_devolucion_prevista),
           observaciones = COALESCE(?, observaciones)
       WHERE id = ?`,
      [fecha_prestamo || null, fecha_devolucion_prevista || null, observaciones || null, req.params.id]
    );

    const [updated] = await pool.query(
      `SELECT 
        p.*,
        u.codigo as usuario_codigo,
        u.nombre_completo as usuario_nombre,
        r.codigo as recurso_codigo,
        r.nombre as recurso_nombre
      FROM prestamos p
      INNER JOIN usuarios u ON p.usuario_id = u.id
      INNER JOIN recursos r ON p.recurso_id = r.id
      WHERE p.id = ?`,
      [req.params.id]
    );

    res.json({
      message: 'Préstamo actualizado exitosamente',
      prestamo: updated[0]
    });
  } catch (error) {
    console.error('Error al actualizar préstamo:', error);
    res.status(500).json({ message: 'Error al actualizar préstamo' });
  }
});

// Eliminar préstamo (solo admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [prestamos] = await pool.query(
      'SELECT * FROM prestamos WHERE id = ?',
      [req.params.id]
    );

    if (prestamos.length === 0) {
      return res.status(404).json({ message: 'Préstamo no encontrado' });
    }

    const prestamo = prestamos[0];

    // Si el préstamo está activo, cambiar el recurso a disponible
    if (prestamo.estado === 'activo') {
      await pool.query(
        'UPDATE recursos SET estado = "disponible" WHERE id = ?',
        [prestamo.recurso_id]
      );
    }

    await pool.query('DELETE FROM prestamos WHERE id = ?', [req.params.id]);

    res.json({ message: 'Préstamo eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar préstamo:', error);
    res.status(500).json({ message: 'Error al eliminar préstamo' });
  }
});

export default router;

