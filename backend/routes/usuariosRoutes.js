import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { isValidEmail, isValidPassword } from '../utils/validators.js';

const router = express.Router();

// Obtener todos los usuarios (admin y trabajadores)
router.get('/', authenticateToken, async (req, res) => {
  // Solo admin y trabajadores pueden ver la lista de usuarios
  if (req.user.rol !== 'administrador' && req.user.rol !== 'trabajador') {
    return res.status(403).json({ message: 'Acceso denegado' });
  }
  try {
    const { rol, busqueda } = req.query;
    let query = 'SELECT id, codigo, nombre_completo, email, rol, created_at FROM usuarios WHERE 1=1';
    const params = [];

    if (rol) {
      query += ' AND rol = ?';
      params.push(rol);
    }

    if (busqueda) {
      query += ' AND (nombre_completo LIKE ? OR email LIKE ? OR codigo LIKE ?)';
      const searchTerm = `%${busqueda}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY created_at DESC';

    const [usuarios] = await pool.query(query, params);
    res.json(usuarios);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
});

// Obtener un usuario por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    // Solo admin puede ver otros usuarios, o el mismo usuario puede verse
    if (req.user.rol !== 'administrador' && req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const [usuarios] = await pool.query(
      'SELECT id, codigo, nombre_completo, email, rol, created_at FROM usuarios WHERE id = ?',
      [req.params.id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json(usuarios[0]);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ message: 'Error al obtener usuario' });
  }
});

// Crear usuario (admin y trabajadores)
router.post('/', authenticateToken, async (req, res) => {
  try {
    // Solo admin y trabajadores pueden crear usuarios
    if (req.user.rol !== 'administrador' && req.user.rol !== 'trabajador') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { codigo, nombre_completo, email, password, rol } = req.body;

    if (!codigo || !nombre_completo || !email || !password) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    // Validar formato de email
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'El formato del email no es válido' });
    }

    // Validar contraseña
    if (!isValidPassword(password)) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Los trabajadores solo pueden crear usuarios con rol "usuario" (estudiantes)
    // Los administradores pueden crear cualquier rol
    let finalRol = rol || 'usuario';
    if (req.user.rol === 'trabajador' && finalRol !== 'usuario') {
      return res.status(403).json({ 
        message: 'Los trabajadores solo pueden crear usuarios con rol "usuario" (estudiantes)' 
      });
    }

    // Verificar si el email o código ya existe
    const [existing] = await pool.query(
      'SELECT id FROM usuarios WHERE email = ? OR codigo = ?',
      [email, codigo]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'El email o código ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO usuarios (codigo, nombre_completo, email, password, rol) 
       VALUES (?, ?, ?, ?, ?)`,
      [codigo, nombre_completo, email, hashedPassword, finalRol]
    );

    const [newUser] = await pool.query(
      'SELECT id, codigo, nombre_completo, email, rol FROM usuarios WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      usuario: newUser[0]
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ message: 'Error al crear usuario' });
  }
});

// Actualizar usuario
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { codigo, nombre_completo, email, password, rol } = req.body;

    // Solo admin puede modificar otros usuarios o cambiar roles
    const canModify = req.user.rol === 'administrador' || req.user.id === parseInt(req.params.id);
    if (!canModify) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    // Solo admin puede cambiar roles
    if (rol && req.user.rol !== 'administrador') {
      return res.status(403).json({ message: 'Solo administradores pueden cambiar roles' });
    }

    const [existing] = await pool.query(
      'SELECT * FROM usuarios WHERE id = ?',
      [req.params.id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Validar formato de email si se proporciona
    if (email && !isValidEmail(email)) {
      return res.status(400).json({ message: 'El formato del email no es válido' });
    }

    // Validar contraseña si se proporciona
    if (password && !isValidPassword(password)) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Verificar si el email o código ya existe en otro usuario
    if (email || codigo) {
      const [duplicate] = await pool.query(
        'SELECT id FROM usuarios WHERE (email = ? OR codigo = ?) AND id != ?',
        [email || existing[0].email, codigo || existing[0].codigo, req.params.id]
      );

      if (duplicate.length > 0) {
        return res.status(400).json({ message: 'El email o código ya está en uso' });
      }
    }

    let updateQuery = 'UPDATE usuarios SET codigo = ?, nombre_completo = ?, email = ?';
    const params = [
      codigo || existing[0].codigo,
      nombre_completo || existing[0].nombre_completo,
      email || existing[0].email
    ];

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery += ', password = ?';
      params.push(hashedPassword);
    }

    if (rol && req.user.rol === 'administrador') {
      updateQuery += ', rol = ?';
      params.push(rol);
    }

    updateQuery += ' WHERE id = ?';
    params.push(req.params.id);

    await pool.query(updateQuery, params);

    const [updated] = await pool.query(
      'SELECT id, codigo, nombre_completo, email, rol FROM usuarios WHERE id = ?',
      [req.params.id]
    );

    res.json({
      message: 'Usuario actualizado exitosamente',
      usuario: updated[0]
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ message: 'Error al actualizar usuario' });
  }
});

// Eliminar usuario
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // No permitir eliminar el propio usuario
    if (req.user.id === parseInt(req.params.id)) {
      return res.status(400).json({ message: 'No puedes eliminar tu propio usuario' });
    }

    // Verificar si tiene préstamos activos
    const [activeLoans] = await pool.query(
      'SELECT id FROM prestamos WHERE usuario_id = ? AND estado = "activo"',
      [req.params.id]
    );

    if (activeLoans.length > 0) {
      return res.status(400).json({ 
        message: 'No se puede eliminar un usuario con préstamos activos' 
      });
    }

    const [result] = await pool.query(
      'DELETE FROM usuarios WHERE id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ message: 'Error al eliminar usuario' });
  }
});

// Buscar o crear usuario por código de carnet (para trabajadores)
router.post('/buscar-por-codigo', authenticateToken, async (req, res) => {
  try {
    // Solo admin y trabajadores pueden usar esta funcionalidad
    if (req.user.rol !== 'administrador' && req.user.rol !== 'trabajador') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { codigo } = req.body;

    if (!codigo) {
      return res.status(400).json({ message: 'El código es requerido' });
    }

    // Buscar usuario por código
    const [usuarios] = await pool.query(
      'SELECT id, codigo, nombre_completo, email, rol FROM usuarios WHERE codigo = ?',
      [codigo]
    );

    if (usuarios.length > 0) {
      // Usuario encontrado
      return res.json({
        encontrado: true,
        usuario: usuarios[0]
      });
    }

    // Usuario no encontrado - crear uno nuevo automáticamente
    // Generar email y nombre basado en el código
    const email = `${codigo}@estudiante.local`;
    const nombreCompleto = `Estudiante ${codigo}`;
    const password = codigo; // Contraseña temporal igual al código
    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO usuarios (codigo, nombre_completo, email, password, rol) 
       VALUES (?, ?, ?, ?, ?)`,
      [codigo, nombreCompleto, email, hashedPassword, 'usuario']
    );

    const [newUser] = await pool.query(
      'SELECT id, codigo, nombre_completo, email, rol FROM usuarios WHERE id = ?',
      [result.insertId]
    );

    return res.json({
      encontrado: false,
      creado: true,
      usuario: newUser[0],
      message: 'Usuario creado automáticamente. Por favor, actualiza el nombre y email si es necesario.'
    });
  } catch (error) {
    console.error('Error al buscar/crear usuario por código:', error);
    res.status(500).json({ message: 'Error al buscar/crear usuario' });
  }
});

export default router;

