import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireAdmin, requireAdminOrTrabajador } from '../middleware/auth.js';
import { isValidDate, isValidDateTime } from '../utils/validators.js';

const router = express.Router();

// Obtener todos los préstamos
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Actualizar préstamos vencidos automáticamente
    await pool.query(
      `UPDATE prestamos 
       SET estado = 'vencido' 
       WHERE estado = 'activo' 
       AND fecha_devolucion_prevista < NOW()`
    );

    const { 
      estado, 
      usuario_id, 
      recurso_id, 
      fecha_inicio, 
      fecha_fin,
      search,
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    
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
    const countParams = [];

    // Si es usuario estándar, solo ver sus préstamos. Admin y trabajadores ven todos
    if (req.user.rol !== 'administrador' && req.user.rol !== 'trabajador') {
      query += ' AND p.usuario_id = ?';
      params.push(req.user.id);
      countParams.push(req.user.id);
    } else if (usuario_id) {
      query += ' AND p.usuario_id = ?';
      params.push(usuario_id);
      countParams.push(usuario_id);
    }

    if (estado) {
      query += ' AND p.estado = ?';
      params.push(estado);
      countParams.push(estado);
    }

    if (recurso_id) {
      query += ' AND p.recurso_id = ?';
      params.push(recurso_id);
      countParams.push(recurso_id);
    }

    if (fecha_inicio) {
      query += ' AND p.fecha_prestamo >= ?';
      params.push(fecha_inicio);
      countParams.push(fecha_inicio);
    }

    if (fecha_fin) {
      query += ' AND p.fecha_prestamo <= ?';
      params.push(fecha_fin);
      countParams.push(fecha_fin);
    }

    // Búsqueda avanzada
    if (search) {
      query += ` AND (
        u.nombre_completo LIKE ? OR 
        u.email LIKE ? OR 
        u.codigo LIKE ? OR
        r.nombre LIKE ? OR 
        r.codigo LIKE ? OR
        p.observaciones LIKE ?
      )`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Contar total de registros
    let countQuery = `SELECT COUNT(*) as total FROM prestamos p 
      INNER JOIN usuarios u ON p.usuario_id = u.id 
      INNER JOIN recursos r ON p.recurso_id = r.id 
      WHERE 1=1`;
    
    // Aplicar mismos filtros al count
    if (req.user.rol !== 'administrador' && req.user.rol !== 'trabajador') {
      countQuery += ' AND p.usuario_id = ?';
    } else if (usuario_id) {
      countQuery += ' AND p.usuario_id = ?';
    }
    if (estado) countQuery += ' AND p.estado = ?';
    if (recurso_id) countQuery += ' AND p.recurso_id = ?';
    if (fecha_inicio) countQuery += ' AND p.fecha_prestamo >= ?';
    if (fecha_fin) countQuery += ' AND p.fecha_prestamo <= ?';
    if (search) {
      countQuery += ` AND (
        u.nombre_completo LIKE ? OR 
        u.email LIKE ? OR 
        u.codigo LIKE ? OR
        r.nombre LIKE ? OR 
        r.codigo LIKE ? OR
        p.observaciones LIKE ?
      )`;
    }

    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limitNum);

    // Ordenamiento
    const validSortFields = ['created_at', 'fecha_prestamo', 'fecha_devolucion_prevista', 'estado'];
    const validSortOrder = ['ASC', 'DESC'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const order = validSortOrder.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
    
    query += ` ORDER BY p.${sortField} ${order} LIMIT ? OFFSET ?`;
    params.push(limitNum, offset);

    const [prestamos] = await pool.query(query, params);
    
    res.json({
      prestamos,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Error al obtener préstamos:', error);
    res.status(500).json({ message: 'Error al obtener préstamos' });
  }
});

// Crear un nuevo préstamo (solo trabajadores y admin)
router.post('/', authenticateToken, requireAdminOrTrabajador, async (req, res) => {
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
// Crear un nuevo préstamo (solo trabajadores y admin)
router.post('/', authenticateToken, requireAdminOrTrabajador, async (req, res) => {
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

    // Solo admin y trabajadores pueden crear préstamos
    const finalUsuarioId = usuario_id;

    // Verificar límite de préstamos simultáneos
    const [configLimite] = await pool.query(
      "SELECT valor FROM configuraciones WHERE clave = 'max_prestamos_simultaneos'"
    );
    const limiteGlobal = configLimite.length > 0 ? parseInt(configLimite[0].valor) : 3;
    
    const [usuarioInfo] = await pool.query(
      'SELECT limite_prestamos_simultaneos FROM usuarios WHERE id = ?',
      [finalUsuarioId]
    );
    const limiteUsuario = usuarioInfo.length > 0 && usuarioInfo[0].limite_prestamos_simultaneos 
      ? usuarioInfo[0].limite_prestamos_simultaneos 
      : limiteGlobal;

    // Contar préstamos activos del usuario
    const [prestamosActivos] = await pool.query(
      'SELECT COUNT(*) as total FROM prestamos WHERE usuario_id = ? AND estado = "activo"',
      [finalUsuarioId]
    );

    if (prestamosActivos[0].total + recursosIds.length > limiteUsuario) {
      return res.status(400).json({ 
        message: `El usuario ha alcanzado el límite de ${limiteUsuario} préstamos simultáneos. Actualmente tiene ${prestamosActivos[0].total} préstamo(s) activo(s).` 
      });
    }

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

    // Validar formato de fechas/datetime
    if (!isValidDateTime(fecha_prestamo)) {
      return res.status(400).json({ message: 'Formato de fecha y hora de préstamo inválido (debe ser YYYY-MM-DD HH:MM)' });
    }

    if (!isValidDateTime(fecha_devolucion_prevista)) {
      return res.status(400).json({ message: 'Formato de fecha y hora de devolución inválido (debe ser YYYY-MM-DD HH:MM)' });
    }

    // Validar fechas/datetime
    const fechaPrestamo = new Date(fecha_prestamo.replace(' ', 'T'));
    const fechaDevolucion = new Date(fecha_devolucion_prevista.replace(' ', 'T'));

    if (fechaDevolucion <= fechaPrestamo) {
      return res.status(400).json({ 
        message: 'La fecha y hora de devolución debe ser posterior a la fecha y hora de préstamo' 
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

    // Solo admin y trabajadores pueden devolver préstamos
    if (req.user.rol !== 'administrador' && req.user.rol !== 'trabajador') {
      return res.status(403).json({ 
        message: 'Acceso denegado. Solo administradores y trabajadores pueden devolver préstamos' 
      });
    }

    if (prestamo.estado === 'devuelto') {
      return res.status(400).json({ message: 'El préstamo ya fue devuelto' });
    }

    // Si no se proporciona fecha_devolucion_real, usar la fecha y hora actual
    let fechaDevolucion = fecha_devolucion_real;
    if (!fechaDevolucion) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      fechaDevolucion = `${year}-${month}-${day} ${hours}:${minutes}`;
    } else if (!fechaDevolucion.includes(' ')) {
      // Si viene solo la fecha, agregar la hora actual
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      fechaDevolucion = `${fechaDevolucion} ${hours}:${minutes}`;
    }

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

// Renovar préstamo (extender fecha de devolución)
router.put('/:id/renovar', authenticateToken, async (req, res) => {
  try {
    const { fecha_devolucion_prevista_nueva, observaciones } = req.body;

    if (!fecha_devolucion_prevista_nueva) {
      return res.status(400).json({ message: 'Nueva fecha de devolución es requerida' });
    }

    if (!isValidDateTime(fecha_devolucion_prevista_nueva)) {
      return res.status(400).json({ message: 'Formato de fecha inválido' });
    }

    const [prestamos] = await pool.query('SELECT * FROM prestamos WHERE id = ?', [req.params.id]);
    if (prestamos.length === 0) {
      return res.status(404).json({ message: 'Préstamo no encontrado' });
    }

    const prestamo = prestamos[0];

    // Solo admin y trabajadores pueden renovar préstamos
    if (req.user.rol !== 'administrador' && req.user.rol !== 'trabajador') {
      return res.status(403).json({ message: 'Acceso denegado. Solo administradores y trabajadores pueden renovar préstamos' });
    }

    if (prestamo.estado !== 'activo') {
      return res.status(400).json({ message: 'Solo se pueden renovar préstamos activos' });
    }

    const nuevaFecha = new Date(fecha_devolucion_prevista_nueva.replace(' ', 'T'));
    const fechaActual = new Date(prestamo.fecha_devolucion_prevista.replace(' ', 'T'));

    if (nuevaFecha <= fechaActual) {
      return res.status(400).json({ message: 'La nueva fecha debe ser posterior a la fecha actual de devolución' });
    }

    // Verificar límite máximo de días
    const [configMaxDias] = await pool.query(
      "SELECT valor FROM configuraciones WHERE clave = 'dias_maximo_prestamo'"
    );
    const maxDias = configMaxDias.length > 0 ? parseInt(configMaxDias[0].valor) : 7;
    const fechaPrestamo = new Date(prestamo.fecha_prestamo.replace(' ', 'T'));
    const diasTotales = Math.floor((nuevaFecha - fechaPrestamo) / (1000 * 60 * 60 * 24));

    if (diasTotales > maxDias) {
      return res.status(400).json({ 
        message: `El préstamo no puede exceder ${maxDias} días. La nueva fecha resultaría en ${diasTotales} días.` 
      });
    }

    await pool.query(
      `UPDATE prestamos 
       SET fecha_devolucion_prevista = ?, 
           observaciones = CONCAT(COALESCE(observaciones, ''), '\nRenovado el ', NOW(), ': ', COALESCE(?, ''))
       WHERE id = ?`,
      [fecha_devolucion_prevista_nueva, observaciones || 'Sin observaciones', req.params.id]
    );

    res.json({ message: 'Préstamo renovado exitosamente' });
  } catch (error) {
    console.error('Error al renovar préstamo:', error);
    res.status(500).json({ message: 'Error al renovar préstamo' });
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

    // Validar formato de datetime si se proporcionan
    if (fecha_prestamo && !isValidDateTime(fecha_prestamo)) {
      return res.status(400).json({ message: 'Formato de fecha y hora de préstamo inválido (debe ser YYYY-MM-DD HH:MM)' });
    }

    if (fecha_devolucion_prevista && !isValidDateTime(fecha_devolucion_prevista)) {
      return res.status(400).json({ message: 'Formato de fecha y hora de devolución inválido (debe ser YYYY-MM-DD HH:MM)' });
    }

    // Validar que la fecha de devolución sea posterior a la de préstamo
    if (fecha_prestamo && fecha_devolucion_prevista) {
      const fechaPrestamo = new Date(fecha_prestamo.replace(' ', 'T'));
      const fechaDevolucion = new Date(fecha_devolucion_prevista.replace(' ', 'T'));
      if (fechaDevolucion <= fechaPrestamo) {
        return res.status(400).json({ 
          message: 'La fecha y hora de devolución debe ser posterior a la fecha y hora de préstamo' 
        });
      }
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

