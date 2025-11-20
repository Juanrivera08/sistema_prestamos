import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import QRCode from 'qrcode';
import pool from '../config/database.js';
import { authenticateToken, requireAdmin, requireAdminOrTrabajador } from '../middleware/auth.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Asegurar que la carpeta uploads existe
const uploadsDir = join(__dirname, '../../uploads');
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
  console.log('Carpeta uploads creada');
}

// Configurar multer para subir imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'recurso-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif)'));
    }
  }
});

// Middleware para manejar errores de multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'El archivo es demasiado grande (máximo 5MB)' });
    }
    return res.status(400).json({ message: `Error al subir archivo: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ message: err.message || 'Error al procesar archivo' });
  }
  next();
};

// Obtener todos los recursos
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { estado, busqueda, categoria, agrupado, incluir_eliminados } = req.query;
    
    // Si se solicita agrupado, devolver recursos agrupados por categoría
    if (agrupado === 'true') {
      let query = `
        SELECT 
          COALESCE(categoria, 'Sin categoría') as categoria,
          COUNT(*) as total,
          SUM(CASE WHEN estado = 'disponible' THEN 1 ELSE 0 END) as disponibles,
          SUM(CASE WHEN estado = 'prestado' THEN 1 ELSE 0 END) as prestados,
          SUM(CASE WHEN estado = 'mantenimiento' THEN 1 ELSE 0 END) as mantenimiento
        FROM recursos
        WHERE 1=1
      `;
      const params = [];

      // Agregar filtro de deleted_at solo si se solicita excluir eliminados
      // Usar una condición que funcione incluso si la columna no existe
      if (incluir_eliminados !== 'true') {
        query += ' AND deleted_at IS NULL';
      }

      if (estado) {
        query += ' AND estado = ?';
        params.push(estado);
      }

      if (busqueda) {
        query += ' AND (nombre LIKE ? OR codigo LIKE ? OR descripcion LIKE ? OR categoria LIKE ?)';
        const searchTerm = `%${busqueda}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      if (categoria) {
        query += ' AND categoria = ?';
        params.push(categoria);
      }

      query += ' GROUP BY categoria ORDER BY categoria';

      let grupos;
      try {
        [grupos] = await pool.query(query, params);
      } catch (error) {
        // Si falla porque la columna deleted_at no existe, intentar sin el filtro
        if (error.message && (error.message.includes('Unknown column') || error.message.includes('deleted_at'))) {
          console.log('Columna deleted_at no existe en consulta agrupada, usando consulta sin filtro');
          query = query.replace(' AND deleted_at IS NULL', '');
          [grupos] = await pool.query(query, params);
        } else {
          throw error;
        }
      }
      
      // Obtener los recursos individuales agrupados por categoría
      const recursosAgrupados = await Promise.all(
        grupos.map(async (grupo) => {
          let recursosQuery;
          const recursosParams = [];

          // Manejar categorías NULL correctamente
          if (grupo.categoria === 'Sin categoría') {
            recursosQuery = 'SELECT * FROM recursos WHERE categoria IS NULL';
          } else {
            recursosQuery = 'SELECT * FROM recursos WHERE categoria = ?';
            recursosParams.push(grupo.categoria);
          }
          
          // Agregar filtro deleted_at si se solicita excluir eliminados
          if (incluir_eliminados !== 'true') {
            recursosQuery += ' AND deleted_at IS NULL';
          }

          if (estado) {
            recursosQuery += ' AND estado = ?';
            recursosParams.push(estado);
          }

          if (busqueda) {
            recursosQuery += ' AND (nombre LIKE ? OR codigo LIKE ? OR descripcion LIKE ?)';
            const searchTerm = `%${busqueda}%`;
            recursosParams.push(searchTerm, searchTerm, searchTerm);
          }

          recursosQuery += ' ORDER BY nombre';

          let recursos;
          try {
            [recursos] = await pool.query(recursosQuery, recursosParams);
          } catch (error) {
            // Si falla porque la columna deleted_at no existe, intentar sin el filtro
            if (error.message && (error.message.includes('Unknown column') || error.message.includes('deleted_at'))) {
              recursosQuery = recursosQuery.replace(' AND deleted_at IS NULL', '');
              [recursos] = await pool.query(recursosQuery, recursosParams);
            } else {
              throw error;
            }
          }
          
          return {
            ...grupo,
            recursos: recursos
          };
        })
      );

      return res.json(recursosAgrupados);
    }

    // Consulta normal (sin agrupar)
    let query = 'SELECT * FROM recursos WHERE 1=1';
    const params = [];

    if (incluir_eliminados !== 'true') {
      query += ' AND deleted_at IS NULL';
    }

    if (estado) {
      query += ' AND estado = ?';
      params.push(estado);
    }

    if (categoria) {
      query += ' AND categoria = ?';
      params.push(categoria);
    }

    if (busqueda) {
      query += ' AND (nombre LIKE ? OR codigo LIKE ? OR descripcion LIKE ? OR categoria LIKE ?)';
      const searchTerm = `%${busqueda}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY categoria, nombre';

    const [recursos] = await pool.query(query, params);
    res.json(recursos);
  } catch (error) {
    console.error('Error al obtener recursos:', error);
    res.status(500).json({ message: 'Error al obtener recursos' });
  }
});

// Obtener todas las categorías únicas
router.get('/categorias', authenticateToken, async (req, res) => {
  try {
    const [categorias] = await pool.query(
      `SELECT DISTINCT categoria 
       FROM recursos 
       WHERE categoria IS NOT NULL AND categoria != ''
       ORDER BY categoria`
    );
    
    const categoriasList = categorias.map(cat => cat.categoria);
    res.json(categoriasList);
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({ message: 'Error al obtener categorías' });
  }
});

// Obtener un recurso por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [recursos] = await pool.query(
      'SELECT * FROM recursos WHERE id = ? AND deleted_at IS NULL',
      [req.params.id]
    );

    if (recursos.length === 0) {
      return res.status(404).json({ message: 'Recurso no encontrado' });
    }

    res.json(recursos[0]);
  } catch (error) {
    console.error('Error al obtener recurso:', error);
    res.status(500).json({ message: 'Error al obtener recurso' });
  }
});

// Crear recurso (admin y trabajadores)
router.post('/', authenticateToken, requireAdminOrTrabajador, (req, res, next) => {
  upload.single('imagen')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'El archivo es demasiado grande (máximo 5MB)' });
        }
        return res.status(400).json({ message: `Error al subir archivo: ${err.message}` });
      }
      return res.status(400).json({ message: err.message || 'Error al procesar archivo' });
    }
    next();
  });
}, async (req, res) => {
  try {
    console.log('=== INICIO CREAR RECURSO ===');
    console.log('Body recibido:', req.body);
    console.log('File recibido:', req.file ? req.file.filename : 'ninguno');

    // Validar que req.body existe
    if (!req.body) {
      return res.status(400).json({ message: 'No se recibieron datos' });
    }

    const { codigo, nombre, categoria, descripcion, estado, ubicacion } = req.body;

    // Validar campos requeridos
    if (!codigo || codigo.trim() === '') {
      return res.status(400).json({ message: 'El código es requerido' });
    }
    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({ message: 'El nombre es requerido' });
    }

    // Verificar si el código ya existe (solo en recursos NO eliminados)
    // Si un recurso fue eliminado (soft delete), se puede reutilizar su código
    try {
      // Consulta que busca solo recursos activos (deleted_at IS NULL)
      const [existing] = await pool.query(
        'SELECT id, codigo FROM recursos WHERE codigo = ? AND deleted_at IS NULL',
        [codigo]
      );
      
      if (existing && existing.length > 0) {
        return res.status(400).json({ 
          message: 'El código del recurso ya existe'
        });
      }
    } catch (error) {
      // Si falla porque la columna deleted_at no existe, usar consulta sin ella
      const errorMessage = error.message || '';
      if (errorMessage.includes('Unknown column') || errorMessage.includes('deleted_at')) {
        try {
          const [existing] = await pool.query(
            'SELECT id FROM recursos WHERE codigo = ?',
            [codigo]
          );
          
          if (existing && existing.length > 0) {
            return res.status(400).json({ 
              message: 'El código del recurso ya existe'
            });
          }
        } catch (queryError) {
          console.error('Error al verificar código existente (sin deleted_at):', queryError);
          throw queryError;
        }
      } else {
        console.error('Error al verificar código existente:', error);
        throw error;
      }
    }

    const imagen = req.file ? `/uploads/${req.file.filename}` : null;

    // Limpiar valores vacíos y convertirlos a null
    const categoriaValue = (categoria && typeof categoria === 'string' && categoria.trim() !== '') ? categoria.trim() : null;
    const descripcionValue = (descripcion && typeof descripcion === 'string' && descripcion.trim() !== '') ? descripcion.trim() : null;
    const ubicacionValue = (ubicacion && typeof ubicacion === 'string' && ubicacion.trim() !== '') ? ubicacion.trim() : null;
    const estadoValue = (estado && typeof estado === 'string' && estado.trim() !== '') ? estado.trim() : 'disponible';

    console.log('Intentando insertar recurso con valores:', {
      codigo,
      nombre,
      categoria: categoriaValue,
      descripcion: descripcionValue,
      estado: estadoValue,
      ubicacion: ubicacionValue,
      imagen
    });

    let result;
    try {
      [result] = await pool.query(
        `INSERT INTO recursos (codigo, nombre, categoria, descripcion, estado, ubicacion, imagen) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [codigo, nombre, categoriaValue, descripcionValue, estadoValue, ubicacionValue, imagen]
      );
      console.log('Recurso insertado con ID:', result.insertId);
    } catch (dbError) {
      console.error('Error en consulta INSERT:', dbError);
      console.error('Código SQL:', dbError.code);
      console.error('Mensaje SQL:', dbError.sqlMessage);
      throw dbError; // Re-lanzar para que sea capturado por el catch principal
    }

    const [newResource] = await pool.query(
      'SELECT * FROM recursos WHERE id = ?',
      [result.insertId]
    );

    if (!newResource || newResource.length === 0) {
      throw new Error('No se pudo recuperar el recurso creado');
    }

    res.status(201).json({
      message: 'Recurso creado exitosamente',
      recurso: newResource[0]
    });
  } catch (error) {
    console.error('========== ERROR AL CREAR RECURSO ==========');
    console.error('Mensaje:', error.message);
    console.error('Código:', error.code);
    console.error('SQL State:', error.sqlState);
    console.error('SQL Message:', error.sqlMessage);
    console.error('Stack:', error.stack);
    console.error('==============================================');
    
    // Determinar el mensaje de error y código de estado apropiado
    let errorMessage = 'Error al crear recurso';
    let statusCode = 500;
    
    if (error.code === 'ER_DUP_ENTRY') {
      // Error de entrada duplicada (código único violado)
      errorMessage = 'El código del recurso ya existe';
      statusCode = 400;
    } else if (error.code === 'ER_NO_SUCH_TABLE') {
      errorMessage = 'Error de base de datos: tabla no encontrada';
      statusCode = 500;
    } else if (error.code === 'ER_BAD_FIELD_ERROR') {
      errorMessage = 'Error de base de datos: columna no encontrada';
      statusCode = 500;
    } else if (error.message) {
      errorMessage = error.message;
      // Si el mensaje indica que el código ya existe, usar 400
      if (error.message.includes('código') && (error.message.includes('ya existe') || error.message.includes('already exists'))) {
        statusCode = 400;
      }
      // También verificar si el mensaje SQL menciona duplicado
      if (error.sqlMessage && (error.sqlMessage.includes('Duplicate entry') || error.sqlMessage.includes('duplicate'))) {
        errorMessage = 'El código del recurso ya existe';
        statusCode = 400;
      }
    }
    
    res.status(statusCode).json({ 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        code: error.code,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      } : undefined
    });
  }
});

// Actualizar recurso (admin y trabajadores)
router.put('/:id', authenticateToken, requireAdminOrTrabajador, upload.single('imagen'), async (req, res) => {
  try {
    const { codigo, nombre, categoria, descripcion, estado, ubicacion } = req.body;

    // Verificar si el recurso existe
    const [existing] = await pool.query(
      'SELECT * FROM recursos WHERE id = ?',
      [req.params.id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: 'Recurso no encontrado' });
    }

    // Verificar si el código ya existe en otro recurso (solo en recursos no eliminados)
    if (codigo && codigo !== existing[0].codigo) {
      try {
        // Buscar solo recursos activos (deleted_at IS NULL)
        const [codeExists] = await pool.query(
          'SELECT id FROM recursos WHERE codigo = ? AND id != ? AND deleted_at IS NULL',
          [codigo, req.params.id]
        );

        if (codeExists.length > 0) {
          return res.status(400).json({ message: 'El código ya está en uso' });
        }
      } catch (error) {
        // Si falla porque la columna no existe, usar consulta sin deleted_at
        if (error.message.includes('Unknown column') || error.message.includes('deleted_at')) {
          const [codeExists] = await pool.query(
            'SELECT id FROM recursos WHERE codigo = ? AND id != ?',
            [codigo, req.params.id]
          );
          
          if (codeExists.length > 0) {
            return res.status(400).json({ message: 'El código ya está en uso' });
          }
        } else {
          throw error; // Re-lanzar si es otro tipo de error
        }
      }
    }

    // Verificar si el recurso está prestado antes de cambiar estado
    if (estado && estado !== 'prestado' && existing[0].estado === 'prestado') {
      const [activeLoan] = await pool.query(
        'SELECT id FROM prestamos WHERE recurso_id = ? AND estado = "activo"',
        [req.params.id]
      );

      if (activeLoan.length > 0) {
        return res.status(400).json({ 
          message: 'No se puede cambiar el estado. El recurso tiene un préstamo activo' 
        });
      }
    }

    const imagen = req.file ? `/uploads/${req.file.filename}` : existing[0].imagen;

    await pool.query(
      `UPDATE recursos SET codigo = ?, nombre = ?, categoria = ?, descripcion = ?, estado = ?, 
       ubicacion = ?, imagen = ? WHERE id = ?`,
      [
        codigo || existing[0].codigo,
        nombre || existing[0].nombre,
        categoria !== undefined ? categoria : existing[0].categoria,
        descripcion !== undefined ? descripcion : existing[0].descripcion,
        estado || existing[0].estado,
        ubicacion !== undefined ? ubicacion : existing[0].ubicacion,
        imagen,
        req.params.id
      ]
    );

    const [updated] = await pool.query(
      'SELECT * FROM recursos WHERE id = ?',
      [req.params.id]
    );

    res.json({
      message: 'Recurso actualizado exitosamente',
      recurso: updated[0]
    });
  } catch (error) {
    console.error('Error al actualizar recurso:', error);
    res.status(500).json({ message: 'Error al actualizar recurso' });
  }
});

// Eliminar recurso (admin y trabajadores)
// Soft delete - Eliminar recurso (marcar como eliminado)
router.delete('/:id', authenticateToken, requireAdminOrTrabajador, async (req, res) => {
  try {
    // Verificar si tiene préstamos activos
    const [activeLoans] = await pool.query(
      'SELECT id FROM prestamos WHERE recurso_id = ? AND estado = "activo"',
      [req.params.id]
    );

    if (activeLoans.length > 0) {
      return res.status(400).json({ 
        message: 'No se puede eliminar un recurso con préstamos activos' 
      });
    }

    // Soft delete - marcar como eliminado
    const [result] = await pool.query(
      'UPDATE recursos SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Recurso no encontrado' });
    }

    res.json({ message: 'Recurso eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar recurso:', error);
    res.status(500).json({ message: 'Error al eliminar recurso' });
  }
});

// Restaurar recurso eliminado (soft delete)
router.put('/:id/restaurar', authenticateToken, requireAdminOrTrabajador, async (req, res) => {
  try {
    const [result] = await pool.query(
      'UPDATE recursos SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Recurso no encontrado o no está eliminado' });
    }

    res.json({ message: 'Recurso restaurado exitosamente' });
  } catch (error) {
    console.error('Error al restaurar recurso:', error);
    res.status(500).json({ message: 'Error al restaurar recurso' });
  }
});

// Eliminar recurso permanentemente (hard delete) - Solo administradores
router.delete('/:id/permanente', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Verificar si tiene préstamos activos
    const [activeLoans] = await pool.query(
      'SELECT id FROM prestamos WHERE recurso_id = ? AND estado = "activo"',
      [req.params.id]
    );

    if (activeLoans.length > 0) {
      return res.status(400).json({ 
        message: 'No se puede eliminar permanentemente un recurso con préstamos activos' 
      });
    }

    // Verificar si el recurso existe
    const [existing] = await pool.query(
      'SELECT id, codigo, nombre FROM recursos WHERE id = ?',
      [req.params.id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: 'Recurso no encontrado' });
    }

    // Eliminar permanentemente
    const [result] = await pool.query(
      'DELETE FROM recursos WHERE id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'No se pudo eliminar el recurso' });
    }

    res.json({ 
      message: 'Recurso eliminado permanentemente de la base de datos',
      recurso: existing[0]
    });
  } catch (error) {
    console.error('Error al eliminar recurso permanentemente:', error);
    res.status(500).json({ message: 'Error al eliminar recurso permanentemente' });
  }
});

// Generar código QR para un recurso
router.get('/:id/qr', authenticateToken, async (req, res) => {
  try {
    const [recursos] = await pool.query(
      'SELECT * FROM recursos WHERE id = ? AND deleted_at IS NULL',
      [req.params.id]
    );

    if (recursos.length === 0) {
      return res.status(404).json({ message: 'Recurso no encontrado' });
    }

    const recurso = recursos[0];
    
    // Crear objeto con información del recurso para el QR
    const qrData = JSON.stringify({
      tipo: 'recurso',
      id: recurso.id,
      codigo: recurso.codigo,
      nombre: recurso.nombre,
      estado: recurso.estado,
      url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/recursos?codigo=${recurso.codigo}`
    });

    // Generar QR como imagen PNG
    const qrImage = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 1
    });

    res.json({ 
      qrImage,
      qrData: JSON.parse(qrData)
    });
  } catch (error) {
    console.error('Error al generar QR:', error);
    res.status(500).json({ message: 'Error al generar código QR' });
  }
});

export default router;


