import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from '../config/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configurar multer para subir imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, join(__dirname, '../../uploads'));
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

// Obtener todos los recursos
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { estado, busqueda } = req.query;
    let query = 'SELECT * FROM recursos WHERE 1=1';
    const params = [];

    if (estado) {
      query += ' AND estado = ?';
      params.push(estado);
    }

    if (busqueda) {
      query += ' AND (nombre LIKE ? OR codigo LIKE ? OR descripcion LIKE ?)';
      const searchTerm = `%${busqueda}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY created_at DESC';

    const [recursos] = await pool.query(query, params);
    res.json(recursos);
  } catch (error) {
    console.error('Error al obtener recursos:', error);
    res.status(500).json({ message: 'Error al obtener recursos' });
  }
});

// Obtener un recurso por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [recursos] = await pool.query(
      'SELECT * FROM recursos WHERE id = ?',
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

// Crear recurso
router.post('/', authenticateToken, requireAdmin, upload.single('imagen'), async (req, res) => {
  try {
    const { codigo, nombre, descripcion, estado, ubicacion } = req.body;

    if (!codigo || !nombre) {
      return res.status(400).json({ message: 'Código y nombre son requeridos' });
    }

    // Verificar si el código ya existe
    const [existing] = await pool.query(
      'SELECT id FROM recursos WHERE codigo = ?',
      [codigo]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'El código del recurso ya existe' });
    }

    const imagen = req.file ? `/uploads/${req.file.filename}` : null;

    const [result] = await pool.query(
      `INSERT INTO recursos (codigo, nombre, descripcion, estado, ubicacion, imagen) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [codigo, nombre, descripcion || null, estado || 'disponible', ubicacion || null, imagen]
    );

    const [newResource] = await pool.query(
      'SELECT * FROM recursos WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Recurso creado exitosamente',
      recurso: newResource[0]
    });
  } catch (error) {
    console.error('Error al crear recurso:', error);
    res.status(500).json({ message: 'Error al crear recurso' });
  }
});

// Actualizar recurso
router.put('/:id', authenticateToken, requireAdmin, upload.single('imagen'), async (req, res) => {
  try {
    const { codigo, nombre, descripcion, estado, ubicacion } = req.body;

    // Verificar si el recurso existe
    const [existing] = await pool.query(
      'SELECT * FROM recursos WHERE id = ?',
      [req.params.id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: 'Recurso no encontrado' });
    }

    // Verificar si el código ya existe en otro recurso
    if (codigo && codigo !== existing[0].codigo) {
      const [codeExists] = await pool.query(
        'SELECT id FROM recursos WHERE codigo = ? AND id != ?',
        [codigo, req.params.id]
      );

      if (codeExists.length > 0) {
        return res.status(400).json({ message: 'El código ya está en uso' });
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
      `UPDATE recursos SET codigo = ?, nombre = ?, descripcion = ?, estado = ?, 
       ubicacion = ?, imagen = ? WHERE id = ?`,
      [
        codigo || existing[0].codigo,
        nombre || existing[0].nombre,
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

// Eliminar recurso
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
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

    const [result] = await pool.query(
      'DELETE FROM recursos WHERE id = ?',
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

export default router;

